import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { scheduleAscetSearchIndexBackgroundRefresh } from "../search-index.ts";
import type { AscetP0IndexArea } from "../search-index-sqlite/schema.ts";
import { markAscetSqliteIndexAreasStale } from "../search-index-sqlite/status.ts";
import { type AscetSearchIndexPartition, invalidateAscetSearchIndexPartitions } from "../search-index-store.ts";
import { createAscetStatusReport } from "../status.ts";
import {
	type AscetEditApprovalContext,
	type AscetEditApprovalFailure,
	type AscetEditErrorPrefix,
	createAscetEditApprovalResultData,
	requestAscetEditApproval,
} from "./approval.ts";

export interface RunAscetEditOperationOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export interface AscetEditControlParams {
	verifyReadback?: boolean;
	executeWrite?: boolean;
}

export interface AscetEditImpact {
	action: string;
	affectedComponents: string[];
	affectedMethods: Array<{ component: string; method: string }>;
	affectedElements: Array<{ component: string; name: string }>;
	stale: AscetSearchIndexPartition[];
}

export type AscetEditImpactParams = {
	action: string;
	componentPath?: string;
	modulePath?: string;
	stateMachinePath?: string;
	folderPath?: string;
	projectPath?: string;
	targetPath?: string;
	methodName?: string;
	elementName?: string;
};

export const ifMissingSchema = Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")]));

export function appendVerifyAndJson(args: string[], verifyReadback?: boolean): string[] {
	if (verifyReadback) {
		args.push("--verify-readback");
	}
	args.push("--json");
	return args;
}

export function createAscetEditSummary(operation: string, fields: Record<string, unknown>): string {
	return [
		"ASCET edit request:",
		`operation: ${operation}`,
		...Object.entries(fields).map(([key, value]) => `${key}: ${String(value)}`),
	].join("\n");
}

function createBlockedEditResult<TParams>(
	operation: string,
	params: TParams,
	options: RunAscetEditOperationOptions,
	buildArgs: (params: TParams) => string[],
	summary: string,
	approval: AscetEditApprovalFailure,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation,
			summary,
			...createAscetEditApprovalResultData(approval),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildArgs(params),
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code: approval.code, message: approval.message },
	};
}

export async function runApprovedAscetEditOperation<TParams extends AscetEditControlParams>(
	operation: string,
	params: TParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
	buildArgs: (params: TParams) => string[],
	summary: string,
	title = "Confirm ASCET edit",
	errorPrefix: AscetEditErrorPrefix = "ascet_edit",
): Promise<AscetCliJsonResult> {
	const approval = await requestAscetEditApproval(
		{
			executeWrite: params.executeWrite,
			title,
			message: summary,
			signal: options.signal,
			errorPrefix,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedEditResult(operation, params, options, buildArgs, summary, approval);
	}

	return runAscetCliJson(buildArgs(params), options);
}

export function formatAscetEditOperationResult(operation: string, result: AscetCliJsonResult): string {
	return formatAscetCliJsonResult(operation, result);
}

export function createAscetEditImpact(params: AscetEditImpactParams): AscetEditImpact {
	const component = getPrimaryEditComponent(params);
	const method = component && params.methodName ? [{ component, method: params.methodName }] : [];
	const element = component && params.elementName ? [{ component, name: params.elementName }] : [];
	const stale = getStalePartitionsForWrite(params.action);
	return {
		action: params.action,
		affectedComponents: component ? [component] : [],
		affectedMethods: method,
		affectedElements: element,
		stale,
	};
}

export function applyAscetEditImpactToSearchIndex(
	impact: AscetEditImpact,
	reason = `edit_succeeded:${impact.action}`,
	options?:
		| string
		| Pick<RunAscetEditOperationOptions, "cwd" | "env" | "signal" | "timeoutMs" | "executeCli" | "scheduler">,
): void {
	const affected = [...new Set(impact.stale)];
	if (affected.length === 0) {
		return;
	}
	const refreshOptions = typeof options === "string" ? { cwd: options } : options;
	invalidateAscetSearchIndexPartitions(affected, reason);
	if (refreshOptions?.cwd) {
		markAscetSqliteIndexAreasStale(refreshOptions.cwd, staleSqliteAreasForWrite(impact.action, affected), reason);
		scheduleAscetSearchIndexBackgroundRefresh({
			cwd: refreshOptions.cwd,
			env: refreshOptions.env,
			signal: refreshOptions.signal,
			timeoutMs: refreshOptions.timeoutMs,
			executeCli: refreshOptions.executeCli,
			scheduler: refreshOptions.scheduler,
			reason,
		});
	}
}

function staleSqliteAreasForWrite(
	action: string,
	partitions: readonly AscetSearchIndexPartition[],
): AscetP0IndexArea[] {
	const areas = new Set<AscetP0IndexArea>();
	for (const partition of partitions) {
		switch (partition) {
			case "components":
				areas.add("components");
				areas.add("folders");
				areas.add("folder_items");
				areas.add("dbitem_dependencies");
				break;
			case "element_decls":
				areas.add("elements");
				areas.add("element_refs");
				areas.add("messages");
				break;
			case "method_decls":
				areas.add("methods");
				break;
			case "component_refs":
				areas.add("component_refs");
				break;
			case "element_refs":
				areas.add("element_refs");
				break;
			case "messages":
				areas.add("messages");
				break;
			case "text_code":
				areas.add("code_blocks");
				areas.add("code_terms");
				break;
			case "diagram_metadata":
			case "method_process_elements":
			case "all":
				break;
		}
	}
	if (action === "apply_project_formula") {
		areas.add("project_formulas");
		areas.add("project_items");
	}
	if (action === "set_element_dependency" || action === "set_enumerators") {
		areas.add("component_refs");
		areas.add("element_refs");
		areas.add("dbitem_dependencies");
	}
	if (action === "set_method_code" || action === "set_module_code" || action === "set_state_machine_code") {
		areas.add("elements");
		areas.add("element_refs");
		areas.add("code_blocks");
		areas.add("code_terms");
	}
	return [...areas];
}

function getPrimaryEditComponent(params: AscetEditImpactParams): string | undefined {
	const raw =
		params.componentPath ??
		params.modulePath ??
		params.stateMachinePath ??
		params.targetPath ??
		params.folderPath ??
		params.projectPath;
	return raw ? normalizeAscetPath(raw).replace(/\\/g, "/") : undefined;
}

function getStalePartitionsForWrite(action: string): AscetSearchIndexPartition[] {
	switch (action) {
		case "create_component":
		case "create_folder":
			return ["components"];
		case "create_method":
		case "set_method_signature":
			return ["method_decls", "element_decls", "element_refs", "text_code"];
		case "set_method_code":
		case "set_module_code":
		case "set_state_machine_code":
			return ["element_decls", "element_refs", "text_code"];
		case "delete_method":
			return ["method_decls", "element_decls", "element_refs", "text_code"];
		case "delete_component":
		case "delete_folder":
		case "apply_project_formula":
			return ["components", "element_decls", "text_code"];
		case "apply_element_spec":
		case "set_element_dependency":
		case "set_enumerators":
			return ["element_decls", "element_refs", "text_code"];
		default:
			return [];
	}
}

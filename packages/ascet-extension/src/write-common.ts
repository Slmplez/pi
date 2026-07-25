import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { type AscetSearchIndexPartition, invalidateAscetSearchIndexPartitions } from "./search-index-store.ts";
import { createAscetStatusReport } from "./status.ts";
import { type AscetWriteApprovalContext, requestAscetWriteApproval } from "./write-policy.ts";

export interface RunAscetWriteOperationOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export interface AscetWriteControlParams {
	verifyReadback?: boolean;
	executeWrite?: boolean;
}

export interface WriteImpact {
	action: string;
	affectedComponents: string[];
	affectedMethods: Array<{ component: string; method: string }>;
	affectedElements: Array<{ component: string; name: string }>;
	stale: AscetSearchIndexPartition[];
}

export type WriteImpactParams = {
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

export function createWriteSummary(operation: string, fields: Record<string, unknown>): string {
	return [
		"ASCET write request:",
		`operation: ${operation}`,
		...Object.entries(fields).map(([key, value]) => `${key}: ${String(value)}`),
	].join("\n");
}

function createBlockedWriteResult<TParams>(
	operation: string,
	params: TParams,
	options: RunAscetWriteOperationOptions,
	buildArgs: (params: TParams) => string[],
	summary: string,
	code: string,
	message: string,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation,
			preflightOnly: true,
			summary,
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
		error: { code, message },
	};
}

export async function runApprovedAscetWriteOperation<TParams extends AscetWriteControlParams>(
	operation: string,
	params: TParams,
	options: RunAscetWriteOperationOptions,
	ctx: AscetWriteApprovalContext,
	buildArgs: (params: TParams) => string[],
	summary: string,
	title = "Confirm ASCET write",
): Promise<AscetCliJsonResult> {
	const approval = await requestAscetWriteApproval(
		{
			executeWrite: params.executeWrite,
			title,
			message: summary,
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedWriteResult(
			operation,
			params,
			options,
			buildArgs,
			summary,
			approval.code ?? "ascet_write_rejected",
			approval.message ?? "ASCET write was not approved.",
		);
	}

	return runAscetCliJson(buildArgs(params), options);
}

export function formatWriteOperationResult(operation: string, result: AscetCliJsonResult): string {
	return formatAscetCliJsonResult(operation, result);
}

export function createWriteImpact(params: WriteImpactParams): WriteImpact {
	const component = getPrimaryWriteComponent(params);
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

export function applyWriteImpactToSearchIndex(impact: WriteImpact, reason = `write_succeeded:${impact.action}`): void {
	const affected = [...new Set(impact.stale)];
	if (affected.length === 0) {
		return;
	}
	invalidateAscetSearchIndexPartitions(affected, reason);
}

function getPrimaryWriteComponent(params: WriteImpactParams): string | undefined {
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
			return ["element_decls"];
		case "set_method_code":
		case "set_module_code":
		case "set_state_machine_code":
			return ["text_code"];
		case "delete_method":
			return ["element_decls", "text_code"];
		case "delete_component":
		case "delete_folder":
		case "apply_project_formula":
			return ["components", "element_decls", "text_code"];
		case "apply_element_spec":
		case "set_element_dependency":
		case "set_enumerators":
			return ["element_decls", "text_code"];
		default:
			return [];
	}
}

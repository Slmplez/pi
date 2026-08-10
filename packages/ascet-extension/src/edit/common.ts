import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import {
	getAscetArtifactRoot,
	invalidateAscetObservations,
	type ObservationInvalidationCriteria,
} from "../observation-store.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
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
	cliPath?: string;
	agentId?: string;
	sessionId?: string;
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

export interface AscetObservationInvalidation {
	invalidated: string[];
}

export type AscetEditObservationTargetParams = {
	action: string;
	componentPath?: string;
	modulePath?: string;
	stateMachinePath?: string;
	folderPath?: string;
	projectPath?: string;
	targetPath?: string;
};

export const ifMissingSchema = Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")]));

export function appendVerifyAndJson(args: string[], verifyReadback = false): string[] {
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

export function invalidateAscetEditObservations(
	params: AscetEditObservationTargetParams,
	options?: Pick<RunAscetEditOperationOptions, "env">,
): AscetObservationInvalidation {
	const invalidated = new Set<string>();
	const componentPath = normalizeOptionalPath(
		params.componentPath ?? params.modulePath ?? params.stateMachinePath ?? params.targetPath,
	);
	const projectPath = normalizeOptionalPath(params.projectPath);
	const folderPath = normalizeOptionalPath(params.folderPath);
	const storeOptions = observationStoreOptions(options);

	if (componentPath) {
		addInvalidatedObservationIds(invalidated, { componentPath }, storeOptions);
	}
	if (projectPath) {
		addInvalidatedObservationIds(invalidated, { projectPath }, storeOptions);
	}
	if (folderPath) {
		addInvalidatedObservationIds(invalidated, { targetPathPrefix: folderPath }, storeOptions);
		const parentFolderPath = getParentPath(folderPath);
		if (parentFolderPath) {
			addInvalidatedObservationIds(invalidated, { targetPathPrefix: parentFolderPath }, storeOptions);
		}
	}
	if ((params.action === "create_component" || params.action === "delete_component") && componentPath) {
		const parentComponentPath = getParentPath(componentPath);
		if (parentComponentPath) {
			addInvalidatedObservationIds(invalidated, { targetPathPrefix: parentComponentPath }, storeOptions);
		}
	}

	return { invalidated: [...invalidated] };
}

function addInvalidatedObservationIds(
	invalidated: Set<string>,
	criteria: ObservationInvalidationCriteria,
	options?: { root: string },
): void {
	for (const resultId of invalidateAscetObservations(criteria, options)) {
		invalidated.add(resultId);
	}
}

function observationStoreOptions(options?: Pick<RunAscetEditOperationOptions, "env">): { root: string } | undefined {
	const root = getAscetArtifactRoot(options?.env ?? process.env);
	return root ? { root } : undefined;
}

function normalizeOptionalPath(value: string | undefined): string | undefined {
	const normalized = value?.trim();
	return normalized ? normalizeAscetPath(normalized).replace(/\\+$/u, "") : undefined;
}

function getParentPath(path: string): string | undefined {
	const separator = path.lastIndexOf("\\");
	return separator > 0 ? path.slice(0, separator) : undefined;
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliLifecycleEvent,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import { getAscetDatabaseIdentity, isAscetDatabaseIdentityWritable } from "../get.ts";
import type { AscetObservationDatabaseIdentity } from "../observation-store.ts";
import {
	getAscetArtifactRoot,
	invalidateAscetObservations,
	type ObservationInvalidationCriteria,
} from "../observation-store.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { createAscetStatusReport } from "../status.ts";
import { unwrapToolSuccessPayload } from "../tool-response-contract.ts";
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
	onLifecycle?: (event: AscetCliLifecycleEvent) => void;
}

export interface AscetEditControlParams {
	verifyReadback?: boolean;
	intent?: "apply";
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

export async function checkAscetDatabaseIdentityForWrite(
	options: RunAscetEditOperationOptions,
): Promise<{ identity?: AscetObservationDatabaseIdentity; result?: AscetCliJsonResult }> {
	const raw = await runAscetCliJson(["exec", "get_database_identity", "--request-json", "{}", "--json"], {
		...options,
		toolName: "ascet_edit",
		commandId: "get_database_identity",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
	const payload = unwrapToolSuccessPayload(raw.data);
	const identity =
		raw.ok && payload && typeof payload === "object" && !Array.isArray(payload)
			? getAscetDatabaseIdentity(payload as Record<string, unknown>)
			: undefined;
	if (!raw.ok || !identity) {
		return {
			result: {
				...raw,
				ok: false,
				error: {
					code: "database_identity_missing",
					message: raw.error?.message ?? "Current ASCET database identity is unavailable.",
				},
			},
		};
	}
	if (!isAscetDatabaseIdentityWritable(identity)) {
		return {
			identity,
			result: {
				...raw,
				ok: false,
				error: {
					code: "database_identity_inconsistent",
					message: `Current ASCET database identity is ${identity.status}: ${identity.issues.join(", ") || "no diagnostic details"}.`,
					details: identity,
				},
			},
		};
	}
	return { identity };
}

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
	if (params.intent !== "apply") {
		return createBlockedEditResult(operation, params, options, buildArgs, summary, {
			approved: false,
			code: `${errorPrefix}_approval_required`,
			message:
				"intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.",
		});
	}
	const approval = await requestAscetEditApproval(
		{
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

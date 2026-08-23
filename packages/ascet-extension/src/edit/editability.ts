import { Value } from "typebox/value";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import { evaluateAscetPermission } from "../permissions/evaluate.ts";
import { type AscetPermissionSnapshot, resolveAscetPermissionSnapshot } from "../permissions/types.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { createAscetStatusReport } from "../status.ts";
import { type AscetEditApprovalContext, requestAscetMutationApproval } from "./approval.ts";
import { getAscetEditAction } from "./contract.ts";
import {
	type AscetCanonicalEditabilitySetResult,
	ascetEditabilityCheckResultSchema,
	ascetEditabilitySetResultSchema,
	extractBridgeActionPayload,
	isRecord,
} from "./result-contract.ts";
import type { AscetPublicMutationIntent } from "./write-control-contract.ts";

export type AscetEditabilityMode = "check" | "set";

export type AscetEditabilityParams =
	| { mode: "check"; componentPath: string }
	| { mode: "set"; componentPath: string; intent: AscetPublicMutationIntent };

export interface RunAscetEditabilityOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export interface AscetEditabilityContext extends AscetEditApprovalContext {
	ascetPermission?: AscetPermissionSnapshot;
}

function normalizeComponentPath(componentPath: string): string {
	return normalizeAscetPath(componentPath.trim()).replace(/^\\+/, "");
}

export function getAscetEditabilityOperation(mode: AscetEditabilityMode): string {
	return mode === "set" ? "component_editable_set" : "component_editable_check";
}

export function buildAscetEditabilityArgs(params: Pick<AscetEditabilityParams, "mode" | "componentPath">): string[] {
	return ["exec", getAscetEditabilityOperation(params.mode), normalizeComponentPath(params.componentPath), "--json"];
}

function normalizeEditabilityResult(result: AscetCliJsonResult, operation: string): AscetCliJsonResult {
	const payload = extractBridgeActionPayload(result.data);
	const schema =
		operation === "component_editable_set" ? ascetEditabilitySetResultSchema : ascetEditabilityCheckResultSchema;
	if (payload && Value.Check(schema, payload)) return { ...result, data: payload };
	if (!result.ok && operation !== "component_editable_set") return payload ? { ...result, data: payload } : result;

	const code = result.error?.code ?? "ascet_edit_invalid_output";
	const message =
		result.error?.message ??
		`${operation} returned a result that does not satisfy the canonical editability contract.`;
	if (operation === "component_editable_set") {
		const source = payload ?? (isRecord(result.error?.details) ? result.error.details : undefined);
		const rawMutationStatus = typeof source?.mutationStatus === "string" ? source.mutationStatus : undefined;
		const mutationStatus: AscetCanonicalEditabilitySetResult["mutationStatus"] =
			rawMutationStatus === "not_started" ||
			rawMutationStatus === "partial_failure" ||
			rawMutationStatus === "outcome_unknown" ||
			rawMutationStatus === "verification_failed" ||
			rawMutationStatus === "rolled_back"
				? rawMutationStatus
				: code === "write_not_started"
					? "not_started"
					: "outcome_unknown";
		const notStarted = mutationStatus === "not_started";
		const recoveryRequired = !notStarted && mutationStatus !== "rolled_back";
		const recoveryActions = Array.isArray(source?.recoveryActions)
			? source.recoveryActions.filter(
					(value): value is string => typeof value === "string" && value.trim().length > 0,
				)
			: [];
		if (recoveryRequired && recoveryActions.length === 0) {
			recoveryActions.push("Inspect the SCM state for the target before retrying editability acquisition.");
		}
		const failure: AscetCanonicalEditabilitySetResult = {
			outcome: "failed",
			editable: typeof source?.editable === "boolean" ? source.editable : null,
			beforeEditable: typeof source?.beforeEditable === "boolean" ? source.beforeEditable : null,
			afterEditable: typeof source?.afterEditable === "boolean" ? source.afterEditable : null,
			changed: source?.changed === true,
			mutationStatus,
			saveAttempted: false,
			saveSucceeded: false,
			saveState: "not_applicable",
			verified: false,
			verificationStatus:
				mutationStatus === "verification_failed" ? "failed" : notStarted ? "not_applicable" : "unknown",
			verificationMode: "same_session_scm_state",
			sessionCount: notStarted ? 0 : 1,
			saveCount: 0,
			nativeMutationAttemptCount:
				typeof source?.nativeMutationAttemptCount === "number"
					? source.nativeMutationAttemptCount
					: notStarted
						? 0
						: 1,
			editableRetryCount: typeof source?.editableRetryCount === "number" ? source.editableRetryCount : 0,
			nativeScmOperationCount:
				typeof source?.nativeScmOperationCount === "number" ? source.nativeScmOperationCount : 0,
			nativeOperations: Array.isArray(source?.nativeOperations) ? source.nativeOperations : [],
			error: { code, message },
			recovery: { required: recoveryRequired, actions: recoveryActions },
		};
		return { ...result, ok: false, data: failure, error: { code, message } };
	}
	return {
		...result,
		ok: false,
		data: payload ?? null,
		error: { code, message },
	};
}

export async function runAscetEditability(
	params: AscetEditabilityParams,
	options: RunAscetEditabilityOptions,
): Promise<AscetCliJsonResult> {
	const operation = getAscetEditabilityOperation(params.mode);
	const result = await runAscetCliJson(buildAscetEditabilityArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: operation,
		jobKind: params.mode === "set" ? "write" : "read",
	});
	return normalizeEditabilityResult(result, operation);
}

function createBlockedEditabilityResult(
	params: AscetEditabilityParams,
	options: RunAscetEditabilityOptions,
	code: string,
	message: string,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	const isSet = params.mode === "set";
	const data: AscetCanonicalEditabilitySetResult | null = isSet
		? {
				outcome: "failed",
				editable: null,
				beforeEditable: null,
				afterEditable: null,
				changed: false,
				mutationStatus: "not_started",
				saveAttempted: false,
				saveSucceeded: false,
				saveState: "not_applicable",
				verified: false,
				verificationStatus: "not_applicable",
				verificationMode: "same_session_scm_state",
				sessionCount: 0,
				saveCount: 0,
				nativeMutationAttemptCount: 0,
				editableRetryCount: 0,
				nativeScmOperationCount: 0,
				nativeOperations: [],
				error: { code, message },
				recovery: { required: false, actions: [] },
			}
		: null;
	const normalizedPath = typeof params.componentPath === "string" ? normalizeComponentPath(params.componentPath) : "";
	return {
		ok: false,
		data,
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args:
				normalizedPath && (params.mode === "check" || params.mode === "set")
					? buildAscetEditabilityArgs(params)
					: [],
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code, message },
	};
}

export async function runApprovedAscetEditability(
	params: AscetEditabilityParams,
	options: RunAscetEditabilityOptions,
	ctx: AscetEditabilityContext,
): Promise<AscetCliJsonResult> {
	const raw = params as { mode?: unknown; componentPath?: unknown; intent?: unknown };
	if (typeof raw.componentPath !== "string" || !normalizeComponentPath(raw.componentPath)) {
		return createBlockedEditabilityResult(
			params,
			options,
			"ascet_edit_invalid_parameter",
			"componentPath is required for ascet_edit.",
		);
	}
	if (raw.mode === "check") {
		if (raw.intent !== undefined) {
			return createBlockedEditabilityResult(
				params,
				options,
				"ascet_edit_invalid_parameter",
				"mode=check does not accept intent.",
			);
		}
		return runAscetEditability(
			{ mode: "check", componentPath: normalizeComponentPath(params.componentPath) },
			options,
		);
	}
	if (raw.mode !== "set" || raw.intent !== "apply") {
		return createBlockedEditabilityResult(
			params,
			options,
			"ascet_edit_invalid_parameter",
			"intent=apply is required for mode=set; use mode=check for read-only editability inspection.",
		);
	}
	const normalizedParams: AscetEditabilityParams = {
		mode: "set",
		componentPath: normalizeComponentPath(params.componentPath),
		intent: "apply",
	};

	const descriptor = getAscetEditAction("set")?.permission;
	if (!descriptor) {
		return createBlockedEditabilityResult(
			normalizedParams,
			options,
			"ascet_edit_internal_contract_error",
			"Missing ASCET editability permission descriptor.",
		);
	}
	const permission = resolveAscetPermissionSnapshot(ctx);
	const decision = evaluateAscetPermission({
		mode: permission.mode,
		action: "set",
		descriptor,
		rules: permission.rules,
		path: normalizedParams.componentPath,
		databaseFingerprint: permission.databaseFingerprint,
		hardGatesPassed: true,
		evidenceComplete: true,
		targetCount: 1,
		variantCount: 1,
	});
	if (decision.behavior === "deny") {
		return createBlockedEditabilityResult(normalizedParams, options, "ascet_edit_permission_denied", decision.reason);
	}
	if (decision.behavior === "ask") {
		const approval = await requestAscetMutationApproval(
			{
				title: "Make ASCET component editable?",
				message: `Target: ${normalizedParams.componentPath}`,
				signal: options.signal,
			},
			ctx,
		);
		if (approval.status !== "approved") {
			const code =
				approval.status === "ui_unavailable"
					? "ascet_edit_approval_required"
					: approval.status === "cancelled"
						? "ascet_edit_operation_aborted_before_write"
						: approval.status === "ui_failed"
							? "ascet_edit_confirmation_ui_failed"
							: "ascet_edit_confirmation_not_granted";
			const message =
				approval.status === "ui_unavailable"
					? "This operation requires an interactive approval channel."
					: approval.status === "ui_failed"
						? `ASCET edit confirmation UI failed: ${approval.message}`
						: approval.status === "cancelled"
							? "ASCET edit was cancelled before the write began."
							: "ASCET edit confirmation was not granted.";
			return createBlockedEditabilityResult(normalizedParams, options, code, message);
		}
	}
	return runAscetEditability(normalizedParams, options);
}

export function formatAscetEditabilityResult(result: AscetCliJsonResult, params?: AscetEditabilityParams): string {
	if (isRecord(result.data) && (result.ok || result.data.outcome === "failed")) {
		return JSON.stringify(result.data, null, 2);
	}
	return formatAscetCliJsonResult(params ? getAscetEditabilityOperation(params.mode) : "editability", result);
}

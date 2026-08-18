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
import { toToolSuccessPayload } from "../tool-response-contract.ts";
import { type AscetEditApprovalContext, requestAscetMutationApproval } from "./approval.ts";
import { getAscetEditAction } from "./contract.ts";
import type { AscetMutationIntent } from "./write-control-contract.ts";

export type AscetEditabilityMode = "check" | "set";

export type AscetEditabilityParams =
	| { mode: "check"; componentPath: string }
	| { mode: "set"; componentPath: string; intent: AscetMutationIntent };

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
	const normalized = normalizeAscetPath(componentPath.trim()).replace(/^\\+/, "");
	if (!normalized) throw new Error("componentPath is required for ascet_edit.");
	return normalized;
}

export function getAscetEditabilityOperation(mode: AscetEditabilityMode): string {
	return mode === "set" ? "component_editable_set" : "component_editable_check";
}

export function buildAscetEditabilityArgs(params: Pick<AscetEditabilityParams, "mode" | "componentPath">): string[] {
	return ["exec", getAscetEditabilityOperation(params.mode), normalizeComponentPath(params.componentPath), "--json"];
}

function getEditableBoolean(data: unknown): boolean | undefined {
	if (typeof data === "boolean") return data;
	if (!data || typeof data !== "object" || Array.isArray(data)) return undefined;
	const candidate = data as { editable?: unknown; result?: unknown };
	if (typeof candidate.editable === "boolean") return candidate.editable;
	if (typeof candidate.result === "boolean") return candidate.result;
	if (candidate.result && typeof candidate.result === "object" && !Array.isArray(candidate.result)) {
		const envelopeResult = candidate.result as { editable?: unknown };
		if (typeof envelopeResult.editable === "boolean") return envelopeResult.editable;
	}
	return undefined;
}

function normalizeBooleanResult(result: AscetCliJsonResult, operation: string): AscetCliJsonResult {
	if (!result.ok) return result;
	const editable = getEditableBoolean(result.data);
	if (editable !== undefined) {
		if (operation === "component_editable_set" && !editable) {
			return {
				...result,
				ok: false,
				data: false,
				error: {
					code: "component_not_editable",
					message: "ASCET completed component_editable_set but the component remained read-only.",
				},
			};
		}
		return { ...result, data: editable };
	}
	return {
		...result,
		ok: false,
		data: null,
		error: {
			code: "ascet_edit_invalid_output",
			message: `${operation} expected a JSON boolean result from AscetBridge.exe exec.`,
		},
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
	return normalizeBooleanResult(result, operation);
}

function createBlockedEditabilityResult(
	params: AscetEditabilityParams,
	options: RunAscetEditabilityOptions,
	code: string,
	message: string,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: getAscetEditabilityOperation(params.mode),
			summary: createSetEditabilitySummary(params),
			writeExecuted: false,
			mutation: { status: "not_started" },
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildAscetEditabilityArgs(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code, message },
	};
}

function createSetEditabilitySummary(params: AscetEditabilityParams): string {
	return [
		"ASCET editability request:",
		"operation: component_editable_set",
		`componentPath: ${params.componentPath}`,
	].join("\n");
}

export async function runApprovedAscetEditability(
	params: AscetEditabilityParams,
	options: RunAscetEditabilityOptions,
	ctx: AscetEditabilityContext,
): Promise<AscetCliJsonResult> {
	if (params.mode === "check") return runAscetEditability(params, options);
	if (params.intent === "preview") {
		return runAscetEditability({ mode: "check", componentPath: params.componentPath }, options);
	}

	const descriptor = getAscetEditAction("set")?.permission;
	if (!descriptor) throw new Error("Missing ASCET editability permission descriptor.");
	const permission = resolveAscetPermissionSnapshot(ctx);
	const decision = evaluateAscetPermission({
		mode: permission.mode,
		action: "set",
		descriptor,
		rules: permission.rules,
		path: params.componentPath,
		hardGatesPassed: true,
		evidenceComplete: true,
	});
	if (decision.behavior === "deny") {
		return createBlockedEditabilityResult(params, options, "ascet_edit_permission_denied", decision.reason);
	}
	if (decision.behavior === "ask") {
		const approval = await requestAscetMutationApproval(
			{
				title: "Make ASCET component editable?",
				message: `Target: ${params.componentPath}`,
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
			return createBlockedEditabilityResult(params, options, code, message);
		}
	}
	return runAscetEditability(params, options);
}

export function formatAscetEditabilityResult(result: AscetCliJsonResult, params?: AscetEditabilityParams): string {
	if (result.ok && typeof result.data === "boolean") {
		return JSON.stringify(toToolSuccessPayload({ editable: result.data }), null, 2);
	}
	return formatAscetCliJsonResult(params ? getAscetEditabilityOperation(params.mode) : "editability", result);
}

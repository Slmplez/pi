import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { createAscetStatusReport } from "../status.ts";
import { toToolSuccessPayload } from "../tool-response-contract.ts";
import {
	type AscetEditApprovalContext,
	type AscetEditApprovalFailure,
	createAscetEditApprovalResultData,
	requestAscetEditApproval,
} from "./approval.ts";

export type AscetEditabilityMode = "check" | "set";

export interface AscetEditabilityParams {
	mode: AscetEditabilityMode;
	componentPath: string;
	executeWrite?: boolean;
}

export interface RunAscetEditabilityOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

function normalizeComponentPath(componentPath: string): string {
	const normalized = normalizeAscetPath(componentPath.trim()).replace(/^\\+/, "");
	if (!normalized) {
		throw new Error("componentPath is required for ascet_edit.");
	}
	return normalized;
}

export function getAscetEditabilityOperation(mode: AscetEditabilityMode): string {
	return mode === "set" ? "component_editable_set" : "component_editable_check";
}

export function buildAscetEditabilityArgs(params: AscetEditabilityParams): string[] {
	return ["exec", getAscetEditabilityOperation(params.mode), normalizeComponentPath(params.componentPath), "--json"];
}

function getEditableBoolean(data: unknown): boolean | undefined {
	if (typeof data === "boolean") {
		return data;
	}
	if (!data || typeof data !== "object" || Array.isArray(data)) {
		return undefined;
	}
	const candidate = data as { editable?: unknown; result?: unknown };
	if (typeof candidate.editable === "boolean") {
		return candidate.editable;
	}
	if (typeof candidate.result === "boolean") {
		return candidate.result;
	}
	if (candidate.result && typeof candidate.result === "object" && !Array.isArray(candidate.result)) {
		const envelopeResult = candidate.result as { editable?: unknown };
		if (typeof envelopeResult.editable === "boolean") {
			return envelopeResult.editable;
		}
	}
	return undefined;
}

function normalizeBooleanResult(result: AscetCliJsonResult, operation: string): AscetCliJsonResult {
	if (!result.ok) {
		return result;
	}
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
	approval: AscetEditApprovalFailure,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: getAscetEditabilityOperation(params.mode),
			summary: createSetEditabilitySummary(params),
			...createAscetEditApprovalResultData(approval),
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
		error: { code: approval.code, message: approval.message },
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
	ctx: AscetEditApprovalContext,
): Promise<AscetCliJsonResult> {
	if (params.mode !== "set") {
		return runAscetEditability(params, options);
	}

	const approval = await requestAscetEditApproval(
		{
			executeWrite: params.executeWrite,
			title: "Confirm ASCET editability",
			message: createSetEditabilitySummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedEditabilityResult(params, options, approval);
	}

	return runAscetEditability(params, options);
}

export function formatAscetEditabilityResult(result: AscetCliJsonResult, params?: AscetEditabilityParams): string {
	if (result.ok && typeof result.data === "boolean") {
		return JSON.stringify(toToolSuccessPayload({ editable: result.data }), null, 2);
	}
	return formatAscetCliJsonResult(params ? getAscetEditabilityOperation(params.mode) : "editability", result);
}

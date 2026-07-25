import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { createAscetStatusReport } from "./status.ts";
import { type AscetWriteApprovalContext, requestAscetWriteApproval } from "./write-policy.ts";

export type AscetComponentEditableMode = "check" | "set";

export interface AscetComponentEditableParams {
	mode: AscetComponentEditableMode;
	componentPath: string;
	executeWrite?: boolean;
}

export interface RunAscetComponentEditableOptions {
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
		throw new Error("componentPath is required for ascet_component_editable.");
	}
	return normalized;
}

export function getAscetComponentEditableOperation(mode: AscetComponentEditableMode): string {
	return mode === "set" ? "component_editable_set" : "component_editable_check";
}

export function buildAscetComponentEditableArgs(params: AscetComponentEditableParams): string[] {
	return [
		"exec",
		getAscetComponentEditableOperation(params.mode),
		normalizeComponentPath(params.componentPath),
		"--json",
	];
}

function getEnvelopeResult(data: unknown): unknown {
	if (data && typeof data === "object" && !Array.isArray(data)) {
		return (data as { result?: unknown }).result;
	}
	return undefined;
}

function normalizeBooleanResult(result: AscetCliJsonResult, operation: string): AscetCliJsonResult {
	if (!result.ok) {
		return result;
	}
	if (typeof result.data === "boolean") {
		return result;
	}
	const envelopeResult = getEnvelopeResult(result.data);
	if (typeof envelopeResult === "boolean") {
		return { ...result, data: envelopeResult };
	}
	return {
		...result,
		ok: false,
		data: null,
		error: {
			code: "ascet_component_editable_invalid_output",
			message: `${operation} expected a JSON boolean result from AscetCli.exe exec.`,
		},
	};
}

export async function runAscetComponentEditable(
	params: AscetComponentEditableParams,
	options: RunAscetComponentEditableOptions,
): Promise<AscetCliJsonResult> {
	const operation = getAscetComponentEditableOperation(params.mode);
	const result = await runAscetCliJson(buildAscetComponentEditableArgs(params), {
		...options,
		toolName: "ascet_component_editable",
		commandId: operation,
		jobKind: params.mode === "set" ? "write" : "read",
	});
	return normalizeBooleanResult(result, operation);
}

function createBlockedComponentEditableResult(
	params: AscetComponentEditableParams,
	options: RunAscetComponentEditableOptions,
	code: string,
	message: string,
): AscetCliJsonResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: null,
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildAscetComponentEditableArgs(params),
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

function createSetEditableSummary(params: AscetComponentEditableParams): string {
	return [
		"ASCET component editable request:",
		"operation: component_editable_set",
		`componentPath: ${params.componentPath}`,
	].join("\n");
}

export async function runApprovedAscetComponentEditable(
	params: AscetComponentEditableParams,
	options: RunAscetComponentEditableOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetCliJsonResult> {
	if (params.mode !== "set") {
		return runAscetComponentEditable(params, options);
	}

	const approval = await requestAscetWriteApproval(
		{
			executeWrite: params.executeWrite,
			title: "Confirm ASCET component editable",
			message: createSetEditableSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedComponentEditableResult(
			params,
			options,
			approval.code ?? "ascet_component_editable_rejected",
			approval.message ?? "ASCET component editable request was not approved.",
		);
	}

	return runAscetComponentEditable(params, options);
}

export function formatAscetComponentEditableResult(
	result: AscetCliJsonResult,
	params?: AscetComponentEditableParams,
): string {
	if (result.ok && typeof result.data === "boolean") {
		return result.data ? "true" : "false";
	}
	return formatAscetCliJsonResult(
		params ? getAscetComponentEditableOperation(params.mode) : "component_editable",
		result,
	);
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
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

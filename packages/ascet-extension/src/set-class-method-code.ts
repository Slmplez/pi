import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { createAscetStatusReport } from "./status.ts";
import { type AscetWriteApprovalContext, requestAscetWriteApproval } from "./write-policy.ts";

export interface AscetSetClassMethodCodeParams {
	classPath: string;
	methodName: string;
	codeFile: string;
	verifyReadback?: boolean;
	executeWrite?: boolean;
}

export interface RunAscetSetClassMethodCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetSetClassMethodCodeResult = AscetCliJsonResult;

export const ascetSetClassMethodCodeParameters = Type.Object({
	classPath: Type.String({ description: "ASCET class path, for example DEMO\\PID.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name, for example calc.", minLength: 1 }),
	codeFile: Type.String({ description: "Path to the file containing replacement method code.", minLength: 1 }),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(
		Type.Boolean({
			description: "Defaults to false. When true, PI will still require interactive confirmation before writing.",
		}),
	),
});

export function buildSetClassMethodCodeArgs(params: AscetSetClassMethodCodeParams): string[] {
	const args = ["exec", "set_class_method_code", params.classPath, params.methodName, params.codeFile];
	if (params.verifyReadback) {
		args.push("--verify-readback");
	}
	args.push("--json");
	return args;
}

export function createSetClassMethodCodeSummary(params: AscetSetClassMethodCodeParams): string {
	return [
		"ASCET write request:",
		`operation: set_class_method_code`,
		`classPath: ${params.classPath}`,
		`methodName: ${params.methodName}`,
		`codeFile: ${params.codeFile}`,
		`verifyReadback: ${params.verifyReadback === true}`,
	].join("\n");
}

function createBlockedWriteResult(
	params: AscetSetClassMethodCodeParams,
	options: RunAscetSetClassMethodCodeOptions,
	code: string,
	message: string,
): AscetSetClassMethodCodeResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: "set_class_method_code",
			preflightOnly: true,
			summary: createSetClassMethodCodeSummary(params),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildSetClassMethodCodeArgs(params),
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

export async function runAscetSetClassMethodCode(
	params: AscetSetClassMethodCodeParams,
	options: RunAscetSetClassMethodCodeOptions,
): Promise<AscetSetClassMethodCodeResult> {
	return runAscetCliJson(buildSetClassMethodCodeArgs(params), options);
}

export async function runApprovedAscetSetClassMethodCode(
	params: AscetSetClassMethodCodeParams,
	options: RunAscetSetClassMethodCodeOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetClassMethodCodeResult> {
	const approval = await requestAscetWriteApproval(
		{
			executeWrite: params.executeWrite,
			title: "Confirm ASCET write",
			message: createSetClassMethodCodeSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedWriteResult(
			params,
			options,
			approval.code ?? "ascet_write_rejected",
			approval.message ?? "ASCET write was not approved.",
		);
	}

	return runAscetSetClassMethodCode(params, options);
}

export function formatSetClassMethodCodeResult(result: AscetSetClassMethodCodeResult): string {
	return formatAscetCliJsonResult("set_class_method_code", result);
}

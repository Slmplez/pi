import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import {
	type AscetEditApprovalContext,
	type AscetEditApprovalFailure,
	createAscetEditApprovalResultData,
	requestAscetEditApproval,
} from "./edit/approval.ts";
import { createAscetStatusReport } from "./status.ts";

export interface AscetCreateMethodParams {
	componentPath: string;
	methodName: string;
	methodKind: "abstract" | "process" | "action" | "condition" | "trigger";
	diagram?: string;
	ifExists?: "fail" | "return-existing";
	verifyReadback?: boolean;
	rollbackOnFailure?: boolean;
	executeWrite?: boolean;
}

export interface RunAscetCreateMethodOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetCreateMethodResult = AscetCliJsonResult;

export const ascetCreateMethodParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "Method name to create.", minLength: 1 }),
	methodKind: Type.Union([
		Type.Literal("abstract"),
		Type.Literal("process"),
		Type.Literal("action"),
		Type.Literal("condition"),
		Type.Literal("trigger"),
	]),
	diagram: Type.Optional(Type.String()),
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
	rollbackOnFailure: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to roll back when supported." })),
	executeWrite: Type.Optional(
		Type.Boolean({ description: "Defaults to false. When true, PI still requires interactive confirmation." }),
	),
});

export function buildCreateMethodArgs(params: AscetCreateMethodParams): string[] {
	const args = ["exec", "create_method", params.componentPath, params.methodName, "--method-kind", params.methodKind];
	if (params.diagram) {
		args.push("--diagram", params.diagram);
	}
	if (params.ifExists) {
		args.push("--if-exists", params.ifExists);
	}
	if (params.verifyReadback) {
		args.push("--verify-readback");
	}
	if (params.rollbackOnFailure) {
		args.push("--rollback-on-failure");
	}
	args.push("--json");
	return args;
}

export function createCreateMethodSummary(params: AscetCreateMethodParams): string {
	return [
		"ASCET edit request:",
		"operation: create_method",
		`componentPath: ${params.componentPath}`,
		`methodName: ${params.methodName}`,
		`methodKind: ${params.methodKind}`,
		`diagram: ${params.diagram ?? ""}`,
		`ifExists: ${params.ifExists ?? ""}`,
		`verifyReadback: ${params.verifyReadback === true}`,
		`rollbackOnFailure: ${params.rollbackOnFailure === true}`,
	].join("\n");
}

function createBlockedWriteResult(
	params: AscetCreateMethodParams,
	options: RunAscetCreateMethodOptions,
	approval: AscetEditApprovalFailure,
): AscetCreateMethodResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: "create_method",
			summary: createCreateMethodSummary(params),
			...createAscetEditApprovalResultData(approval),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildCreateMethodArgs(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code: approval.code, message: approval.message },
	};
}

export async function runAscetCreateMethod(
	params: AscetCreateMethodParams,
	options: RunAscetCreateMethodOptions,
): Promise<AscetCreateMethodResult> {
	return runAscetCliJson(buildCreateMethodArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: "create_method",
		jobKind: "write",
	});
}

export async function runApprovedAscetCreateMethod(
	params: AscetCreateMethodParams,
	options: RunAscetCreateMethodOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetCreateMethodResult> {
	const approval = await requestAscetEditApproval(
		{
			executeWrite: params.executeWrite,
			title: "Confirm ASCET method creation",
			message: createCreateMethodSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedWriteResult(params, options, approval);
	}

	return runAscetCreateMethod(params, options);
}

export function formatCreateMethodResult(result: AscetCreateMethodResult): string {
	return formatAscetCliJsonResult("create_method", result);
}

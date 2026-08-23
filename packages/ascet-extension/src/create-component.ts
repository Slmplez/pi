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

export interface AscetCreateComponentParams {
	componentPath: string;
	kind: "class" | "module" | "statemachine" | "enumeration";
	language?: "ESDL" | "BDE" | "C";
	ifExists?: "fail" | "return-existing";
	verifyReadback?: boolean;
	rollbackOnFailure?: boolean;
	intent?: "apply";
}

export interface RunAscetCreateComponentOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetCreateComponentResult = AscetCliJsonResult;

export const ascetCreateComponentParameters = Type.Object(
	{
		componentPath: Type.String({ description: "ASCET component path to create.", minLength: 1 }),
		kind: Type.Union([
			Type.Literal("class"),
			Type.Literal("module"),
			Type.Literal("statemachine"),
			Type.Literal("enumeration"),
		]),
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
		ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
		rollbackOnFailure: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to roll back when supported." })),
		intent: Type.Literal("apply"),
	},
	{
		description:
			"Create an ASCET component. Successful newly created results may include expectedDefaultScaffold with verified=false, expected generatedItems, and defaultEntryMethod.",
	},
);

export function buildCreateComponentArgs(params: AscetCreateComponentParams): string[] {
	const args = ["exec", "create_component", params.componentPath, "--kind", params.kind];
	if (params.language) {
		args.push("--language", params.language);
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

export function createCreateComponentSummary(params: AscetCreateComponentParams): string {
	return [
		"ASCET edit request:",
		"operation: create_component",
		`componentPath: ${params.componentPath}`,
		`kind: ${params.kind}`,
		`language: ${params.language ?? ""}`,
		`ifExists: ${params.ifExists ?? ""}`,
		`verifyReadback: ${params.verifyReadback === true}`,
		`rollbackOnFailure: ${params.rollbackOnFailure === true}`,
	].join("\n");
}

function createBlockedWriteResult(
	params: AscetCreateComponentParams,
	options: RunAscetCreateComponentOptions,
	approval: AscetEditApprovalFailure,
): AscetCreateComponentResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: "create_component",
			summary: createCreateComponentSummary(params),
			...createAscetEditApprovalResultData(approval),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildCreateComponentArgs(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code: approval.code, message: approval.message },
	};
}

export async function runAscetCreateComponent(
	params: AscetCreateComponentParams,
	options: RunAscetCreateComponentOptions,
): Promise<AscetCreateComponentResult> {
	return runAscetCliJson(buildCreateComponentArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: "create_component",
		jobKind: "write",
	});
}

export async function runApprovedAscetCreateComponent(
	params: AscetCreateComponentParams,
	options: RunAscetCreateComponentOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetCreateComponentResult> {
	if (params.intent !== "apply") {
		return createBlockedWriteResult(params, options, {
			approved: false,
			code: "ascet_edit_approval_required",
			message:
				"intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.",
		});
	}
	const approval = await requestAscetEditApproval(
		{
			title: "Confirm ASCET component creation",
			message: createCreateComponentSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedWriteResult(params, options, approval);
	}

	return runAscetCreateComponent(params, options);
}

export function formatCreateComponentResult(result: AscetCreateComponentResult): string {
	return formatAscetCliJsonResult("create_component", result);
}

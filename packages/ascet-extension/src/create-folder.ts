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

export interface AscetCreateFolderParams {
	folderPath: string;
	verifyReadback?: boolean;
	intent?: "preview" | "apply";
}

export interface RunAscetCreateFolderOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetCreateFolderResult = AscetCliJsonResult;

export const ascetCreateFolderParameters = Type.Object({
	folderPath: Type.String({ description: "ASCET folder path to create.", minLength: 1 }),
	intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
});

export function buildCreateFolderArgs(params: AscetCreateFolderParams): string[] {
	const args = ["exec", "create_folder", params.folderPath];
	if (params.verifyReadback) {
		args.push("--verify-readback");
	}
	args.push("--json");
	return args;
}

export function createCreateFolderSummary(params: AscetCreateFolderParams): string {
	return [
		"ASCET edit request:",
		"operation: create_folder",
		`folderPath: ${params.folderPath}`,
		`verifyReadback: ${params.verifyReadback === true}`,
	].join("\n");
}

function createBlockedWriteResult(
	params: AscetCreateFolderParams,
	options: RunAscetCreateFolderOptions,
	approval: AscetEditApprovalFailure,
): AscetCreateFolderResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: "create_folder",
			summary: createCreateFolderSummary(params),
			...createAscetEditApprovalResultData(approval),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildCreateFolderArgs(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code: approval.code, message: approval.message },
	};
}

export async function runAscetCreateFolder(
	params: AscetCreateFolderParams,
	options: RunAscetCreateFolderOptions,
): Promise<AscetCreateFolderResult> {
	return runAscetCliJson(buildCreateFolderArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: "create_folder",
		jobKind: "write",
	});
}

export async function runApprovedAscetCreateFolder(
	params: AscetCreateFolderParams,
	options: RunAscetCreateFolderOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetCreateFolderResult> {
	if ((params.intent ?? "preview") !== "apply") {
		return createBlockedWriteResult(params, options, {
			approved: false,
			code: "ascet_edit_approval_required",
			message:
				"Use the guarded public ascet_edit call with intent=preview for authoritative non-mutating preflight.",
		});
	}
	const approval = await requestAscetEditApproval(
		{
			title: "Confirm ASCET folder creation",
			message: createCreateFolderSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedWriteResult(params, options, approval);
	}

	return runAscetCreateFolder(params, options);
}

export function formatCreateFolderResult(result: AscetCreateFolderResult): string {
	return formatAscetCliJsonResult("create_folder", result);
}

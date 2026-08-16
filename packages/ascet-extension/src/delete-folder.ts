import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	ifMissingSchema,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export interface AscetDeleteFolderParams extends AscetEditControlParams {
	folderPath: string;
	ifMissing?: "fail" | "ignore";
}

export type RunAscetDeleteFolderOptions = RunAscetEditOperationOptions;
export type AscetDeleteFolderResult = AscetCliJsonResult;

export const ascetDeleteFolderParameters = Type.Object({
	folderPath: Type.String({ description: "ASCET folder path to delete.", minLength: 1 }),
	ifMissing: ifMissingSchema,
	intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
});

export function buildDeleteFolderArgs(params: AscetDeleteFolderParams): string[] {
	const args = ["exec", "delete_folder", normalizeAscetPath(params.folderPath)];
	if (params.ifMissing) {
		args.push("--if-missing", params.ifMissing);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createDeleteFolderSummary(params: AscetDeleteFolderParams): string {
	return createAscetEditSummary("delete_folder", {
		folderPath: params.folderPath,
		ifMissing: params.ifMissing ?? "fail",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetDeleteFolder(
	params: AscetDeleteFolderParams,
	options: RunAscetDeleteFolderOptions,
): Promise<AscetDeleteFolderResult> {
	return runAscetCliJson(buildDeleteFolderArgs(params), options);
}

export async function runApprovedAscetDeleteFolder(
	params: AscetDeleteFolderParams,
	options: RunAscetDeleteFolderOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetDeleteFolderResult> {
	return runApprovedAscetEditOperation(
		"delete_folder",
		params,
		options,
		ctx,
		buildDeleteFolderArgs,
		createDeleteFolderSummary(params),
		"Confirm ASCET folder deletion",
	);
}

export function formatDeleteFolderResult(result: AscetDeleteFolderResult): string {
	return formatAscetEditOperationResult("delete_folder", result);
}

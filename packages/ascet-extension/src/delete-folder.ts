import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import {
	type AscetWriteControlParams,
	appendVerifyAndJson,
	createWriteSummary,
	formatWriteOperationResult,
	ifMissingSchema,
	type RunAscetWriteOperationOptions,
	runApprovedAscetWriteOperation,
} from "./write-common.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

export interface AscetDeleteFolderParams extends AscetWriteControlParams {
	folderPath: string;
	ifMissing?: "fail" | "ignore";
}

export type RunAscetDeleteFolderOptions = RunAscetWriteOperationOptions;
export type AscetDeleteFolderResult = AscetCliJsonResult;

export const ascetDeleteFolderParameters = Type.Object({
	folderPath: Type.String({ description: "ASCET folder path to delete.", minLength: 1 }),
	ifMissing: ifMissingSchema,
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildDeleteFolderArgs(params: AscetDeleteFolderParams): string[] {
	const args = ["exec", "delete_folder", normalizeAscetPath(params.folderPath)];
	if (params.ifMissing) {
		args.push("--if-missing", params.ifMissing);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createDeleteFolderSummary(params: AscetDeleteFolderParams): string {
	return createWriteSummary("delete_folder", {
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
	ctx: AscetWriteApprovalContext,
): Promise<AscetDeleteFolderResult> {
	return runApprovedAscetWriteOperation(
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
	return formatWriteOperationResult("delete_folder", result);
}

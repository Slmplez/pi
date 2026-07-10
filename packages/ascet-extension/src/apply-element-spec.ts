import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import {
	type AscetWriteControlParams,
	appendVerifyAndJson,
	createWriteSummary,
	formatWriteOperationResult,
	type RunAscetWriteOperationOptions,
	runApprovedAscetWriteOperation,
} from "./write-common.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

export interface AscetApplyElementSpecParams extends AscetWriteControlParams {
	componentPath: string;
	specFile: string;
	projectPath?: string;
	mode?: "restore";
	deleteMissing?: boolean;
	recreateIncompatible?: boolean;
}

export type RunAscetApplyElementSpecOptions = RunAscetWriteOperationOptions;
export type AscetApplyElementSpecResult = AscetCliJsonResult;

export const ascetApplyElementSpecParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	specFile: Type.String({ description: "Path to element spec JSON file.", minLength: 1 }),
	projectPath: Type.Optional(Type.String({ description: "Optional ASCET project path." })),
	mode: Type.Optional(Type.Literal("restore")),
	deleteMissing: Type.Optional(Type.Boolean()),
	recreateIncompatible: Type.Optional(Type.Boolean()),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildApplyElementSpecArgs(params: AscetApplyElementSpecParams): string[] {
	const args = ["exec", "apply_element_spec", normalizeAscetPath(params.componentPath), params.specFile];
	if (params.projectPath) {
		args.push("--project-path", normalizeAscetPath(params.projectPath));
	}
	if (params.mode) {
		args.push("--mode", params.mode);
	}
	if (params.deleteMissing) {
		args.push("--delete-missing");
	}
	if (params.recreateIncompatible) {
		args.push("--recreate-incompatible");
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createApplyElementSpecSummary(params: AscetApplyElementSpecParams): string {
	return createWriteSummary("apply_element_spec", {
		componentPath: params.componentPath,
		specFile: params.specFile,
		projectPath: params.projectPath ?? "",
		mode: params.mode ?? "",
		deleteMissing: params.deleteMissing === true,
		recreateIncompatible: params.recreateIncompatible === true,
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetApplyElementSpec(
	params: AscetApplyElementSpecParams,
	options: RunAscetApplyElementSpecOptions,
): Promise<AscetApplyElementSpecResult> {
	return runAscetCliJson(buildApplyElementSpecArgs(params), options);
}

export async function runApprovedAscetApplyElementSpec(
	params: AscetApplyElementSpecParams,
	options: RunAscetApplyElementSpecOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetApplyElementSpecResult> {
	return runApprovedAscetWriteOperation(
		"apply_element_spec",
		params,
		options,
		ctx,
		buildApplyElementSpecArgs,
		createApplyElementSpecSummary(params),
	);
}

export function formatApplyElementSpecResult(result: AscetApplyElementSpecResult): string {
	return formatWriteOperationResult("apply_element_spec", result);
}

import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export interface AscetApplyElementSpecParams extends AscetEditControlParams {
	componentPath: string;
	specFile: string;
	projectPath?: string;
	mode?: "restore";
	deleteMissing?: boolean;
	recreateIncompatible?: boolean;
}

export type RunAscetApplyElementSpecOptions = RunAscetEditOperationOptions;
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
	if (params.verifyReadback === false) {
		args.push("--no-verify-readback");
	} else {
		args.push("--verify-readback");
	}
	args.push("--json");
	return args;
}

export function createApplyElementSpecSummary(params: AscetApplyElementSpecParams): string {
	return createAscetEditSummary("apply_element_spec", {
		componentPath: params.componentPath,
		specFile: params.specFile,
		projectPath: params.projectPath ?? "",
		mode: params.mode ?? "",
		deleteMissing: params.deleteMissing === true,
		recreateIncompatible: params.recreateIncompatible === true,
		verifyReadback: params.verifyReadback !== false,
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
	ctx: AscetEditApprovalContext,
): Promise<AscetApplyElementSpecResult> {
	return runApprovedAscetEditOperation(
		"apply_element_spec",
		params,
		options,
		ctx,
		buildApplyElementSpecArgs,
		createApplyElementSpecSummary(params),
	);
}

export function formatApplyElementSpecResult(result: AscetApplyElementSpecResult): string {
	return formatAscetEditOperationResult("apply_element_spec", result);
}

import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export interface AscetApplyProjectFormulaParams extends AscetEditControlParams {
	projectPath: string;
	specFile: string;
	mode?: "restore";
	deleteMissing?: boolean;
}

export type RunAscetApplyProjectFormulaOptions = RunAscetEditOperationOptions;
export type AscetApplyProjectFormulaResult = AscetCliJsonResult;

export const ascetApplyProjectFormulaParameters = Type.Object({
	projectPath: Type.String({ description: "ASCET project path.", minLength: 1 }),
	specFile: Type.String({ description: "Path to project formula spec JSON file.", minLength: 1 }),
	mode: Type.Optional(Type.Literal("restore")),
	deleteMissing: Type.Optional(Type.Boolean()),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildApplyProjectFormulaArgs(params: AscetApplyProjectFormulaParams): string[] {
	const args = ["exec", "apply_project_formula", normalizeAscetPath(params.projectPath), params.specFile];
	if (params.mode) {
		args.push("--mode", params.mode);
	}
	if (params.deleteMissing) {
		args.push("--delete-missing");
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createApplyProjectFormulaSummary(params: AscetApplyProjectFormulaParams): string {
	return createAscetEditSummary("apply_project_formula", {
		projectPath: params.projectPath,
		specFile: params.specFile,
		mode: params.mode ?? "",
		deleteMissing: params.deleteMissing === true,
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetApplyProjectFormula(
	params: AscetApplyProjectFormulaParams,
	options: RunAscetApplyProjectFormulaOptions,
): Promise<AscetApplyProjectFormulaResult> {
	return runAscetCliJson(buildApplyProjectFormulaArgs(params), options);
}

export async function runApprovedAscetApplyProjectFormula(
	params: AscetApplyProjectFormulaParams,
	options: RunAscetApplyProjectFormulaOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetApplyProjectFormulaResult> {
	return runApprovedAscetEditOperation(
		"apply_project_formula",
		params,
		options,
		ctx,
		buildApplyProjectFormulaArgs,
		createApplyProjectFormulaSummary(params),
	);
}

export function formatApplyProjectFormulaResult(result: AscetApplyProjectFormulaResult): string {
	return formatAscetEditOperationResult("apply_project_formula", result);
}

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
import type { AscetElementInput } from "./element-spec-contract.ts";

export type {
	AscetApplyElementCommitParams,
	AscetApplyElementPlanParams,
	AscetElementInput,
} from "./element-spec-contract.ts";
export { ascetApplyElementSpecParameters } from "./element-spec-contract.ts";

/** Internal runner parameters. Model-facing calls use the plan/commit schema exported above. */
export interface AscetApplyElementSpecParams extends AscetEditControlParams {
	componentPath: string;
	specFile: string;
	projectPath?: string;
	mode?: "restore";
	intent?: "create" | "patch" | "upsert" | "restore";
	elements?: AscetElementInput[];
	deleteMissing?: boolean;
	recreateIncompatible?: boolean;
}

export type RunAscetApplyElementSpecOptions = RunAscetEditOperationOptions;
export type AscetApplyElementSpecResult = AscetCliJsonResult;

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
	return createAscetEditSummary("apply_element_spec", {
		componentPath: params.componentPath,
		intent: params.intent ?? (params.mode === "restore" ? "restore" : "internal-spec"),
		elements: params.elements?.length ?? "resolved from internal spec",
		projectPath: params.projectPath ?? "",
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

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

export interface AscetDeleteComponentParams extends AscetEditControlParams {
	componentPath: string;
	ifMissing?: "fail" | "ignore";
}

export type RunAscetDeleteComponentOptions = RunAscetEditOperationOptions;
export type AscetDeleteComponentResult = AscetCliJsonResult;

export const ascetDeleteComponentParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path to delete.", minLength: 1 }),
	ifMissing: ifMissingSchema,
	intent: Type.Literal("apply"),
});

export function buildDeleteComponentArgs(params: AscetDeleteComponentParams): string[] {
	const args = ["exec", "delete_component", normalizeAscetPath(params.componentPath)];
	if (params.ifMissing) {
		args.push("--if-missing", params.ifMissing);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createDeleteComponentSummary(params: AscetDeleteComponentParams): string {
	return createAscetEditSummary("delete_component", {
		componentPath: params.componentPath,
		ifMissing: params.ifMissing ?? "fail",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetDeleteComponent(
	params: AscetDeleteComponentParams,
	options: RunAscetDeleteComponentOptions,
): Promise<AscetDeleteComponentResult> {
	return runAscetCliJson(buildDeleteComponentArgs(params), options);
}

export async function runApprovedAscetDeleteComponent(
	params: AscetDeleteComponentParams,
	options: RunAscetDeleteComponentOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetDeleteComponentResult> {
	return runApprovedAscetEditOperation(
		"delete_component",
		params,
		options,
		ctx,
		buildDeleteComponentArgs,
		createDeleteComponentSummary(params),
		"Confirm ASCET component deletion",
	);
}

export function formatDeleteComponentResult(result: AscetDeleteComponentResult): string {
	return formatAscetEditOperationResult("delete_component", result);
}

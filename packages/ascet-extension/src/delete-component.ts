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

export interface AscetDeleteComponentParams extends AscetWriteControlParams {
	componentPath: string;
	ifMissing?: "fail" | "ignore";
}

export type RunAscetDeleteComponentOptions = RunAscetWriteOperationOptions;
export type AscetDeleteComponentResult = AscetCliJsonResult;

export const ascetDeleteComponentParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path to delete.", minLength: 1 }),
	ifMissing: ifMissingSchema,
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildDeleteComponentArgs(params: AscetDeleteComponentParams): string[] {
	const args = ["exec", "delete_component", normalizeAscetPath(params.componentPath)];
	if (params.ifMissing) {
		args.push("--if-missing", params.ifMissing);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createDeleteComponentSummary(params: AscetDeleteComponentParams): string {
	return createWriteSummary("delete_component", {
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
	ctx: AscetWriteApprovalContext,
): Promise<AscetDeleteComponentResult> {
	return runApprovedAscetWriteOperation(
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
	return formatWriteOperationResult("delete_component", result);
}

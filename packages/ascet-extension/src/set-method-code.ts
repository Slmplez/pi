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

export interface AscetSetMethodCodeParams extends AscetEditControlParams {
	componentPath: string;
	methodName: string;
	codeFile: string;
}

export type RunAscetSetMethodCodeOptions = RunAscetEditOperationOptions;
export type AscetSetMethodCodeResult = AscetCliJsonResult;

export const ascetSetMethodCodeParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name.", minLength: 1 }),
	codeFile: Type.String({ description: "Path to replacement method code file.", minLength: 1 }),
	intent: Type.Literal("apply"),
});

export function buildSetMethodCodeArgs(params: AscetSetMethodCodeParams): string[] {
	return appendVerifyAndJson(
		["exec", "set_method_code", normalizeAscetPath(params.componentPath), params.methodName, params.codeFile],
		params.verifyReadback,
	);
}

export function createSetMethodCodeSummary(params: AscetSetMethodCodeParams): string {
	return createAscetEditSummary("set_method_code", {
		componentPath: params.componentPath,
		methodName: params.methodName,
		codeFile: params.codeFile,
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetMethodCode(
	params: AscetSetMethodCodeParams,
	options: RunAscetSetMethodCodeOptions,
): Promise<AscetSetMethodCodeResult> {
	return runAscetCliJson(buildSetMethodCodeArgs(params), options);
}

export async function runApprovedAscetSetMethodCode(
	params: AscetSetMethodCodeParams,
	options: RunAscetSetMethodCodeOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetSetMethodCodeResult> {
	return runApprovedAscetEditOperation(
		"set_method_code",
		params,
		options,
		ctx,
		buildSetMethodCodeArgs,
		createSetMethodCodeSummary(params),
	);
}

export function formatSetMethodCodeResult(result: AscetSetMethodCodeResult): string {
	return formatAscetEditOperationResult("set_method_code", result);
}

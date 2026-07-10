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

export interface AscetSetMethodCodeParams extends AscetWriteControlParams {
	componentPath: string;
	methodName: string;
	codeFile: string;
}

export type RunAscetSetMethodCodeOptions = RunAscetWriteOperationOptions;
export type AscetSetMethodCodeResult = AscetCliJsonResult;

export const ascetSetMethodCodeParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name.", minLength: 1 }),
	codeFile: Type.String({ description: "Path to replacement method code file.", minLength: 1 }),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildSetMethodCodeArgs(params: AscetSetMethodCodeParams): string[] {
	return appendVerifyAndJson(
		["exec", "set_method_code", normalizeAscetPath(params.componentPath), params.methodName, params.codeFile],
		params.verifyReadback,
	);
}

export function createSetMethodCodeSummary(params: AscetSetMethodCodeParams): string {
	return createWriteSummary("set_method_code", {
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
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetMethodCodeResult> {
	return runApprovedAscetWriteOperation(
		"set_method_code",
		params,
		options,
		ctx,
		buildSetMethodCodeArgs,
		createSetMethodCodeSummary(params),
	);
}

export function formatSetMethodCodeResult(result: AscetSetMethodCodeResult): string {
	return formatWriteOperationResult("set_method_code", result);
}

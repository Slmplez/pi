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

export type AscetSetModuleCodeOperation = "set-method" | "set-header" | "set-external-c-code";

export interface AscetSetModuleCodeParams extends AscetEditControlParams {
	modulePath: string;
	operation: AscetSetModuleCodeOperation;
	methodName?: string;
	codeFile: string;
}

export type RunAscetSetModuleCodeOptions = RunAscetEditOperationOptions;
export type AscetSetModuleCodeResult = AscetCliJsonResult;

export const ascetSetModuleCodeParameters = Type.Object({
	modulePath: Type.String({ description: "ASCET module path.", minLength: 1 }),
	operation: Type.Union([Type.Literal("set-method"), Type.Literal("set-header"), Type.Literal("set-external-c-code")]),
	methodName: Type.Optional(Type.String({ description: "Method name for set-method operations." })),
	codeFile: Type.String({ description: "Path to replacement code file.", minLength: 1 }),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildSetModuleCodeArgs(params: AscetSetModuleCodeParams): string[] {
	const args = ["exec", "set_module_code", normalizeAscetPath(params.modulePath), params.operation];
	if (params.methodName) {
		args.push(params.methodName);
	}
	args.push(params.codeFile);
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createSetModuleCodeSummary(params: AscetSetModuleCodeParams): string {
	return createAscetEditSummary("set_module_code", {
		modulePath: params.modulePath,
		operation: params.operation,
		methodName: params.methodName ?? "",
		codeFile: params.codeFile,
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetModuleCode(
	params: AscetSetModuleCodeParams,
	options: RunAscetSetModuleCodeOptions,
): Promise<AscetSetModuleCodeResult> {
	return runAscetCliJson(buildSetModuleCodeArgs(params), options);
}

export async function runApprovedAscetSetModuleCode(
	params: AscetSetModuleCodeParams,
	options: RunAscetSetModuleCodeOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetSetModuleCodeResult> {
	return runApprovedAscetEditOperation(
		"set_module_code",
		params,
		options,
		ctx,
		buildSetModuleCodeArgs,
		createSetModuleCodeSummary(params),
	);
}

export function formatSetModuleCodeResult(result: AscetSetModuleCodeResult): string {
	return formatAscetEditOperationResult("set_module_code", result);
}

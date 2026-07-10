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

export type AscetSetModuleCodeOperation = "set-method" | "set-header" | "set-external-c-code";

export interface AscetSetModuleCodeParams extends AscetWriteControlParams {
	modulePath: string;
	operation: AscetSetModuleCodeOperation;
	methodName?: string;
	codeFile: string;
}

export type RunAscetSetModuleCodeOptions = RunAscetWriteOperationOptions;
export type AscetSetModuleCodeResult = AscetCliJsonResult;

export const ascetSetModuleCodeParameters = Type.Object({
	modulePath: Type.String({ description: "ASCET module path.", minLength: 1 }),
	operation: Type.Union([Type.Literal("set-method"), Type.Literal("set-header"), Type.Literal("set-external-c-code")]),
	methodName: Type.Optional(Type.String({ description: "Method name for set-method operations." })),
	codeFile: Type.String({ description: "Path to replacement code file.", minLength: 1 }),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
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
	return createWriteSummary("set_module_code", {
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
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetModuleCodeResult> {
	return runApprovedAscetWriteOperation(
		"set_module_code",
		params,
		options,
		ctx,
		buildSetModuleCodeArgs,
		createSetModuleCodeSummary(params),
	);
}

export function formatSetModuleCodeResult(result: AscetSetModuleCodeResult): string {
	return formatWriteOperationResult("set_module_code", result);
}

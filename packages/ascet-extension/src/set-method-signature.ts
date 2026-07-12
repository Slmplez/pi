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

export interface AscetSetMethodSignatureParams extends AscetWriteControlParams {
	componentPath: string;
	methodName: string;
	returnType: "cont" | "sdisc" | "udisc" | "log";
	ifReturnExists?: "fail" | "keep" | "replace";
}

export type RunAscetSetMethodSignatureOptions = RunAscetWriteOperationOptions;
export type AscetSetMethodSignatureResult = AscetCliJsonResult;

export const ascetSetMethodSignatureParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name whose return signature should be set.", minLength: 1 }),
	returnType: Type.Union([Type.Literal("cont"), Type.Literal("sdisc"), Type.Literal("udisc"), Type.Literal("log")]),
	ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
	verifyReadback: Type.Optional(
		Type.Boolean({ description: "Ask the ASCET CLI to verify return signature readback after writing." }),
	),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildSetMethodSignatureArgs(params: AscetSetMethodSignatureParams): string[] {
	const args = [
		"exec",
		"set_method_signature",
		normalizeAscetPath(params.componentPath),
		params.methodName,
		"--return-type",
		params.returnType,
	];
	if (params.ifReturnExists) {
		args.push("--if-return-exists", params.ifReturnExists);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createSetMethodSignatureSummary(params: AscetSetMethodSignatureParams): string {
	return createWriteSummary("set_method_signature", {
		componentPath: params.componentPath,
		methodName: params.methodName,
		returnType: params.returnType,
		ifReturnExists: params.ifReturnExists ?? "fail",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetMethodSignature(
	params: AscetSetMethodSignatureParams,
	options: RunAscetSetMethodSignatureOptions,
): Promise<AscetSetMethodSignatureResult> {
	return runAscetCliJson(buildSetMethodSignatureArgs(params), {
		...options,
		toolName: "ascet_write",
		commandId: "set_method_signature",
		jobKind: "write",
	});
}

export async function runApprovedAscetSetMethodSignature(
	params: AscetSetMethodSignatureParams,
	options: RunAscetSetMethodSignatureOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetMethodSignatureResult> {
	return runApprovedAscetWriteOperation(
		"set_method_signature",
		params,
		options,
		ctx,
		buildSetMethodSignatureArgs,
		createSetMethodSignatureSummary(params),
		"Confirm ASCET method return signature write",
	);
}

export function formatSetMethodSignatureResult(result: AscetSetMethodSignatureResult): string {
	return formatWriteOperationResult("set_method_signature", result);
}

import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { withInlineCodeFile } from "./core/temp-files.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export interface AscetSetMethodSignatureParams extends AscetEditControlParams {
	componentPath: string;
	methodName: string;
	returnType?: AscetPrimitiveSignatureType;
	ifReturnExists?: "fail" | "keep" | "replace";
	arguments?: AscetMethodSignatureArgument[];
}

export type RunAscetSetMethodSignatureOptions = RunAscetEditOperationOptions;
export type AscetSetMethodSignatureResult = AscetCliJsonResult;
export type AscetPrimitiveSignatureType = "cont" | "sdisc" | "udisc" | "log";

export interface AscetMethodSignatureArgument {
	name: string;
	type: AscetPrimitiveSignatureType;
	ifExists?: "fail" | "keep" | "replace";
}

const primitiveSignatureType = Type.Union([
	Type.Literal("cont"),
	Type.Literal("sdisc"),
	Type.Literal("udisc"),
	Type.Literal("log"),
]);

const methodSignatureArgumentSchema = Type.Object({
	name: Type.String({ description: "Method argument name.", minLength: 1 }),
	type: primitiveSignatureType,
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
});

export const ascetSetMethodSignatureParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name whose signature should be patched.", minLength: 1 }),
	returnType: Type.Optional(primitiveSignatureType),
	ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
	arguments: Type.Optional(Type.Array(methodSignatureArgumentSchema)),
	intent: Type.Literal("apply"),
});

export function buildSetMethodSignatureArgs(
	params: AscetSetMethodSignatureParams,
	signatureJsonFile?: string,
): string[] {
	const args = ["exec", "set_method_signature", normalizeAscetPath(params.componentPath), params.methodName];
	if (signatureJsonFile) {
		args.push("--signature-json", signatureJsonFile);
	} else if (params.returnType) {
		args.push("--return-type", params.returnType);
	}
	if (params.ifReturnExists && !signatureJsonFile) {
		args.push("--if-return-exists", params.ifReturnExists);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createMethodSignatureSpec(params: AscetSetMethodSignatureParams): Record<string, unknown> {
	return {
		...(params.returnType ? { returnType: params.returnType } : {}),
		...(params.ifReturnExists ? { ifReturnExists: params.ifReturnExists } : {}),
		...(params.arguments ? { arguments: params.arguments } : {}),
	};
}

export function createSetMethodSignatureSummary(params: AscetSetMethodSignatureParams): string {
	return createAscetEditSummary("set_method_signature", {
		componentPath: params.componentPath,
		methodName: params.methodName,
		returnType: params.returnType ?? "",
		ifReturnExists: params.ifReturnExists ?? "fail",
		argumentCount: params.arguments?.length ?? 0,
		verifyReadback: params.verifyReadback === true,
	});
}

function needsSignatureJson(params: AscetSetMethodSignatureParams): boolean {
	return (params.arguments?.length ?? 0) > 0;
}

export async function runAscetSetMethodSignature(
	params: AscetSetMethodSignatureParams,
	options: RunAscetSetMethodSignatureOptions,
): Promise<AscetSetMethodSignatureResult> {
	if (needsSignatureJson(params)) {
		return withInlineCodeFile(
			{
				code: JSON.stringify(createMethodSignatureSpec(params), null, 2),
				prefix: "set_method_signature",
			},
			(signatureJsonFile) =>
				runAscetCliJson(buildSetMethodSignatureArgs(params, signatureJsonFile), {
					...options,
					toolName: "ascet_edit",
					commandId: "set_method_signature",
					jobKind: "write",
				}),
		);
	}
	return runAscetCliJson(buildSetMethodSignatureArgs(params), {
		...options,
		toolName: "ascet_edit",
		commandId: "set_method_signature",
		jobKind: "write",
	});
}

export async function runApprovedAscetSetMethodSignature(
	params: AscetSetMethodSignatureParams,
	options: RunAscetSetMethodSignatureOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetSetMethodSignatureResult> {
	if (needsSignatureJson(params)) {
		return withInlineCodeFile(
			{
				code: JSON.stringify(createMethodSignatureSpec(params), null, 2),
				prefix: "set_method_signature",
			},
			(signatureJsonFile) =>
				runApprovedAscetEditOperation(
					"set_method_signature",
					params,
					options,
					ctx,
					(p) => buildSetMethodSignatureArgs(p, signatureJsonFile),
					createSetMethodSignatureSummary(params),
					"Confirm ASCET method signature write",
				),
		);
	}
	return runApprovedAscetEditOperation(
		"set_method_signature",
		params,
		options,
		ctx,
		buildSetMethodSignatureArgs,
		createSetMethodSignatureSummary(params),
		"Confirm ASCET method signature write",
	);
}

export function formatSetMethodSignatureResult(result: AscetSetMethodSignatureResult): string {
	return formatAscetEditOperationResult("set_method_signature", result);
}

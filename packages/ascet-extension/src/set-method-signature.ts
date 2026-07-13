import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { withInlineCodeFile } from "./core/temp-files.ts";
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
	returnType?: AscetPrimitiveSignatureType;
	ifReturnExists?: "fail" | "keep" | "replace";
	arguments?: AscetMethodSignatureArgument[];
}

export type RunAscetSetMethodSignatureOptions = RunAscetWriteOperationOptions;
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
	verifyReadback: Type.Optional(
		Type.Boolean({ description: "Ask the ASCET CLI to verify method signature readback after writing." }),
	),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
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
	return createWriteSummary("set_method_signature", {
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
					toolName: "ascet_write",
					commandId: "set_method_signature",
					jobKind: "write",
				}),
		);
	}
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
	if (needsSignatureJson(params)) {
		return withInlineCodeFile(
			{
				code: JSON.stringify(createMethodSignatureSpec(params), null, 2),
				prefix: "set_method_signature",
			},
			(signatureJsonFile) =>
				runApprovedAscetWriteOperation(
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
	return runApprovedAscetWriteOperation(
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
	return formatWriteOperationResult("set_method_signature", result);
}

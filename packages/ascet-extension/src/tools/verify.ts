import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatVerifyReadbackResult, runAscetVerifyReadback } from "../verify-readback.ts";

export type AscetVerifyParams =
	| { action: "readback"; objectKind: "class" | "module" | "statemachine"; componentPath: string }
	| { action: "readback"; objectKind: "project"; projectPath: string };

export interface RunAscetVerifyOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetVerifyParameters = Type.Object({
	action: Type.Literal("readback"),
	objectKind: Type.Union([
		Type.Literal("class"),
		Type.Literal("module"),
		Type.Literal("statemachine"),
		Type.Literal("project"),
	]),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	projectPath: Type.Optional(Type.String({ minLength: 1 })),
});

export async function runAscetVerify(
	params: AscetVerifyParams,
	options: RunAscetVerifyOptions,
): Promise<AscetCliJsonResult> {
	return runAscetVerifyReadback(params, options);
}

export function formatAscetVerifyResult(result: AscetCliJsonResult): string {
	return formatVerifyReadbackResult(result);
}

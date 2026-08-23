import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadMethodSignatureParams {
	componentPath: string;
	methodName: string;
}

export interface RunAscetReadMethodSignatureOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadMethodSignatureResult = AscetCliJsonResult;

export const ascetReadMethodSignatureParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name, for example calc.", minLength: 1 }),
});

export function buildReadMethodSignatureArgs(params: AscetReadMethodSignatureParams): string[] {
	return ["exec", "read_method_signature", params.componentPath, params.methodName, "--json"];
}

export async function runAscetReadMethodSignature(
	params: AscetReadMethodSignatureParams,
	options: RunAscetReadMethodSignatureOptions,
): Promise<AscetReadMethodSignatureResult> {
	return runAscetCliJson(buildReadMethodSignatureArgs(params), options);
}

export function formatReadMethodSignatureResult(result: AscetReadMethodSignatureResult): string {
	return formatAscetCliJsonResult("read_method_signature", result, { largeSuccess: "inline" });
}

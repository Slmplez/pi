import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadMethodCodeParams {
	componentPath: string;
	methodName: string;
}

export interface RunAscetReadMethodCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadMethodCodeResult = AscetCliJsonResult;

export const ascetReadMethodCodeParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name, for example calc.", minLength: 1 }),
});

export function buildReadMethodCodeArgs(params: AscetReadMethodCodeParams): string[] {
	return ["exec", "read_method_code", params.componentPath, params.methodName, "--json"];
}

export async function runAscetReadMethodCode(
	params: AscetReadMethodCodeParams,
	options: RunAscetReadMethodCodeOptions,
): Promise<AscetReadMethodCodeResult> {
	return runAscetCliJson(buildReadMethodCodeArgs(params), options);
}

export function formatReadMethodCodeResult(result: AscetReadMethodCodeResult): string {
	return formatAscetCliJsonResult("read_method_code", result);
}

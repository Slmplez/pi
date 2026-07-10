import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetListMethodsParams {
	componentPath: string;
}

export interface RunAscetListMethodsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetListMethodsResult = AscetCliJsonResult;

export const ascetListMethodsParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
});

export function buildListMethodsArgs(params: AscetListMethodsParams): string[] {
	return ["exec", "list_methods", params.componentPath, "--json"];
}

export async function runAscetListMethods(
	params: AscetListMethodsParams,
	options: RunAscetListMethodsOptions,
): Promise<AscetListMethodsResult> {
	return runAscetCliJson(buildListMethodsArgs(params), options);
}

export function formatListMethodsResult(result: AscetListMethodsResult): string {
	return formatAscetCliJsonResult("list_methods", result);
}

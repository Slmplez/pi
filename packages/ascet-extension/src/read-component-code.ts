import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadComponentCodeParams {
	componentPath: string;
}

export interface RunAscetReadComponentCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadComponentCodeResult = AscetCliJsonResult;

export const ascetReadComponentCodeParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
});

export function buildReadComponentCodeArgs(params: AscetReadComponentCodeParams): string[] {
	return ["exec", "read_component_code", normalizeAscetPath(params.componentPath), "--json"];
}

export async function runAscetReadComponentCode(
	params: AscetReadComponentCodeParams,
	options: RunAscetReadComponentCodeOptions,
): Promise<AscetReadComponentCodeResult> {
	return runAscetCliJson(buildReadComponentCodeArgs(params), options);
}

export function formatReadComponentCodeResult(result: AscetReadComponentCodeResult): string {
	return formatAscetCliJsonResult("read_component_code", result);
}

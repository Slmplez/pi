import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadElementRefsParams {
	componentPath: string;
	elementName: string;
}

export interface RunAscetReadElementRefsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadElementRefsResult = AscetCliJsonResult;

export const ascetReadElementRefsParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	elementName: Type.String({ description: "Element name inside the component, for example pid_kp.", minLength: 1 }),
});

export function buildReadElementRefsArgs(params: AscetReadElementRefsParams): string[] {
	return ["exec", "read_element_refs", params.componentPath, params.elementName, "--json"];
}

export async function runAscetReadElementRefs(
	params: AscetReadElementRefsParams,
	options: RunAscetReadElementRefsOptions,
): Promise<AscetReadElementRefsResult> {
	return runAscetCliJson(buildReadElementRefsArgs(params), options);
}

export function formatReadElementRefsResult(result: AscetReadElementRefsResult): string {
	return formatAscetCliJsonResult("read_element_refs", result);
}

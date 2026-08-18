import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadComponentSummaryParams {
	componentPath: string;
	detailLevel?: "summary" | "topology";
}

export interface RunAscetReadComponentSummaryOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetReadComponentSummaryParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
});

export function buildReadComponentSummaryArgs(params: AscetReadComponentSummaryParams): string[] {
	return ["exec", "read_component_summary", params.componentPath, "--json"];
}

export async function runAscetReadComponentSummary(
	params: AscetReadComponentSummaryParams,
	options: RunAscetReadComponentSummaryOptions,
): Promise<AscetCliJsonResult> {
	return runAscetCliJson(buildReadComponentSummaryArgs(params), options);
}

export function formatReadComponentSummaryResult(result: AscetCliJsonResult): string {
	return formatAscetCliJsonResult("read_component_summary", result, { largeSuccess: "inline" });
}

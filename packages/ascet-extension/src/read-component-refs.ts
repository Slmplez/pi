import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadComponentRefsParams {
	componentPath: string;
	direction?: "out" | "both";
	depth?: number;
}

export interface RunAscetReadComponentRefsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadComponentRefsResult = AscetCliJsonResult;

export const ascetReadComponentRefsParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	direction: Type.Optional(Type.Union([Type.Literal("out"), Type.Literal("both")])),
	depth: Type.Optional(Type.Number({ minimum: 1 })),
});

export function buildReadComponentRefsArgs(params: AscetReadComponentRefsParams): string[] {
	const args = ["exec", "read_component_refs", normalizeAscetPath(params.componentPath)];
	if (params.direction) {
		args.push("--direction", params.direction);
	}
	if (params.depth !== undefined) {
		args.push("--depth", String(params.depth));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadComponentRefs(
	params: AscetReadComponentRefsParams,
	options: RunAscetReadComponentRefsOptions,
): Promise<AscetReadComponentRefsResult> {
	return runAscetCliJson(buildReadComponentRefsArgs(params), options);
}

export function formatReadComponentRefsResult(result: AscetReadComponentRefsResult): string {
	return formatAscetCliJsonResult("read_component_refs", result);
}

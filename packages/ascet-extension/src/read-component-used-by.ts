import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadComponentUsedByParams {
	componentPath: string;
	scopePath: string;
	kind?: "class" | "module" | "statemachine";
	limit?: number;
}

export interface RunAscetReadComponentUsedByOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadComponentUsedByResult = AscetCliJsonResult;

export const ascetReadComponentUsedByParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	scopePath: Type.String({ description: "Bounded ASCET folder scope for reverse-reference scan.", minLength: 1 }),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	limit: Type.Optional(Type.Number({ minimum: 1 })),
});

export function buildReadComponentUsedByArgs(params: AscetReadComponentUsedByParams): string[] {
	const args = [
		"exec",
		"read_component_used_by",
		normalizeAscetPath(params.componentPath),
		"--scope",
		normalizeAscetPath(params.scopePath),
	];
	if (params.kind) {
		args.push("--kind", params.kind);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadComponentUsedBy(
	params: AscetReadComponentUsedByParams,
	options: RunAscetReadComponentUsedByOptions,
): Promise<AscetReadComponentUsedByResult> {
	return runAscetCliJson(buildReadComponentUsedByArgs(params), options);
}

export function formatReadComponentUsedByResult(result: AscetReadComponentUsedByResult): string {
	return formatAscetCliJsonResult("read_component_used_by", result);
}

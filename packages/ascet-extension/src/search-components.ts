import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetSearchComponentsParams {
	query: string;
	scopePath?: string;
	kind?: "class" | "module" | "statemachine";
	match?: "exact" | "glob" | "contains";
	limit?: number;
	cursor?: string;
}

export interface RunAscetSearchComponentsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetSearchComponentsResult = AscetCliJsonResult;

export const ascetSearchComponentsParameters = Type.Object({
	query: Type.String({ description: "Component name or pattern to search.", minLength: 1 }),
	scopePath: Type.Optional(Type.String({ description: "ASCET folder scope, for example DEMO." })),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
	cursor: Type.Optional(Type.String()),
});

export function buildSearchComponentsArgs(params: AscetSearchComponentsParams): string[] {
	const args = ["exec", "search_components", params.query];
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.kind) {
		args.push("--kind", params.kind);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	args.push("--json");
	return args;
}

export async function runAscetSearchComponents(
	params: AscetSearchComponentsParams,
	options: RunAscetSearchComponentsOptions,
): Promise<AscetSearchComponentsResult> {
	return runAscetCliJson(buildSearchComponentsArgs(params), options);
}

export function formatSearchComponentsResult(result: AscetSearchComponentsResult): string {
	return formatAscetCliJsonResult("search_components", result);
}

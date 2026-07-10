import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetSearchElementsParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	group?: "all" | "primitive" | "complex" | "referenced";
	kind?: string;
	match?: "exact" | "glob" | "contains";
	limit?: number;
	cursor?: string;
}

export interface RunAscetSearchElementsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetSearchElementsResult = AscetCliJsonResult;

export const ascetSearchElementsParameters = Type.Object({
	query: Type.String({ description: "Element name or pattern to search.", minLength: 1 }),
	componentPath: Type.Optional(Type.String({ description: "Known ASCET component path, for example DEMO\\PID." })),
	scopePath: Type.Optional(Type.String({ description: "ASCET folder scope when componentPath is unknown." })),
	group: Type.Optional(
		Type.Union([Type.Literal("all"), Type.Literal("primitive"), Type.Literal("complex"), Type.Literal("referenced")]),
	),
	kind: Type.Optional(Type.String({ description: "Optional backend element kind filter." })),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
	cursor: Type.Optional(Type.String()),
});

export function buildSearchElementsArgs(params: AscetSearchElementsParams): string[] {
	const args = ["exec", "search_elements", params.query];
	if (params.componentPath) {
		args.push("--component", params.componentPath);
	}
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.group) {
		args.push("--group", params.group);
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

export async function runAscetSearchElements(
	params: AscetSearchElementsParams,
	options: RunAscetSearchElementsOptions,
): Promise<AscetSearchElementsResult> {
	return runAscetCliJson(buildSearchElementsArgs(params), options);
}

export function formatSearchElementsResult(result: AscetSearchElementsResult): string {
	return formatAscetCliJsonResult("search_elements", result);
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { inferComponentPathFromScope } from "./search-scope.ts";

export interface AscetSearchOccurrencesParams {
	query: string;
	target?: "component" | "element";
	componentPath?: string;
	scopePath?: string;
	match?: "exact" | "glob" | "contains";
	limit?: number;
	cursor?: string;
}

export interface RunAscetSearchOccurrencesOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetSearchOccurrencesResult = AscetCliJsonResult;

export const ascetSearchOccurrencesParameters = Type.Object({
	query: Type.String({ description: "Occurrence query for component or element matches.", minLength: 1 }),
	target: Type.Optional(Type.Union([Type.Literal("component"), Type.Literal("element")])),
	componentPath: Type.Optional(Type.String({ description: "Known ASCET component path, for example DEMO\\PID." })),
	scopePath: Type.Optional(Type.String({ description: "ASCET folder scope when componentPath is unknown." })),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
	cursor: Type.Optional(Type.String()),
});

export function buildSearchOccurrencesArgs(params: AscetSearchOccurrencesParams): string[] {
	const args = ["exec", "search_occurrences", params.query];
	if (params.target) {
		args.push("--target", params.target);
	}
	const componentPath = params.componentPath ?? inferComponentPathFromScope(params);
	if (componentPath) {
		args.push("--component", componentPath);
	}
	if (params.scopePath && !componentPath) {
		args.push("--scope", params.scopePath);
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

export async function runAscetSearchOccurrences(
	params: AscetSearchOccurrencesParams,
	options: RunAscetSearchOccurrencesOptions,
): Promise<AscetSearchOccurrencesResult> {
	return runAscetCliJson(buildSearchOccurrencesArgs(params), options);
}

function withCompactOccurrenceItems(result: AscetSearchOccurrencesResult): AscetSearchOccurrencesResult {
	const data = result.data;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return result;
	}
	const envelope = data as { result?: unknown };
	const payload = envelope.result;
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return result;
	}
	const record = payload as { occurrences?: unknown; matches?: unknown; items?: unknown };
	if (!Array.isArray(record.occurrences) || record.matches !== undefined || record.items !== undefined) {
		return result;
	}
	const { occurrences: _occurrences, ...rest } = record as Record<string, unknown>;
	return {
		...result,
		data: {
			...(data as Record<string, unknown>),
			result: {
				...rest,
				matches: record.occurrences,
			},
		},
	};
}

export function formatSearchOccurrencesResult(result: AscetSearchOccurrencesResult): string {
	return formatAscetCliJsonResult("search_occurrences", withCompactOccurrenceItems(result));
}

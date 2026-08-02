import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { getAscetSearchIndexState, isUsableSqliteSearchResult, queryAscetComponentIndex } from "./search-index.ts";

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

function isSearchIndexDisabled(env: Record<string, string | undefined> | undefined): boolean {
	return (env?.PI_ASCET_SEARCH_INDEX ?? process.env.PI_ASCET_SEARCH_INDEX) === "0";
}

function getIndexedMatchCount(result: AscetCliJsonResult): number {
	const data = result.data;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return 0;
	}
	const payload = (data as { result?: unknown }).result;
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return 0;
	}
	const matches = (payload as { matches?: unknown }).matches;
	return Array.isArray(matches) ? matches.length : 0;
}

function canUseComponentIndexResult(result: AscetCliJsonResult): boolean {
	if (isUsableSqliteSearchResult(result)) {
		return true;
	}
	const state = getAscetSearchIndexState();
	if (!result.ok || state.status !== "ready") {
		return false;
	}
	return state.scanComplete || getIndexedMatchCount(result) > 0;
}

function buildSearchIndexUnavailableResult(
	params: AscetSearchComponentsParams,
	options: RunAscetSearchComponentsOptions,
): AscetCliJsonResult {
	const error = {
		code: "search_index_unavailable",
		message: "search_components requires a ready ASCET SQLite P0 search index.",
	};
	const data = {
		ok: false,
		result: null,
		error,
		meta: {
			mode: "index",
			operation: "search_components",
		},
	};
	return {
		ok: false,
		data,
		request: {
			cwd: options.cwd,
			cliPath: "quick_search_index",
			args: ["index", "search_components", params.query],
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: null,
		timedOut: false,
		error,
	};
}

export async function runAscetSearchComponents(
	params: AscetSearchComponentsParams,
	options: RunAscetSearchComponentsOptions,
): Promise<AscetSearchComponentsResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetComponentIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed && canUseComponentIndexResult(indexed)) {
			return indexed;
		}

		return buildSearchIndexUnavailableResult(params, options);
	}

	return runAscetCliJson(buildSearchComponentsArgs(params), options);
}

export function formatSearchComponentsResult(result: AscetSearchComponentsResult): string {
	return formatAscetCliJsonResult("search_components", result);
}

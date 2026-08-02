import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import {
	ensureAscetSearchIndex,
	getAscetSearchIndexState,
	isUsableSqliteSearchResult,
	queryAscetSearchIndex,
} from "./search-index.ts";
import { inferComponentPathFromScope } from "./search-scope.ts";

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
	const componentPath = params.componentPath ?? inferComponentPathFromScope(params);
	if (componentPath) {
		args.push("--component", componentPath);
	}
	if (params.scopePath && !componentPath) {
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

function toIndexedSearchParams(params: AscetSearchElementsParams): AscetSearchElementsParams {
	const componentPath = params.componentPath ?? inferComponentPathFromScope(params);
	if (!componentPath) {
		return params;
	}
	return {
		...params,
		componentPath,
		scopePath: undefined,
	};
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

function canUseSearchIndexResult(result: AscetCliJsonResult): boolean {
	if (isUsableSqliteSearchResult(result)) {
		return true;
	}
	const state = getAscetSearchIndexState();
	if (!result.ok || state.status !== "ready") {
		return false;
	}
	return state.scanComplete || getIndexedMatchCount(result) > 0;
}

export async function runAscetSearchElements(
	params: AscetSearchElementsParams,
	options: RunAscetSearchElementsOptions,
): Promise<AscetSearchElementsResult> {
	const indexedParams = toIndexedSearchParams(params);
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetSearchIndex(indexedParams, { cwd: options.cwd, env: options.env });
		if (indexed && canUseSearchIndexResult(indexed)) {
			return indexed;
		}

		const warmup = await ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			partition: "element_decls",
			componentPath: indexedParams.componentPath,
			forceRefresh: Boolean(indexedParams.componentPath),
			maxComponents: 50,
			scanTimeoutMs: Math.min(options.timeoutMs ?? 60_000, 15_000),
			executeCli: options.executeCli,
			toolName: "ascet_search",
		});
		if (warmup.ok) {
			const warmed = queryAscetSearchIndex(indexedParams, { cwd: options.cwd, env: options.env });
			if (warmed && canUseSearchIndexResult(warmed)) {
				return warmed;
			}
		}
	}

	return runAscetCliJson(buildSearchElementsArgs(params), options);
}

export function formatSearchElementsResult(result: AscetSearchElementsResult): string {
	return formatAscetCliJsonResult("search_elements", result);
}

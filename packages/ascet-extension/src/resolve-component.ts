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
	queryAscetComponentIndex,
} from "./search-index.ts";

export interface AscetResolveComponentParams {
	query: string;
	scopePath?: string;
	kind?: "class" | "module" | "statemachine";
	match?: "exact" | "glob" | "contains";
	limit?: number;
}

export interface RunAscetResolveComponentOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetResolveComponentResult = AscetCliJsonResult;

export const ascetResolveComponentParameters = Type.Object({
	query: Type.String({ description: "Component name, path, or pattern to resolve.", minLength: 1 }),
	scopePath: Type.Optional(Type.String({ description: "Folder scope, for example DEMO." })),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
});

export function buildResolveComponentArgs(params: AscetResolveComponentParams): string[] {
	const args = ["exec", "resolve_component", params.query];
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

export async function runAscetResolveComponent(
	params: AscetResolveComponentParams,
	options: RunAscetResolveComponentOptions,
): Promise<AscetResolveComponentResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetComponentIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed && canUseComponentIndexResult(indexed)) {
			return indexed;
		}

		const warmup = await ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			partition: "components",
			maxComponents: 50,
			scanTimeoutMs: Math.min(options.timeoutMs ?? 60_000, 15_000),
			executeCli: options.executeCli,
			toolName: "ascet_search",
		});
		if (warmup.ok) {
			const warmed = queryAscetComponentIndex(params, { cwd: options.cwd, env: options.env });
			if (warmed && canUseComponentIndexResult(warmed)) {
				return warmed;
			}
		}
	}

	return runAscetCliJson(buildResolveComponentArgs(params), options);
}

export function formatResolveComponentResult(result: AscetResolveComponentResult): string {
	return formatAscetCliJsonResult("resolve_component", result);
}

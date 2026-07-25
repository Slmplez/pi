import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { ensureAscetSearchIndex, getAscetSearchIndexState, queryAscetComponentIndex } from "./search-index.ts";

export interface AscetListComponentsParams {
	folderPath: string;
	kind?: "class" | "module" | "statemachine";
	query?: string;
	limit?: number;
	recursive?: boolean;
}

export interface RunAscetListComponentsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetListComponentsResult = AscetCliJsonResult;

export const ascetListComponentsParameters = Type.Object({
	folderPath: Type.String({
		description: "ASCET folder path to list, for example DEMO or \\DEMO\\.",
		minLength: 1,
	}),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	query: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
	recursive: Type.Optional(Type.Boolean()),
});

export function buildListComponentsArgs(params: AscetListComponentsParams): string[] {
	const args = ["exec", "list_components", params.folderPath];
	if (params.kind) {
		args.push("--kind", params.kind);
	}
	if (params.query) {
		args.push("--query", params.query);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.recursive) {
		args.push("--recursive");
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
	const state = getAscetSearchIndexState();
	if (!result.ok || state.status !== "ready") {
		return false;
	}
	return state.scanComplete || getIndexedMatchCount(result) > 0;
}

export async function runAscetListComponents(
	params: AscetListComponentsParams,
	options: RunAscetListComponentsOptions,
): Promise<AscetListComponentsResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const queryParams = {
			query: params.query ?? "",
			scopePath: params.folderPath,
			kind: params.kind,
			match: "contains" as const,
			limit: params.limit,
		};
		const indexed = queryAscetComponentIndex(queryParams, { cwd: options.cwd });
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
			scheduler: options.scheduler,
			toolName: "ascet_explore",
		});
		if (warmup.ok) {
			const warmed = queryAscetComponentIndex(queryParams, { cwd: options.cwd });
			if (warmed && canUseComponentIndexResult(warmed)) {
				return warmed;
			}
		}
	}

	return runAscetCliJson(buildListComponentsArgs(params), options);
}

export function formatListComponentsResult(result: AscetListComponentsResult): string {
	return formatAscetCliJsonResult("list_components", result);
}

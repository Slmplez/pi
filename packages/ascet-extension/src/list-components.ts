import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { ensureAscetSearchIndex, isUsableSqliteSearchResult, queryAscetListComponentsIndex } from "./search-index.ts";

export interface AscetListComponentsParams {
	folderPath: string;
	kind?: "all" | "folder" | "class" | "module" | "statemachine";
	languageKind?: "all" | "BDE" | "ESDL" | "C" | "Unknown";
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
	kind: Type.Optional(
		Type.Union([
			Type.Literal("all"),
			Type.Literal("folder"),
			Type.Literal("class"),
			Type.Literal("module"),
			Type.Literal("statemachine"),
		]),
	),
	languageKind: Type.Optional(
		Type.Union([
			Type.Literal("all"),
			Type.Literal("BDE"),
			Type.Literal("ESDL"),
			Type.Literal("C"),
			Type.Literal("Unknown"),
		]),
	),
	query: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
	recursive: Type.Optional(Type.Boolean()),
});

export function buildListComponentsArgs(params: AscetListComponentsParams): string[] {
	const args = ["exec", "list_components", params.folderPath];
	if (params.kind && params.kind !== "all") {
		args.push("--kind", params.kind);
	}
	if (params.languageKind && params.languageKind !== "all") {
		args.push("--language-kind", params.languageKind);
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

export async function runAscetListComponents(
	params: AscetListComponentsParams,
	options: RunAscetListComponentsOptions,
): Promise<AscetListComponentsResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetListComponentsIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed && isUsableSqliteSearchResult(indexed)) {
			return indexed;
		}

		const warmup = await ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			partition: "p0",
			includeTextCode: true,
			scanTimeoutMs: Math.min(options.timeoutMs ?? 90_000, 90_000),
			executeCli: options.executeCli,
			scheduler: options.scheduler,
			toolName: "ascet_explore",
		});
		if (warmup.ok) {
			const warmed = queryAscetListComponentsIndex(params, { cwd: options.cwd, env: options.env });
			if (warmed && isUsableSqliteSearchResult(warmed)) {
				return warmed;
			}
		}
	}

	return runAscetCliJson(buildListComponentsArgs(params), options);
}

export function formatListComponentsResult(result: AscetListComponentsResult): string {
	return formatAscetCliJsonResult("list_components", result);
}

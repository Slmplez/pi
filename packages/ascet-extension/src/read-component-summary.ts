import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { ensureAscetSearchIndex, getAscetSearchIndexState } from "./search-index.ts";

export interface AscetReadComponentSummaryParams {
	componentPath: string;
	detailLevel?: "summary" | "topology";
}

export interface RunAscetReadComponentSummaryOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadComponentSummaryResult = AscetCliJsonResult;

export const ascetReadComponentSummaryParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
});

export function buildReadComponentSummaryArgs(params: AscetReadComponentSummaryParams): string[] {
	return ["exec", "read_component_summary", params.componentPath, "--json"];
}

function normalizeComponentPath(value: string): string {
	return value
		.trim()
		.replace(/\//g, "\\")
		.replace(/^\\+|\\+$/g, "");
}

function toOutputPath(value: string): string {
	return normalizeComponentPath(value).replace(/\\/g, "/");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function inferMethodLike(elementKind: string): boolean {
	return /method|process|action|condition|trigger/i.test(elementKind);
}

function summarizeIndexedTarget(params: AscetReadComponentSummaryParams): Record<string, unknown> | undefined {
	const state = getAscetSearchIndexState();
	if (state.status !== "ready") {
		return undefined;
	}
	const normalizedComponentPath = normalizeComponentPath(params.componentPath).toLowerCase();
	const component = state.components.find(
		(entry) => normalizeComponentPath(entry.path).toLowerCase() === normalizedComponentPath,
	);
	const entries = state.entries.filter(
		(entry) => normalizeComponentPath(entry.componentPath).toLowerCase() === normalizedComponentPath,
	);
	if (!component && entries.length === 0) {
		return undefined;
	}
	const counts = {
		elements: entries.length,
		methods: entries.filter((entry) => inferMethodLike(entry.elementKind)).length,
		references: entries.filter((entry) => entry.referencedComponentPath.trim().length > 0).length,
	};
	const summary: Record<string, unknown> = {
		component: toOutputPath(component?.path ?? params.componentPath),
		name: component?.name ?? normalizeComponentPath(params.componentPath).split("\\").at(-1),
		kind: component?.kind || component?.objectKind || "component",
		language: component?.languageKind || undefined,
		counts,
		source: "quick_search_index",
		partitions: ["components", "element_decls"],
		index: {
			databaseName: state.databaseName,
			databasePath: toOutputPath(state.databasePath),
			scanComplete: state.scanComplete,
			elapsedMs: state.elapsedMs,
		},
	};
	if (params.detailLevel === "topology") {
		const targets = new Set<string>();
		for (const entry of entries) {
			if (entry.referencedComponentPath) {
				targets.add(toOutputPath(entry.referencedComponentPath));
			}
		}
		summary.topology = {
			targets: [...targets].slice(0, 50).map((target) => ({ target })),
			truncated: targets.size > 50,
		};
	}
	return summary;
}

function makeIndexResult(
	params: AscetReadComponentSummaryParams,
	options: RunAscetReadComponentSummaryOptions,
	payload: Record<string, unknown>,
): AscetReadComponentSummaryResult {
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: { mode: "index", operation: "read_component_summary" },
	};
	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd,
			cliPath: "quick_search_index",
			args: ["index", "inspect_target", params.componentPath],
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function projectLiveSummaryResult(result: AscetReadComponentSummaryResult): AscetReadComponentSummaryResult {
	if (!result.ok || !isRecord(result.data)) {
		return result;
	}
	const root = result.data;
	const payload = isRecord(root.result) ? root.result : root;
	const componentPath = asString(payload.componentPath) || asString(payload.component) || asString(payload.path);
	const projected: Record<string, unknown> = {
		component: toOutputPath(componentPath),
		name: asString(payload.name) || toOutputPath(componentPath).split("/").at(-1),
		kind: asString(payload.kind) || asString(payload.componentKind) || "component",
		language: asString(payload.language) || asString(payload.languageKind) || undefined,
		source: "live_fallback_summary",
		fallback: {
			reason: "index_summary_unavailable",
			command: "read_component_summary",
		},
	};
	const counts = isRecord(payload.counts) ? payload.counts : undefined;
	if (counts) {
		projected.counts = counts;
	}
	const data = {
		ok: true,
		result: projected,
		error: null,
		meta: { mode: "exec", operation: "read_component_summary" },
	};
	return {
		...result,
		data,
		stdout: JSON.stringify(data),
	};
}

export async function runAscetReadComponentSummary(
	params: AscetReadComponentSummaryParams,
	options: RunAscetReadComponentSummaryOptions,
): Promise<AscetReadComponentSummaryResult> {
	await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition: "components",
		executeCli: options.executeCli,
		toolName: "ascet_explore",
	});
	await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition: "element_decls",
		executeCli: options.executeCli,
		toolName: "ascet_explore",
	});
	const summary = summarizeIndexedTarget(params);
	if (summary) {
		return makeIndexResult(params, options, summary);
	}
	return projectLiveSummaryResult(await runAscetCliJson(buildReadComponentSummaryArgs(params), options));
}

export function formatReadComponentSummaryResult(result: AscetReadComponentSummaryResult): string {
	return formatAscetCliJsonResult("read_component_summary", result);
}

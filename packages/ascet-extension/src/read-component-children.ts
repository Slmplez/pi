import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { ensureAscetSearchIndex, getAscetSearchIndexState } from "./search-index.ts";

export interface AscetReadComponentChildrenParams {
	componentPath: string;
	group?: "all" | "methods" | "elements" | "components" | "arrays" | "parameters" | "variables" | "diagrams";
}

export interface RunAscetReadComponentChildrenOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadComponentChildrenResult = AscetCliJsonResult;

export const ascetReadComponentChildrenParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	group: Type.Optional(
		Type.Union([
			Type.Literal("all"),
			Type.Literal("methods"),
			Type.Literal("elements"),
			Type.Literal("components"),
			Type.Literal("arrays"),
			Type.Literal("parameters"),
			Type.Literal("variables"),
			Type.Literal("diagrams"),
		]),
	),
});

export function buildReadComponentChildrenArgs(params: AscetReadComponentChildrenParams): string[] {
	const args = ["exec", "read_component_children", params.componentPath];
	if (params.group) {
		args.push("--group", params.group);
	}
	args.push("--json");
	return args;
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

function makeJsonResult(
	_params: AscetReadComponentChildrenParams,
	options: RunAscetReadComponentChildrenOptions,
	payload: Record<string, unknown>,
	args: string[],
): AscetReadComponentChildrenResult {
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: { mode: "index", operation: "read_component_children" },
	};
	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd,
			cliPath: "quick_search_index",
			args,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function elementKindMatchesGroup(elementKind: string, group: AscetReadComponentChildrenParams["group"]): boolean {
	const normalized = elementKind.trim().toLowerCase();
	if (!group || group === "all" || group === "elements") {
		return true;
	}
	if (group === "arrays") {
		return normalized.includes("array") || normalized.includes("table");
	}
	if (group === "parameters") {
		return normalized.includes("parameter") || normalized === "param" || normalized === "cont";
	}
	if (group === "variables") {
		return normalized.includes("variable") || normalized === "var" || normalized === "disc" || normalized === "cont";
	}
	return false;
}

function isMethodLikeElement(elementKind: string): boolean {
	return /method|process|action|condition|trigger/i.test(elementKind);
}

function buildIndexedChildItems(
	componentPath: string,
	group: AscetReadComponentChildrenParams["group"],
	methodOnly: boolean,
): Array<Record<string, unknown>> {
	const state = getAscetSearchIndexState();
	if (state.status !== "ready") {
		return [];
	}
	const normalizedComponentPath = normalizeComponentPath(componentPath).toLowerCase();
	const seen = new Set<string>();
	const items: Array<Record<string, unknown>> = [];
	if (methodOnly) {
		for (const entry of state.methodDeclarations) {
			if (normalizeComponentPath(entry.componentPath).toLowerCase() !== normalizedComponentPath) {
				continue;
			}
			const key = `${entry.methodName}\u0000${entry.methodKind}`;
			if (seen.has(key)) {
				continue;
			}
			seen.add(key);
			items.push({
				name: entry.methodName,
				kind: "method",
				type: entry.methodKind,
			});
		}
		return items;
	}

	for (const entry of state.entries) {
		if (normalizeComponentPath(entry.componentPath).toLowerCase() !== normalizedComponentPath) {
			continue;
		}
		if (methodOnly !== isMethodLikeElement(entry.elementKind)) {
			continue;
		}
		if (!methodOnly && !elementKindMatchesGroup(entry.elementKind, group)) {
			continue;
		}
		const key = `${entry.elementName}\u0000${entry.elementKind}\u0000${entry.displayScope}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		const item: Record<string, unknown> = {
			name: entry.elementName,
			kind: methodOnly ? "method" : "element",
		};
		if (entry.displayType) {
			item.type = entry.displayType;
		}
		if (entry.displayScope) {
			item.scope = entry.displayScope;
		}
		if (entry.elementKind && entry.elementKind !== entry.displayType) {
			item.elementKind = entry.elementKind;
		}
		if (entry.referencedComponentPath) {
			item.target = toOutputPath(entry.referencedComponentPath);
		}
		items.push(item);
	}
	return items;
}

async function runIndexBackedChildren(
	params: AscetReadComponentChildrenParams,
	options: RunAscetReadComponentChildrenOptions,
): Promise<AscetReadComponentChildrenResult | undefined> {
	const group = params.group ?? "all";
	const methodOnly = group === "methods";
	const partition = methodOnly ? "method_decls" : "element_decls";
	const warmup = await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition,
		componentPath: params.componentPath,
		forceRefresh: true,
		executeCli: options.executeCli,
		toolName: "ascet_explore",
	});
	if (!warmup.ok) {
		return undefined;
	}
	const items = buildIndexedChildItems(params.componentPath, group, methodOnly);
	if (methodOnly && items.length === 0) {
		return undefined;
	}
	const payload = {
		component: toOutputPath(params.componentPath),
		group,
		total: items.length,
		items,
		source: "quick_search_index",
		partition,
		index: {
			databaseName: warmup.databaseName,
			databasePath: toOutputPath(warmup.databasePath),
			scanComplete: warmup.scanComplete,
			fromCache: warmup.fromCache,
			elapsedMs: warmup.elapsedMs,
		},
	};
	return makeJsonResult(params, options, payload, [
		"index",
		"preview_children",
		params.componentPath,
		"--group",
		group,
	]);
}

function liveFallbackWithSource(result: AscetReadComponentChildrenResult): AscetReadComponentChildrenResult {
	if (!result.ok || !isRecord(result.data)) {
		return result;
	}
	const root = result.data;
	const resultPayload = isRecord(root.result) ? root.result : root;
	resultPayload.source = asString(resultPayload.source) || "live_fallback";
	resultPayload.fallback = {
		reason: "index_partition_unavailable_or_empty",
		command: "read_component_children",
	};
	return result;
}

export async function runAscetReadComponentChildren(
	params: AscetReadComponentChildrenParams,
	options: RunAscetReadComponentChildrenOptions,
): Promise<AscetReadComponentChildrenResult> {
	const group = params.group ?? "all";
	if (
		group === "elements" ||
		group === "arrays" ||
		group === "parameters" ||
		group === "variables" ||
		group === "methods"
	) {
		const indexed = await runIndexBackedChildren(params, options);
		if (indexed) {
			return indexed;
		}
	}
	return liveFallbackWithSource(await runAscetCliJson(buildReadComponentChildrenArgs(params), options));
}

export function formatReadComponentChildrenResult(result: AscetReadComponentChildrenResult): string {
	return formatAscetCliJsonResult("read_component_children", result);
}

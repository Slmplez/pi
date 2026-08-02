import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	runAscetCliJson,
} from "../cli.ts";
import { formatResolveComponentResult, runAscetResolveComponent } from "../resolve-component.ts";
import { formatSearchComponentsResult, runAscetSearchComponents } from "../search-components.ts";
import { formatSearchElementsResult, runAscetSearchElements } from "../search-elements.ts";
import {
	type AscetSearchIndexPartition,
	ensureAscetSearchIndex,
	getAscetSearchIndexPartitionState,
	isUsableSqliteSearchResult,
	queryAscetComponentReferenceIndex,
	queryAscetElementReferenceIndex,
	queryAscetMessageIndex,
	queryAscetMethodDeclarationIndex,
	queryAscetMethodProcessElementIndex,
	queryAscetProjectFormulaIndex,
	queryAscetProjectIndex,
} from "../search-index.ts";
import { formatSearchOccurrencesResult, runAscetSearchOccurrences } from "../search-occurrences.ts";
import { formatSearchTextCodeResult, runAscetSearchTextCode } from "../search-text-code.ts";
import { openAiObjectUnionSchema } from "./_shared/openai-schema.ts";

export type AscetSearchParams =
	| {
			action: "search_components";
			query: string;
			scopePath?: string;
			kind?: "class" | "module" | "statemachine";
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "search_projects";
			query: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "resolve_component";
			query: string;
			scopePath?: string;
			kind?: "class" | "module" | "statemachine";
			match?: "exact" | "glob" | "contains";
			limit?: number;
	  }
	| {
			action: "search_elements";
			query: string;
			componentPath?: string;
			scopePath?: string;
			group?: "all" | "primitive" | "complex" | "referenced";
			kind?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "declarations_of_element";
			query: string;
			componentPath?: string;
			scopePath?: string;
			kind?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "declarations_of_method_process";
			query: string;
			componentPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "declarations_of_method_process_element";
			query: string;
			componentPath?: string;
			scopePath?: string;
			methodName?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "references_to_component";
			query: string;
			componentPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "references_to_element";
			query: string;
			componentPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "senders_of_message";
			query: string;
			componentPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "receivers_of_message";
			query: string;
			componentPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "text_in_code";
			query: string;
			componentPath?: string;
			scopePath?: string;
			methodName?: string;
			section?: "auto" | "body" | "all" | "header" | "external-c";
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "search_project_formulas";
			query: string;
			projectPath?: string;
			scopePath?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  };

export interface RunAscetSearchOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

const matchSchema = Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")]));
const limitSchema = Type.Optional(Type.Number({ minimum: 1, maximum: 200 }));
const cursorSchema = Type.Optional(Type.String());
const querySchema = Type.String({ minLength: 1 });
const scopePathSchema = Type.Optional(Type.String());
const componentPathSchema = Type.Optional(Type.String());
const elementKindSchema = Type.Optional(Type.String({ description: "Element-kind substring filter." }));

const ascetSearchActionSchemas = [
	Type.Object({
		action: Type.Literal("search_components"),
		query: querySchema,
		scopePath: scopePathSchema,
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("search_projects"),
		query: querySchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("resolve_component"),
		query: querySchema,
		scopePath: scopePathSchema,
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		match: matchSchema,
		limit: limitSchema,
	}),
	Type.Object({
		action: Type.Literal("search_elements"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		group: Type.Optional(
			Type.Union([
				Type.Literal("all"),
				Type.Literal("primitive"),
				Type.Literal("complex"),
				Type.Literal("referenced"),
			]),
		),
		kind: elementKindSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("declarations_of_element"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		kind: elementKindSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("declarations_of_method_process"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("declarations_of_method_process_element"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		methodName: Type.Optional(Type.String()),
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("references_to_component"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("references_to_element"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("senders_of_message"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("receivers_of_message"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("text_in_code"),
		query: querySchema,
		componentPath: componentPathSchema,
		scopePath: scopePathSchema,
		methodName: Type.Optional(Type.String()),
		section: Type.Optional(
			Type.Union([
				Type.Literal("auto"),
				Type.Literal("body"),
				Type.Literal("all"),
				Type.Literal("header"),
				Type.Literal("external-c"),
			]),
		),
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
	Type.Object({
		action: Type.Literal("search_project_formulas"),
		query: querySchema,
		projectPath: Type.Optional(Type.String()),
		scopePath: scopePathSchema,
		match: matchSchema,
		limit: limitSchema,
		cursor: cursorSchema,
	}),
] as const;

export const ascetSearchParameters = openAiObjectUnionSchema<AscetSearchParams>(ascetSearchActionSchemas);

function toElementDeclarationParams(
	params:
		| Extract<AscetSearchParams, { action: "declarations_of_element" }>
		| Extract<AscetSearchParams, { action: "declarations_of_method_process" }>
		| Extract<AscetSearchParams, { action: "declarations_of_method_process_element" }>,
) {
	switch (params.action) {
		case "declarations_of_element":
			return { ...params, action: "search_elements" as const };
		case "declarations_of_method_process":
			return { ...params, action: "search_elements" as const, group: "complex" as const };
		case "declarations_of_method_process_element":
			return {
				...params,
				action: "search_elements" as const,
				group: "primitive" as const,
				kind: params.methodName,
				methodName: undefined,
			};
	}
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
	if (Array.isArray(matches)) {
		return matches.length;
	}
	const items = (payload as { items?: unknown }).items;
	return Array.isArray(items) ? items.length : 0;
}

function canUsePartitionResult(result: AscetCliJsonResult, partition: AscetSearchIndexPartition): boolean {
	if (isUsableSqliteSearchResult(result)) {
		return true;
	}
	const partitionState = getAscetSearchIndexPartitionState(partition);
	if (!result.ok || partitionState?.status !== "ready") {
		return false;
	}
	return partitionState.scanComplete || getIndexedMatchCount(result) > 0;
}

function isSearchIndexDisabled(env: Record<string, string | undefined> | undefined): boolean {
	return (env?.PI_ASCET_SEARCH_INDEX ?? process.env.PI_ASCET_SEARCH_INDEX) === "0";
}

async function runPartitionBackedSearch(
	partition: AscetSearchIndexPartition,
	params: Extract<
		AscetSearchParams,
		| { action: "declarations_of_method_process" }
		| { action: "declarations_of_method_process_element" }
		| { action: "references_to_component" }
		| { action: "references_to_element" }
		| { action: "senders_of_message" }
		| { action: "receivers_of_message" }
	>,
	options: RunAscetSearchOptions,
	query: () => AscetCliJsonResult | undefined,
	fallback: () => Promise<AscetCliJsonResult>,
): Promise<AscetCliJsonResult> {
	const indexed = query();
	if (indexed && canUsePartitionResult(indexed, partition)) {
		return indexed;
	}

	const warmup = await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition,
		componentPath: params.componentPath,
		forceRefresh: Boolean(params.componentPath),
		maxComponents: 50,
		scanTimeoutMs: Math.min(options.timeoutMs ?? 60_000, 15_000),
		executeCli: options.executeCli,
		toolName: "ascet_search",
	});
	if (warmup.ok) {
		const warmed = query();
		if (warmed && canUsePartitionResult(warmed, partition)) {
			return warmed;
		}
	}

	return fallback();
}

function buildSearchProjectsFallbackArgs(params: Extract<AscetSearchParams, { action: "search_projects" }>): string[] {
	const args = ["exec", "search_components", params.query, "--kind", "project"];
	if (params.scopePath) {
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

async function runAscetSearchProjects(
	params: Extract<AscetSearchParams, { action: "search_projects" }>,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetProjectIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed && canUsePartitionResult(indexed, "components")) {
			return indexed;
		}

		const warmup = await ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			partition: "components",
			scanTimeoutMs: Math.min(options.timeoutMs ?? 60_000, 15_000),
			executeCli: options.executeCli,
			toolName: "ascet_search",
		});
		if (warmup.ok) {
			const warmed = queryAscetProjectIndex(params, { cwd: options.cwd, env: options.env });
			if (warmed && canUsePartitionResult(warmed, "components")) {
				return warmed;
			}
		}
	}

	return runAscetCliJson(buildSearchProjectsFallbackArgs(params), options);
}

function buildIndexUnavailableResult(
	action: string,
	params: Extract<AscetSearchParams, { action: "search_project_formulas" }>,
	options: RunAscetSearchOptions,
): AscetCliJsonResult {
	const data = {
		ok: false,
		result: null,
		error: {
			code: "search_index_unavailable",
			message: `${action} requires a ready ASCET SQLite P0 search index.`,
		},
		meta: {
			mode: "index",
			operation: action,
		},
	};
	return {
		ok: false,
		data,
		request: {
			cwd: options.cwd,
			cliPath: "quick_search_index",
			args: ["index", action, params.query],
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: data.error,
	};
}

async function runAscetSearchProjectFormulas(
	params: Extract<AscetSearchParams, { action: "search_project_formulas" }>,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetProjectFormulaIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed?.ok) {
			return indexed;
		}
		const warmup = await ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			partition: "all",
			includeTextCode: true,
			scanTimeoutMs: Math.min(options.timeoutMs ?? 90_000, 90_000),
			executeCli: options.executeCli,
			toolName: "ascet_search",
		});
		if (warmup.ok) {
			const warmed = queryAscetProjectFormulaIndex(params, { cwd: options.cwd, env: options.env });
			if (warmed?.ok) {
				return warmed;
			}
		}
	}
	return buildIndexUnavailableResult("search_project_formulas", params, options);
}

export async function runAscetSearch(
	params: AscetSearchParams,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "search_components":
			return runAscetSearchComponents(params, options);
		case "search_projects":
			return runAscetSearchProjects(params, options);
		case "resolve_component":
			return runAscetResolveComponent(params, options);
		case "search_elements":
			return runAscetSearchElements(params, options);
		case "declarations_of_element":
			return runAscetSearchElements(toElementDeclarationParams(params), options);
		case "declarations_of_method_process":
			return runPartitionBackedSearch(
				"method_decls",
				params,
				options,
				() => queryAscetMethodDeclarationIndex(params, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchElements(toElementDeclarationParams(params), options),
			);
		case "declarations_of_method_process_element":
			return runPartitionBackedSearch(
				"method_process_elements",
				params,
				options,
				() => queryAscetMethodProcessElementIndex(params, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchElements(toElementDeclarationParams(params), options),
			);
		case "references_to_component":
			return runPartitionBackedSearch(
				"component_refs",
				params,
				options,
				() => queryAscetComponentReferenceIndex(params, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchOccurrences({ ...params, target: "component" }, options),
			);
		case "references_to_element":
			return runPartitionBackedSearch(
				"element_refs",
				params,
				options,
				() => queryAscetElementReferenceIndex(params, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "senders_of_message":
			return runPartitionBackedSearch(
				"messages",
				params,
				options,
				() => queryAscetMessageIndex({ ...params, direction: "sender" }, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "receivers_of_message":
			return runPartitionBackedSearch(
				"messages",
				params,
				options,
				() => queryAscetMessageIndex({ ...params, direction: "receiver" }, { cwd: options.cwd, env: options.env }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "text_in_code":
			return runAscetSearchTextCode(params, options);
		case "search_project_formulas":
			return runAscetSearchProjectFormulas(params, options);
	}
}

export function formatAscetSearchResult(params: AscetSearchParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "search_components":
		case "search_projects":
			return formatSearchComponentsResult(result);
		case "resolve_component":
			return formatResolveComponentResult(result);
		case "search_elements":
		case "declarations_of_element":
		case "declarations_of_method_process":
		case "declarations_of_method_process_element":
			return formatSearchElementsResult(result);
		case "references_to_component":
		case "references_to_element":
		case "senders_of_message":
		case "receivers_of_message":
			return formatSearchOccurrencesResult(result);
		case "text_in_code":
			return formatSearchTextCodeResult(result);
		case "search_project_formulas":
			return formatSearchComponentsResult(result);
	}
}

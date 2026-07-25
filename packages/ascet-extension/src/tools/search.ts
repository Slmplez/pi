import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatResolveComponentResult, runAscetResolveComponent } from "../resolve-component.ts";
import { formatSearchComponentsResult, runAscetSearchComponents } from "../search-components.ts";
import { formatSearchElementsResult, runAscetSearchElements } from "../search-elements.ts";
import {
	type AscetSearchIndexPartition,
	ensureAscetSearchIndex,
	getAscetSearchIndexPartitionState,
	queryAscetComponentReferenceIndex,
	queryAscetElementReferenceIndex,
	queryAscetMessageIndex,
	queryAscetMethodDeclarationIndex,
	queryAscetMethodProcessElementIndex,
} from "../search-index.ts";
import { formatSearchOccurrencesResult, runAscetSearchOccurrences } from "../search-occurrences.ts";
import { formatSearchTextCodeResult, runAscetSearchTextCode } from "../search-text-code.ts";

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

export const ascetSearchParameters = Type.Union([
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
]);

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
	return Array.isArray(matches) ? matches.length : 0;
}

function canUsePartitionResult(result: AscetCliJsonResult, partition: AscetSearchIndexPartition): boolean {
	const partitionState = getAscetSearchIndexPartitionState(partition);
	if (!result.ok || partitionState?.status !== "ready") {
		return false;
	}
	return partitionState.scanComplete || getIndexedMatchCount(result) > 0;
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

export async function runAscetSearch(
	params: AscetSearchParams,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "search_components":
			return runAscetSearchComponents(params, options);
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
				() => queryAscetMethodDeclarationIndex(params, { cwd: options.cwd }),
				() => runAscetSearchElements(toElementDeclarationParams(params), options),
			);
		case "declarations_of_method_process_element":
			return runPartitionBackedSearch(
				"method_process_elements",
				params,
				options,
				() => queryAscetMethodProcessElementIndex(params, { cwd: options.cwd }),
				() => runAscetSearchElements(toElementDeclarationParams(params), options),
			);
		case "references_to_component":
			return runPartitionBackedSearch(
				"component_refs",
				params,
				options,
				() => queryAscetComponentReferenceIndex(params, { cwd: options.cwd }),
				() => runAscetSearchOccurrences({ ...params, target: "component" }, options),
			);
		case "references_to_element":
			return runPartitionBackedSearch(
				"element_refs",
				params,
				options,
				() => queryAscetElementReferenceIndex(params, { cwd: options.cwd }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "senders_of_message":
			return runPartitionBackedSearch(
				"messages",
				params,
				options,
				() => queryAscetMessageIndex({ ...params, direction: "sender" }, { cwd: options.cwd }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "receivers_of_message":
			return runPartitionBackedSearch(
				"messages",
				params,
				options,
				() => queryAscetMessageIndex({ ...params, direction: "receiver" }, { cwd: options.cwd }),
				() => runAscetSearchOccurrences({ ...params, target: "element" }, options),
			);
		case "text_in_code":
			return runAscetSearchTextCode(params, options);
	}
}

export function formatAscetSearchResult(params: AscetSearchParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "search_components":
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
	}
}

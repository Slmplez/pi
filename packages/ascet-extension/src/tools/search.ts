import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatSearchComponentsResult, runAscetSearchComponents } from "../search-components.ts";
import { formatSearchElementsResult, runAscetSearchElements } from "../search-elements.ts";
import { formatSearchOccurrencesResult, runAscetSearchOccurrences } from "../search-occurrences.ts";

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
			action: "search_elements";
			query: string;
			componentPath?: string;
			group?: string;
			match?: "exact" | "glob" | "contains";
			limit?: number;
			cursor?: string;
	  }
	| {
			action: "search_occurrences";
			query: string;
			target: "component" | "element" | "code";
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

export const ascetSearchParameters = Type.Union([
	Type.Object({
		action: Type.Literal("search_components"),
		query: Type.String({ minLength: 1 }),
		scopePath: Type.Optional(Type.String()),
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
		cursor: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("search_elements"),
		query: Type.String({ minLength: 1 }),
		componentPath: Type.Optional(Type.String()),
		group: Type.Optional(Type.String()),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
		cursor: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("search_occurrences"),
		query: Type.String({ minLength: 1 }),
		target: Type.Union([Type.Literal("component"), Type.Literal("element"), Type.Literal("code")]),
		scopePath: Type.Optional(Type.String()),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
		cursor: Type.Optional(Type.String()),
	}),
]);

export async function runAscetSearch(
	params: AscetSearchParams,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "search_components":
			return runAscetSearchComponents(params, options);
		case "search_elements":
			return runAscetSearchElements(params, options);
		case "search_occurrences":
			return runAscetSearchOccurrences(params, options);
	}
}

export function formatAscetSearchResult(params: AscetSearchParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "search_components":
			return formatSearchComponentsResult(result);
		case "search_elements":
			return formatSearchElementsResult(result);
		case "search_occurrences":
			return formatSearchOccurrencesResult(result);
	}
}

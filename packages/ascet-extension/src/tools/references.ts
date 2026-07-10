import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatReadComponentRefsResult, runAscetReadComponentRefs } from "../read-component-refs.ts";
import { formatReadComponentUsedByResult, runAscetReadComponentUsedBy } from "../read-component-used-by.ts";
import { formatReadElementRefsResult, runAscetReadElementRefs } from "../read-element-refs.ts";
import { formatReadReferencesResult, runAscetReadReferences } from "../read-references.ts";

export type AscetReferencesParams =
	| { action: "element_refs"; componentPath: string; elementName: string }
	| { action: "component_refs"; componentPath: string; direction?: "out" | "both"; depth?: number }
	| { action: "references"; componentPath: string }
	| {
			action: "used_by";
			componentPath: string;
			scopePath: string;
			kind?: "class" | "module" | "statemachine";
			limit?: number;
	  };

export interface RunAscetReferencesOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetReferencesParameters = Type.Union([
	Type.Object({
		action: Type.Literal("element_refs"),
		componentPath: Type.String({ minLength: 1 }),
		elementName: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("component_refs"),
		componentPath: Type.String({ minLength: 1 }),
		direction: Type.Optional(Type.Union([Type.Literal("out"), Type.Literal("both")])),
		depth: Type.Optional(Type.Number({ minimum: 1 })),
	}),
	Type.Object({
		action: Type.Literal("references"),
		componentPath: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("used_by"),
		componentPath: Type.String({ minLength: 1 }),
		scopePath: Type.String({ minLength: 1 }),
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		limit: Type.Optional(Type.Number({ minimum: 1 })),
	}),
]);

export async function runAscetReferences(
	params: AscetReferencesParams,
	options: RunAscetReferencesOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "element_refs":
			return runAscetReadElementRefs(params, options);
		case "component_refs":
			return runAscetReadComponentRefs(params, options);
		case "references":
			return runAscetReadReferences(params, options);
		case "used_by":
			return runAscetReadComponentUsedBy(params, options);
	}
}

export function formatAscetReferencesResult(params: AscetReferencesParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "element_refs":
			return formatReadElementRefsResult(result);
		case "component_refs":
			return formatReadComponentRefsResult(result);
		case "references":
			return formatReadReferencesResult(result);
		case "used_by":
			return formatReadComponentUsedByResult(result);
	}
}

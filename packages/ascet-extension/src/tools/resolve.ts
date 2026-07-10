import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatResolveComponentResult, runAscetResolveComponent } from "../resolve-component.ts";

export type AscetResolveParams = {
	action: "component";
	query: string;
	scopePath?: string;
	kind?: "class" | "module" | "statemachine";
	match?: "exact" | "glob" | "contains";
	limit?: number;
};

export interface RunAscetResolveOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetResolveParameters = Type.Object({
	action: Type.Literal("component"),
	query: Type.String({ minLength: 1 }),
	scopePath: Type.Optional(Type.String()),
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
});

export async function runAscetResolve(
	params: AscetResolveParams,
	options: RunAscetResolveOptions,
): Promise<AscetCliJsonResult> {
	return runAscetResolveComponent(params, options);
}

export function formatAscetResolveResult(result: AscetCliJsonResult): string {
	return formatResolveComponentResult(result);
}

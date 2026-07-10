import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

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

export async function runAscetResolveComponent(
	params: AscetResolveComponentParams,
	options: RunAscetResolveComponentOptions,
): Promise<AscetResolveComponentResult> {
	return runAscetCliJson(buildResolveComponentArgs(params), options);
}

export function formatResolveComponentResult(result: AscetResolveComponentResult): string {
	return formatAscetCliJsonResult("resolve_component", result);
}

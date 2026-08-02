import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadImplementationParams {
	componentPath: string;
	mode?: "list" | "default" | "class-impl" | "impl";
	implementationName?: string;
	detailLevel?: "metadata" | "summary" | "elements" | "full";
	maxDepth?: number;
	maxElements?: number;
	timeoutMs?: number;
}

export interface RunAscetReadImplementationOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadImplementationResult = AscetCliJsonResult;

export const ascetReadImplementationParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	mode: Type.Optional(
		Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
	),
	implementationName: Type.Optional(Type.String({ description: "Implementation name when mode is impl." })),
	detailLevel: Type.Optional(
		Type.Union([Type.Literal("metadata"), Type.Literal("summary"), Type.Literal("elements"), Type.Literal("full")]),
	),
	maxDepth: Type.Optional(Type.Integer({ minimum: 0, maximum: 1000 })),
	maxElements: Type.Optional(Type.Integer({ minimum: 1, maximum: 1_000_000 })),
	timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
});

export function buildReadImplementationArgs(params: AscetReadImplementationParams): string[] {
	const args = ["exec", "read_implementation", normalizeAscetPath(params.componentPath)];
	if (params.mode === "list") {
		args.push("--list");
	} else if (params.mode === "default") {
		args.push("--default");
	} else if (params.mode === "class-impl") {
		args.push("--class-impl");
	} else if (params.mode === "impl") {
		args.push("--impl", params.implementationName ?? "");
	}
	if (params.detailLevel !== undefined) {
		args.push("--detail-level", params.detailLevel);
	}
	if (params.maxDepth !== undefined) {
		args.push("--max-depth", String(Math.trunc(params.maxDepth)));
	}
	if (params.maxElements !== undefined) {
		args.push("--max-elements", String(Math.trunc(params.maxElements)));
	}
	if (params.timeoutMs !== undefined) {
		args.push("--timeout-ms", String(Math.trunc(params.timeoutMs)));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadImplementation(
	params: AscetReadImplementationParams,
	options: RunAscetReadImplementationOptions,
): Promise<AscetReadImplementationResult> {
	const budgetsEnabled = options.env?.ASCET_IMPLEMENTATION_BUDGETS !== "0";
	const effectiveParams =
		!budgetsEnabled &&
		params.detailLevel === undefined &&
		params.maxDepth === undefined &&
		params.maxElements === undefined &&
		params.timeoutMs === undefined
			? { ...params, detailLevel: "full" as const }
			: params;
	return runAscetCliJson(buildReadImplementationArgs(effectiveParams), options);
}

export function formatReadImplementationResult(result: AscetReadImplementationResult): string {
	return formatAscetCliJsonResult("read_implementation", result);
}

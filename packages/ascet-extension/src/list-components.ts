import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";

export interface AscetListComponentsParams {
	folderPath: string;
	kind?: "class" | "module" | "statemachine";
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
	kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
	query: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
	recursive: Type.Optional(Type.Boolean()),
});

export function buildListComponentsArgs(params: AscetListComponentsParams): string[] {
	const args = ["exec", "list_components", params.folderPath];
	if (params.kind) {
		args.push("--kind", params.kind);
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

export async function runAscetListComponents(
	params: AscetListComponentsParams,
	options: RunAscetListComponentsOptions,
): Promise<AscetListComponentsResult> {
	return runAscetCliJson(buildListComponentsArgs(params), options);
}

export function formatListComponentsResult(result: AscetListComponentsResult): string {
	return formatAscetCliJsonResult("list_components", result);
}

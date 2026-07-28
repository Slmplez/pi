import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

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

export async function runAscetReadComponentChildren(
	params: AscetReadComponentChildrenParams,
	options: RunAscetReadComponentChildrenOptions,
): Promise<AscetCliJsonResult> {
	return runAscetCliJson(buildReadComponentChildrenArgs(params), options);
}

export function formatReadComponentChildrenResult(result: AscetCliJsonResult): string {
	return formatAscetCliJsonResult("read_component_children", result);
}

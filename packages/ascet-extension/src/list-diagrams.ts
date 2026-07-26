import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetListDiagramsParams {
	componentPath: string;
	diagramKind?: "all" | "block" | "block_diagram" | "state" | "state_machine" | "sequence" | "unknown";
}

export interface RunAscetListDiagramsOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetListDiagramsResult = AscetCliJsonResult;

export const ascetListDiagramsParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	diagramKind: Type.Optional(
		Type.Union([
			Type.Literal("all"),
			Type.Literal("block"),
			Type.Literal("block_diagram"),
			Type.Literal("state"),
			Type.Literal("state_machine"),
			Type.Literal("sequence"),
			Type.Literal("unknown"),
		]),
	),
});

export function buildListDiagramsArgs(params: AscetListDiagramsParams): string[] {
	const args = ["exec", "list_diagrams", params.componentPath];
	if (params.diagramKind) {
		args.push("--diagram-kind", params.diagramKind);
	}
	args.push("--json");
	return args;
}

export async function runAscetListDiagrams(
	params: AscetListDiagramsParams,
	options: RunAscetListDiagramsOptions,
): Promise<AscetListDiagramsResult> {
	return runAscetCliJson(buildListDiagramsArgs(params), options);
}

export function formatListDiagramsResult(result: AscetListDiagramsResult): string {
	return formatAscetCliJsonResult("list_diagrams", result);
}

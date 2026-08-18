import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadBlockDiagramParams {
	componentPath: string;
	diagramName: string;
}

export interface RunAscetReadBlockDiagramOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadBlockDiagramResult = AscetCliJsonResult;

export const ascetReadBlockDiagramParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET class or module path, for example DEMO\\PID.", minLength: 1 }),
	diagramName: Type.String({ description: "ASCET block diagram name, for example Main.", minLength: 1 }),
});

export function buildReadBlockDiagramArgs(params: AscetReadBlockDiagramParams): string[] {
	return ["exec", "read_block_diagram", params.componentPath, params.diagramName, "--json"];
}

export async function runAscetReadBlockDiagram(
	params: AscetReadBlockDiagramParams,
	options: RunAscetReadBlockDiagramOptions,
): Promise<AscetReadBlockDiagramResult> {
	return runAscetCliJson(buildReadBlockDiagramArgs(params), options);
}

export function formatReadBlockDiagramResult(result: AscetReadBlockDiagramResult): string {
	return formatAscetCliJsonResult("read_block_diagram", result, { largeSuccess: "inline" });
}

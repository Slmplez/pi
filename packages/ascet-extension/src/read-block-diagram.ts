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
	const result = await runAscetCliJson(buildReadBlockDiagramArgs(params), options);
	return normalizeReadBlockDiagramResult(params, result);
}

export function formatReadBlockDiagramResult(result: AscetReadBlockDiagramResult): string {
	return formatAscetCliJsonResult("read_block_diagram", result);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function getArrayLength(record: Record<string, unknown> | undefined, ...keys: string[]): number {
	for (const key of keys) {
		const value = record?.[key];
		if (Array.isArray(value)) {
			return value.length;
		}
	}
	return 0;
}

function normalizeReadBlockDiagramResult(
	params: AscetReadBlockDiagramParams,
	result: AscetReadBlockDiagramResult,
): AscetReadBlockDiagramResult {
	if (!result.ok) {
		return result;
	}
	const root = asRecord(result.data);
	const payload = asRecord(root?.result) ?? root;
	const elements = getArrayLength(payload, "Elements", "elements");
	const connections = getArrayLength(payload, "Connections", "connections");
	if (elements === 0 && connections === 0) {
		return {
			...result,
			ok: false,
			data: {
				componentPath: params.componentPath,
				diagramName: params.diagramName,
				recommendation: "Use ascet_read.read, ascet_read.read_code, or ascet_read.read_implementation for text ESDL components.",
			},
			error: {
				code: "ascet_block_diagram_surface_not_supported",
				message:
					"Component does not support a readable block diagram surface; text ESDL classes/modules can expose method code or implementation data without block-diagram elements.",
			},
		};
	}
	return result;
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { ensureAscetSearchIndex, queryAscetDiagramMetadataIndex } from "./search-index.ts";

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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function getIndexedMatchCount(result: AscetCliJsonResult): number {
	if (!isRecord(result.data) || !isRecord(result.data.result)) {
		return 0;
	}
	const matches = result.data.result.matches;
	return Array.isArray(matches) ? matches.length : 0;
}

function canUseDiagramIndexResult(result: AscetCliJsonResult): boolean {
	if (!result.ok || !isRecord(result.data) || !isRecord(result.data.result)) {
		return false;
	}
	return result.data.result.searchComplete === true || getIndexedMatchCount(result) > 0;
}

function liveFallbackWithSource(result: AscetListDiagramsResult): AscetListDiagramsResult {
	if (!result.ok || !isRecord(result.data)) {
		return result;
	}
	const root = result.data;
	const payload = isRecord(root.result) ? root.result : root;
	payload.source = asString(payload.source) || "live_fallback";
	payload.fallback = {
		reason: "diagram_metadata_partition_unavailable_or_empty",
		command: "list_diagrams",
	};
	return result;
}

export async function runAscetListDiagrams(
	params: AscetListDiagramsParams,
	options: RunAscetListDiagramsOptions,
): Promise<AscetListDiagramsResult> {
	const indexed = queryAscetDiagramMetadataIndex(params, { cwd: options.cwd });
	if (indexed && canUseDiagramIndexResult(indexed)) {
		return indexed;
	}

	const warmup = await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition: "diagram_metadata",
		componentPath: params.componentPath,
		executeCli: options.executeCli,
		toolName: "ascet_explore",
	});
	if (warmup.ok) {
		const warmed = queryAscetDiagramMetadataIndex(params, { cwd: options.cwd });
		if (warmed && canUseDiagramIndexResult(warmed)) {
			return warmed;
		}
	}
	return liveFallbackWithSource(await runAscetCliJson(buildListDiagramsArgs(params), options));
}

export function formatListDiagramsResult(result: AscetListDiagramsResult): string {
	return formatAscetCliJsonResult("list_diagrams", result);
}

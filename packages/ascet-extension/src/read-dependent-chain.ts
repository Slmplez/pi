import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";

export interface AscetReadDependentChainParams {
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
	providerScopePath?: string;
	maxCandidates?: number;
}

export interface RunAscetReadDependentChainOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadDependentChainResult = AscetCliJsonResult;

export const ascetReadDependentChainParameters = Type.Object({
	componentPath: Type.String({
		description: "ASCET consuming component path containing the local dependent parameter.",
		minLength: 1,
	}),
	dependentElement: Type.String({ description: "Local dependent parameter name to analyze.", minLength: 1 }),
	exporterComponentPath: Type.Optional(
		Type.String({
			description: "Optional provider/exporter component path used as a verification constraint.",
			minLength: 1,
		}),
	),
	providerScopePath: Type.Optional(
		Type.String({ description: "Optional folder or scope path used to bound provider discovery.", minLength: 1 }),
	),
	maxCandidates: Type.Optional(
		Type.Number({
			description: "Maximum provider candidates to inspect during discovery. Defaults to 200.",
			minimum: 1,
		}),
	),
});

export function buildReadDependentChainArgs(params: AscetReadDependentChainParams): string[] {
	const args = ["exec", "read_dependent_chain", normalizeAscetPath(params.componentPath), params.dependentElement];
	if (params.exporterComponentPath) {
		args.push("--exporter", normalizeAscetPath(params.exporterComponentPath));
	}
	if (params.providerScopePath) {
		args.push("--provider-scope", normalizeAscetPath(params.providerScopePath));
	}
	if (params.maxCandidates !== undefined && Number.isFinite(params.maxCandidates)) {
		args.push("--max-candidates", String(Math.trunc(params.maxCandidates)));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetReadDependentChainResult> {
	return runAscetCliJson(buildReadDependentChainArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_dependent_chain",
		jobKind: "read",
	});
}

export function formatReadDependentChainResult(result: AscetReadDependentChainResult): string {
	return formatAscetCliJsonResult("read_dependent_chain", result);
}

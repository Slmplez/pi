import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadStateMachineFlowParams {
	componentPath: string;
	traceDepth?: number;
	detailLevel?: "summary" | "topology" | "full";
}

export interface RunAscetReadStateMachineFlowOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadStateMachineFlowResult = AscetCliJsonResult;

export const ascetReadStateMachineFlowParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET state-machine component path.", minLength: 1 }),
	traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("topology"), Type.Literal("full")])),
});

export function buildReadStateMachineFlowArgs(params: AscetReadStateMachineFlowParams): string[] {
	const args = ["exec", "read_state_machine_flow", normalizeAscetPath(params.componentPath)];
	if (params.traceDepth !== undefined) {
		args.push("--trace-depth", String(params.traceDepth));
	}
	if (params.detailLevel !== undefined) {
		args.push("--detail-level", params.detailLevel);
	}
	args.push("--json");
	return args;
}

export async function runAscetReadStateMachineFlow(
	params: AscetReadStateMachineFlowParams,
	options: RunAscetReadStateMachineFlowOptions,
): Promise<AscetReadStateMachineFlowResult> {
	return runAscetCliJson(buildReadStateMachineFlowArgs(params), options);
}

export function formatReadStateMachineFlowResult(result: AscetReadStateMachineFlowResult): string {
	return formatAscetCliJsonResult("read_state_machine_flow", result, { largeSuccess: "inline" });
}

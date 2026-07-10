import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetDiffComponentSnapshotParams {
	leftComponentPath: string;
	rightComponentPath: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffComponentSnapshotOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffComponentSnapshotResult = AscetCliJsonResult;

export const ascetDiffComponentSnapshotParameters = Type.Object({
	leftComponentPath: Type.String({ description: "Left ASCET component path.", minLength: 1 }),
	rightComponentPath: Type.String({ description: "Right ASCET component path.", minLength: 1 }),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
});

export function buildDiffComponentSnapshotArgs(params: AscetDiffComponentSnapshotParams): string[] {
	const args = ["exec", "diff_component_snapshot", params.leftComponentPath, params.rightComponentPath];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffComponentSnapshot(
	params: AscetDiffComponentSnapshotParams,
	options: RunAscetDiffComponentSnapshotOptions,
): Promise<AscetDiffComponentSnapshotResult> {
	return runAscetCliJson(buildDiffComponentSnapshotArgs(params), options);
}

export function formatDiffComponentSnapshotResult(result: AscetDiffComponentSnapshotResult): string {
	return formatAscetCliJsonResult("diff_component_snapshot", result);
}

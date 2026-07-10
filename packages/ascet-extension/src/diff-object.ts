import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export type AscetDiffObjectOperation = "diff_class" | "diff_module" | "diff_state_machine";

export interface AscetDiffObjectParams {
	operation: AscetDiffObjectOperation;
	leftPath: string;
	rightPath: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffObjectOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffObjectResult = AscetCliJsonResult;

export function buildDiffObjectArgs(params: AscetDiffObjectParams): string[] {
	const args = ["exec", params.operation, normalizeAscetPath(params.leftPath), normalizeAscetPath(params.rightPath)];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffObject(
	params: AscetDiffObjectParams,
	options: RunAscetDiffObjectOptions,
): Promise<AscetDiffObjectResult> {
	return runAscetCliJson(buildDiffObjectArgs(params), options);
}

export function formatDiffObjectResult(operation: AscetDiffObjectOperation, result: AscetDiffObjectResult): string {
	return formatAscetCliJsonResult(operation, result);
}

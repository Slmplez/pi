import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetDiffMethodCodeParams {
	leftComponentPath: string;
	rightComponentPath: string;
	methodName: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffMethodCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffMethodCodeResult = AscetCliJsonResult;

export const ascetDiffMethodCodeParameters = Type.Object({
	leftComponentPath: Type.String({ description: "Left ASCET component path.", minLength: 1 }),
	rightComponentPath: Type.String({ description: "Right ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name.", minLength: 1 }),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
});

export function buildDiffMethodCodeArgs(params: AscetDiffMethodCodeParams): string[] {
	const args = [
		"exec",
		"diff_method_code",
		normalizeAscetPath(params.leftComponentPath),
		normalizeAscetPath(params.rightComponentPath),
		params.methodName,
	];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffMethodCode(
	params: AscetDiffMethodCodeParams,
	options: RunAscetDiffMethodCodeOptions,
): Promise<AscetDiffMethodCodeResult> {
	return runAscetCliJson(buildDiffMethodCodeArgs(params), options);
}

export function formatDiffMethodCodeResult(result: AscetDiffMethodCodeResult): string {
	return formatAscetCliJsonResult("diff_method_code", result);
}

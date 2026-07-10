import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetDiffProjectFormulasParams {
	leftProjectPath: string;
	rightProjectPath: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffProjectFormulasOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffProjectFormulasResult = AscetCliJsonResult;

export const ascetDiffProjectFormulasParameters = Type.Object({
	leftProjectPath: Type.String({ description: "Left ASCET project path.", minLength: 1 }),
	rightProjectPath: Type.String({ description: "Right ASCET project path.", minLength: 1 }),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
});

export function buildDiffProjectFormulasArgs(params: AscetDiffProjectFormulasParams): string[] {
	const args = [
		"exec",
		"diff_project_formulas",
		normalizeAscetPath(params.leftProjectPath),
		normalizeAscetPath(params.rightProjectPath),
	];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffProjectFormulas(
	params: AscetDiffProjectFormulasParams,
	options: RunAscetDiffProjectFormulasOptions,
): Promise<AscetDiffProjectFormulasResult> {
	return runAscetCliJson(buildDiffProjectFormulasArgs(params), options);
}

export function formatDiffProjectFormulasResult(result: AscetDiffProjectFormulasResult): string {
	return formatAscetCliJsonResult("diff_project_formulas", result);
}

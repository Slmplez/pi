import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetReadProjectFormulasParams {
	projectPath: string;
}

export interface RunAscetReadProjectFormulasOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadProjectFormulasResult = AscetCliJsonResult;

export const ascetReadProjectFormulasParameters = Type.Object({
	projectPath: Type.String({ description: "ASCET project path, for example DEMO\\Project.", minLength: 1 }),
});

export function buildReadProjectFormulasArgs(params: AscetReadProjectFormulasParams): string[] {
	return ["exec", "read_project_formulas", params.projectPath, "--json"];
}

export async function runAscetReadProjectFormulas(
	params: AscetReadProjectFormulasParams,
	options: RunAscetReadProjectFormulasOptions,
): Promise<AscetReadProjectFormulasResult> {
	return runAscetCliJson(buildReadProjectFormulasArgs(params), options);
}

export function formatReadProjectFormulasResult(result: AscetReadProjectFormulasResult): string {
	return formatAscetCliJsonResult("read_project_formulas", result);
}

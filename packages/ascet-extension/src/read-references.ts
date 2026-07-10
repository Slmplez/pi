import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadReferencesParams {
	componentPath: string;
}

export interface RunAscetReadReferencesOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadReferencesResult = AscetCliJsonResult;

export const ascetReadReferencesParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
});

export function buildReadReferencesArgs(params: AscetReadReferencesParams): string[] {
	return ["exec", "read_references", normalizeAscetPath(params.componentPath), "--json"];
}

export async function runAscetReadReferences(
	params: AscetReadReferencesParams,
	options: RunAscetReadReferencesOptions,
): Promise<AscetReadReferencesResult> {
	return runAscetCliJson(buildReadReferencesArgs(params), options);
}

export function formatReadReferencesResult(result: AscetReadReferencesResult): string {
	return formatAscetCliJsonResult("read_references", result);
}

import { isAbsolute, resolve } from "node:path";
import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetDiffElementSpecParams {
	componentPath: string;
	specFile: string;
	changesOnly?: boolean;
}

export interface RunAscetDiffElementSpecOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffElementSpecResult = AscetCliJsonResult;

export const ascetDiffElementSpecParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	specFile: Type.String({
		description:
			"Path to element spec JSON file. Relative paths resolve against the tool invocation working directory.",
		minLength: 1,
	}),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
});

export function buildDiffElementSpecArgs(params: AscetDiffElementSpecParams, cwd: string): string[] {
	if (typeof params.componentPath !== "string" || params.componentPath.length === 0) {
		throw new Error("componentPath is required for diff_element_spec.");
	}
	if (typeof params.specFile !== "string" || params.specFile.length === 0) {
		throw new Error("specFile is required for diff_element_spec.");
	}
	const args = [
		"exec",
		"diff_element_spec",
		normalizeAscetPath(params.componentPath),
		isAbsolute(params.specFile) ? params.specFile : resolve(cwd, params.specFile),
	];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffElementSpec(
	params: AscetDiffElementSpecParams,
	options: RunAscetDiffElementSpecOptions,
): Promise<AscetDiffElementSpecResult> {
	return runAscetCliJson(buildDiffElementSpecArgs(params, options.cwd), options);
}

export function formatDiffElementSpecResult(result: AscetDiffElementSpecResult): string {
	return formatAscetCliJsonResult("diff_element_spec", result);
}

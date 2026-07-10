import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";

export interface AscetReadTextCodeParams {
	componentPath: string;
	methodName?: string;
	section?: "header" | "external-c" | "all" | "body";
}

export interface RunAscetReadTextCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadTextCodeResult = AscetCliJsonResult;

export const ascetReadTextCodeParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path, for example DEMO\\PID.", minLength: 1 }),
	methodName: Type.Optional(Type.String({ description: "Optional method name for method-specific code readback." })),
	section: Type.Optional(
		Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
	),
});

export function buildReadTextCodeArgs(params: AscetReadTextCodeParams): string[] {
	const args = ["exec", "read_text_code", normalizeAscetPath(params.componentPath)];
	if (params.methodName) {
		args.push("--method-name", params.methodName);
	}
	if (params.section) {
		args.push("--section", params.section);
	}
	args.push("--json");
	return args;
}

export async function runAscetReadTextCode(
	params: AscetReadTextCodeParams,
	options: RunAscetReadTextCodeOptions,
): Promise<AscetReadTextCodeResult> {
	return runAscetCliJson(buildReadTextCodeArgs(params), options);
}

export function formatReadTextCodeResult(result: AscetReadTextCodeResult): string {
	return formatAscetCliJsonResult("read_text_code", result);
}

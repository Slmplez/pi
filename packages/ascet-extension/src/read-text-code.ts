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
	const result = await runAscetCliJson(buildReadTextCodeArgs(params), options);
	return normalizeReadTextCodeResult(params, result);
}

export function formatReadTextCodeResult(result: AscetReadTextCodeResult): string {
	return formatAscetCliJsonResult("read_text_code", result, { largeSuccess: "inline" });
}

function normalizeReadTextCodeResult(
	params: AscetReadTextCodeParams,
	result: AscetReadTextCodeResult,
): AscetReadTextCodeResult {
	const message = result.error?.message ?? "";
	if (!result.ok && message.includes("ESDL code view is not available")) {
		return {
			...result,
			error: {
				code: result.error?.code ?? "ascet_unsupported_code_surface",
				message:
					'ESDL module does not support text code sections; use ascet_read with action="read_code", methodName, and section="body", or ascet_edit action="set_method_code" instead.',
			},
			data: {
				componentPath: params.componentPath,
				methodName: params.methodName,
				section: params.section,
				recommendation:
					'Use ascet_read.read_code with methodName and section="body" for method code, or ascet_edit.set_method_code for updates.',
			},
		};
	}
	return result;
}

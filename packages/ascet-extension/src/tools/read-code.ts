import { Type } from "typebox";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../cli.ts";
import { formatReadComponentCodeResult, runAscetReadComponentCode } from "../read-component-code.ts";
import { formatReadMethodCodeResult, runAscetReadMethodCode } from "../read-method-code.ts";
import { formatReadTextCodeResult, runAscetReadTextCode } from "../read-text-code.ts";

export type AscetReadCodeParams =
	| { action: "method"; componentPath: string; methodName: string }
	| { action: "component"; componentPath: string }
	| { action: "text"; componentPath: string; methodName?: string; section?: "header" | "external-c" | "all" | "body" };

export interface RunAscetReadCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export const ascetReadCodeParameters = Type.Union([
	Type.Object({
		action: Type.Literal("method"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("component"),
		componentPath: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("text"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.Optional(Type.String()),
		section: Type.Optional(
			Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
		),
	}),
]);

export async function runAscetReadCode(
	params: AscetReadCodeParams,
	options: RunAscetReadCodeOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "method":
			return runAscetReadMethodCode(params, options);
		case "component":
			return runAscetReadComponentCode(params, options);
		case "text":
			return runAscetReadTextCode(params, options);
	}
}

export function formatAscetReadCodeResult(params: AscetReadCodeParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "method":
			return formatReadMethodCodeResult(result);
		case "component":
			return formatReadComponentCodeResult(result);
		case "text":
			return formatReadTextCodeResult(result);
	}
}

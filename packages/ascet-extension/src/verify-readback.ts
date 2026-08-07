import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";

export interface AscetVerifyReadbackParams {
	action: "readback";
	objectKind?: "class" | "module" | "statemachine" | "project";
	componentPath?: string;
	projectPath?: string;
	traceId?: string;
}

export interface RunAscetVerifyReadbackOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetVerifyReadbackResult = AscetCliJsonResult;

export const ascetVerifyReadbackParameters = Type.Object({
	action: Type.Literal("readback"),
	objectKind: Type.Optional(
		Type.Union([
			Type.Literal("class"),
			Type.Literal("module"),
			Type.Literal("statemachine"),
			Type.Literal("project"),
		]),
	),
	componentPath: Type.Optional(
		Type.String({ description: "ASCET component path for class/module/state-machine readback.", minLength: 1 }),
	),
	projectPath: Type.Optional(Type.String({ description: "ASCET project path for project readback.", minLength: 1 })),
	traceId: Type.Optional(Type.String({ description: "Optional trace id from a previous write operation." })),
});

export function getVerifyReadbackIssues(params: AscetVerifyReadbackParams): string[] {
	const hasComponentPath = typeof params.componentPath === "string" && params.componentPath.length > 0;
	const hasProjectPath = typeof params.projectPath === "string" && params.projectPath.length > 0;
	const issues: string[] = [];

	if (!hasComponentPath && !hasProjectPath) {
		issues.push("readback requires exactly one of componentPath or projectPath");
	}
	if (hasComponentPath && hasProjectPath) {
		issues.push("readback accepts either componentPath or projectPath, not both");
	}
	if (params.objectKind === "project") {
		if (!hasProjectPath) {
			issues.push('objectKind="project" requires projectPath');
		}
		if (hasComponentPath) {
			issues.push('objectKind="project" does not accept componentPath');
		}
	}
	if (params.objectKind && params.objectKind !== "project") {
		if (!hasComponentPath) {
			issues.push(`objectKind="${params.objectKind}" requires componentPath`);
		}
		if (hasProjectPath) {
			issues.push(`objectKind="${params.objectKind}" does not accept projectPath`);
		}
	}

	return issues;
}

export function buildVerifyReadbackArgs(params: AscetVerifyReadbackParams): string[] {
	const issues = getVerifyReadbackIssues(params);
	if (issues.length > 0) {
		throw new Error(`Invalid ASCET readback target: ${issues.join("; ")}`);
	}

	if (params.projectPath) {
		return ["exec", "get_formulas", "--request-json", JSON.stringify({ path: params.projectPath }), "--json"];
	}
	return ["exec", "read_component_summary", params.componentPath ?? "", "--json"];
}

function createInvalidReadbackResult(
	params: AscetVerifyReadbackParams,
	options: RunAscetVerifyReadbackOptions,
	issues: string[],
): AscetVerifyReadbackResult {
	return {
		ok: false,
		data: {
			action: "readback",
			targetKind: params.projectPath ? "project" : "component",
			issues,
		},
		request: {
			cwd: options.cwd,
			cliPath: "",
			args: [],
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: {
			code: "ascet_verify_invalid_target",
			message: issues.join("; "),
		},
	};
}

export async function runAscetVerifyReadback(
	params: AscetVerifyReadbackParams,
	options: RunAscetVerifyReadbackOptions,
): Promise<AscetVerifyReadbackResult> {
	const issues = getVerifyReadbackIssues(params);
	if (issues.length > 0) {
		return createInvalidReadbackResult(params, options, issues);
	}
	return runAscetCliJson(buildVerifyReadbackArgs(params), options);
}

export function formatVerifyReadbackResult(result: AscetVerifyReadbackResult): string {
	return formatAscetCliJsonResult("verify_readback", result);
}

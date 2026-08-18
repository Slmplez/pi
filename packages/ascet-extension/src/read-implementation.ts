import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import {
	type AscetEnumerationReadback,
	parseAscetIndependentEnumerationReadback,
} from "./read/enumeration-readback.ts";

export interface AscetReadImplementationParams {
	componentPath: string;
	mode?: "list" | "default" | "class-impl" | "impl";
	implementationName?: string;
	timeoutMs?: number;
}

export interface AscetReadImplementationArgumentDetails {
	mode: "impl";
	parameter: "implementationName";
}

export class AscetReadImplementationArgumentError extends Error {
	readonly code = "invalid_argument";
	readonly details: AscetReadImplementationArgumentDetails;

	constructor(details: AscetReadImplementationArgumentDetails) {
		super("implementationName is required when mode is impl");
		this.name = "AscetReadImplementationArgumentError";
		this.details = details;
	}
}

export interface RunAscetReadImplementationOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadImplementationResult = AscetCliJsonResult;

export const ascetReadImplementationParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	mode: Type.Optional(
		Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
	),
	implementationName: Type.Optional(Type.String({ description: "Implementation name when mode is impl." })),
	timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
});

export function buildReadImplementationArgs(params: AscetReadImplementationParams): string[] {
	const args = ["exec", "read_implementation", normalizeAscetPath(params.componentPath)];
	if (params.mode === "list") {
		args.push("--list");
	} else if (params.mode === "default") {
		args.push("--default");
	} else if (params.mode === "class-impl") {
		args.push("--class-impl");
	} else if (params.mode === "impl") {
		if (params.implementationName === undefined || params.implementationName.trim().length === 0) {
			throw new AscetReadImplementationArgumentError({ mode: "impl", parameter: "implementationName" });
		}
		args.push("--impl", params.implementationName);
	}
	args.push("--json");
	return args;
}

export async function runAscetReadImplementation(
	params: AscetReadImplementationParams,
	options: RunAscetReadImplementationOptions,
): Promise<AscetReadImplementationResult> {
	return runAscetCliJson(buildReadImplementationArgs(params), {
		...options,
		timeoutMs: params.timeoutMs ?? options.timeoutMs,
	});
}

export function getReadImplementationEnumerationReadback(
	result: AscetReadImplementationResult,
): AscetEnumerationReadback | undefined {
	return result.ok ? parseAscetIndependentEnumerationReadback(result.data) : undefined;
}

export function formatReadImplementationResult(result: AscetReadImplementationResult): string {
	return formatAscetCliJsonResult("read_implementation", result, { largeSuccess: "inline" });
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

export interface AscetReadElementParams {
	componentPath: string;
	elementName: string;
	timeoutMs?: number;
}

export interface RunAscetReadElementOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	agentId?: string;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetReadElementResult = AscetCliJsonResult;

export const ascetReadElementParameters = Type.Object({
	componentPath: Type.String({ description: "Exact ASCET code component path.", minLength: 1 }),
	elementName: Type.String({ description: "Exact Element name in the component.", minLength: 1 }),
	timeoutMs: Type.Optional(
		Type.Integer({
			description: "Optional read_element execution timeout in milliseconds. Defaults to 120000.",
			minimum: 1_000,
			maximum: 300_000,
		}),
	),
});

export function buildReadElementArgs(params: AscetReadElementParams): string[] {
	return ["exec", "read_element_catalog", normalizeAscetPath(params.componentPath), "--json"];
}

export async function runAscetReadElement(
	params: AscetReadElementParams,
	options: RunAscetReadElementOptions,
): Promise<AscetReadElementResult> {
	const result = await runAscetCliJson(buildReadElementArgs(params), {
		...options,
		timeoutMs: params.timeoutMs ?? options.timeoutMs ?? 120_000,
		toolName: "ascet_read",
		commandId: "read_element_catalog",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
	if (!result.ok) {
		return result;
	}

	const element = findExactElement(result.data, params.elementName);
	if (!element) {
		return {
			...result,
			ok: false,
			data: null,
			stage: "result",
			error: {
				code: "element_not_found",
				message: `No ASCET Element named '${params.elementName}' was found in '${params.componentPath}'.`,
			},
		};
	}

	const data = {
		ok: true,
		result: {
			componentPath: params.componentPath,
			element,
		},
	};
	return { ...result, data, stdout: JSON.stringify(data) };
}

export function formatReadElementResult(result: AscetReadElementResult): string {
	return formatAscetCliJsonResult("read_element", result, { largeSuccess: "inline" });
}

function findExactElement(data: unknown, elementName: string): Record<string, unknown> | undefined {
	const payload = unwrapToolSuccessPayload(data);
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return undefined;
	}
	const elements = (payload as Record<string, unknown>).elements;
	if (!Array.isArray(elements)) {
		return undefined;
	}
	return elements.find((candidate): candidate is Record<string, unknown> => {
		return (
			candidate !== null &&
			typeof candidate === "object" &&
			!Array.isArray(candidate) &&
			(candidate as Record<string, unknown>).name === elementName
		);
	});
}

import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { runAscetReadMethodCode } from "./read-method-code.ts";

export interface AscetDiffMethodCodeParams {
	leftComponentPath: string;
	rightComponentPath: string;
	methodName: string;
	changesOnly?: boolean;
	timeoutMs?: number;
}

export interface RunAscetDiffMethodCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export type AscetDiffMethodCodeResult = AscetCliJsonResult;

export const ascetDiffMethodCodeParameters = Type.Object({
	leftComponentPath: Type.String({ description: "Left ASCET component path.", minLength: 1 }),
	rightComponentPath: Type.String({ description: "Right ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name.", minLength: 1 }),
	changesOnly: Type.Optional(Type.Boolean({ description: "Only include changed sections in the diff response." })),
	timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
});

export function buildDiffMethodCodeArgs(params: AscetDiffMethodCodeParams): string[] {
	if (typeof params.leftComponentPath !== "string" || params.leftComponentPath.length === 0) {
		throw new Error("leftPath is required for ascet_diff.diff_method.");
	}
	if (typeof params.rightComponentPath !== "string" || params.rightComponentPath.length === 0) {
		throw new Error("rightPath is required for ascet_diff.diff_method.");
	}
	if (typeof params.methodName !== "string" || params.methodName.length === 0) {
		throw new Error("methodName is required for ascet_diff.diff_method.");
	}
	const args = [
		"exec",
		"diff_method_code",
		normalizeAscetPath(params.leftComponentPath),
		normalizeAscetPath(params.rightComponentPath),
		params.methodName,
	];
	if (params.changesOnly) {
		args.push("--changes-only");
	}
	args.push("--json");
	return args;
}

export async function runAscetDiffMethodCode(
	params: AscetDiffMethodCodeParams,
	options: RunAscetDiffMethodCodeOptions,
): Promise<AscetDiffMethodCodeResult> {
	const effectiveOptions = params.timeoutMs === undefined ? options : { ...options, timeoutMs: params.timeoutMs };
	const diffResult = await runAscetCliJson(buildDiffMethodCodeArgs(params), effectiveOptions);
	if (diffResult.ok || diffResult.timedOut || diffResult.aborted || effectiveOptions.signal?.aborted === true) {
		return diffResult;
	}

	const startedAt = Date.now();
	const left = await runAscetReadMethodCode(
		{ componentPath: normalizeAscetPath(params.leftComponentPath), methodName: params.methodName },
		effectiveOptions,
	);
	if (!left.ok) {
		return diffResult;
	}
	const remainingTimeoutMs =
		effectiveOptions.timeoutMs === undefined
			? undefined
			: Math.max(1, effectiveOptions.timeoutMs - (Date.now() - startedAt));
	const right = await runAscetReadMethodCode(
		{ componentPath: normalizeAscetPath(params.rightComponentPath), methodName: params.methodName },
		{ ...effectiveOptions, timeoutMs: remainingTimeoutMs },
	);
	if (!right.ok) {
		return diffResult;
	}

	const leftPayload = unwrapMethodPayload(left.data);
	const rightPayload = unwrapMethodPayload(right.data);
	if (!leftPayload || !rightPayload) {
		return diffResult;
	}
	const leftCode = typeof leftPayload.code === "string" ? leftPayload.code : "";
	const rightCode = typeof rightPayload.code === "string" ? rightPayload.code : "";
	const changed = leftCode !== rightCode;
	const payload = {
		leftTargetKey: `${normalizeAscetPath(params.leftComponentPath)}::${params.methodName}`,
		rightTargetKey: `${normalizeAscetPath(params.rightComponentPath)}::${params.methodName}`,
		methodName: params.methodName,
		leftComponentKind: normalizeKind(leftPayload.componentKind),
		rightComponentKind: normalizeKind(rightPayload.componentKind),
		leftLanguageKind: stringValue(leftPayload.languageKind),
		rightLanguageKind: stringValue(rightPayload.languageKind),
		methodKind: stringValue(leftPayload.methodKind) || stringValue(rightPayload.methodKind),
		changed,
		summary: changed
			? `Method '${params.methodName}' changed between the two components.`
			: "No method code changes.",
		leftCode: params.changesOnly && !changed ? undefined : leftCode,
		rightCode: params.changesOnly && !changed ? undefined : rightCode,
		source: "local_read_fallback",
	};
	const output = JSON.stringify({ ok: true, result: payload, error: null });
	return {
		ok: true,
		data: payload,
		request: diffResult.request,
		stdout: output,
		stderr: diffResult.stderr,
		exitCode: 0,
		timedOut: false,
		operationId: diffResult.operationId ?? "diff_method_code",
		stage: undefined,
	};
}

function unwrapMethodPayload(data: unknown): Record<string, unknown> | undefined {
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return undefined;
	}
	const record = data as Record<string, unknown>;
	if (record.result !== null && typeof record.result === "object" && !Array.isArray(record.result)) {
		return record.result as Record<string, unknown>;
	}
	return record;
}

function stringValue(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function normalizeKind(value: unknown): string {
	const kind = stringValue(value).trim().toLowerCase();
	if (kind === "class" || kind === "module" || kind === "statemachine" || kind === "state_machine") {
		return kind === "state_machine" ? "stateMachine" : kind;
	}
	return "unknown";
}

export function formatDiffMethodCodeResult(result: AscetDiffMethodCodeResult): string {
	return formatAscetCliJsonResult("diff_method_code", result);
}

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { Type } from "typebox";
import { type AscetCliExecutionResult, type AscetCliJsonResult, type AscetCliRequest, runAscetCliJson } from "./cli.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { resolveAscetStatusPaths } from "./status.ts";

export const ascetSearchModes = [
	"comp",
	"comp-ref",
	"method",
	"method-ref",
	"method-element",
	"element",
	"element-ref",
	"sender",
	"receiver",
	"text",
] as const;

export type AscetSearchMode = (typeof ascetSearchModes)[number];

export interface AscetSearchParams {
	mode: AscetSearchMode;
	q: string;
	limit?: number;
}

export interface RunAscetSearchOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	agentId?: string;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

export interface AscetSearchSuccess {
	count: number;
	items: unknown[];
	more?: true;
	searchMs: number;
	queueWaitMs: number;
}

export type AscetSearchNormalizedResult =
	| { ok: true; data: AscetSearchSuccess }
	| { ok: false; error: { code: string; message: string } };

const DEFAULT_LIMIT = 20;
const DEFAULT_TIMEOUT_MS = 300_000;

export const ascetSearchParameters = Type.Object(
	{
		mode: Type.String({ enum: [...ascetSearchModes] }),
		q: Type.String({ minLength: 1, maxLength: 512 }),
		limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
	},
	{ additionalProperties: false },
);

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function parseJsonRecord(value: string): Record<string, unknown> | undefined {
	const text = value.trim();
	if (!text) return undefined;
	try {
		return asRecord(JSON.parse(text));
	} catch {
		return undefined;
	}
}

export function resolveAscetSearchPath(options: { cwd: string; env?: Record<string, string | undefined> }): string {
	const cwd = resolve(options.cwd);
	const env = options.env ?? process.env;
	const override = env.ASCET_SEARCH_PATH?.trim();
	if (override) return resolve(cwd, override);

	const status = resolveAscetStatusPaths({ cwd, env });
	const candidates = [
		resolve(dirname(status.cliPath), "AscetSearch.exe"),
		resolve(status.extensionRoot, "ascet-cli/bin/AscetSearch.exe"),
	];
	if (status.ascetAgentRoot) {
		candidates.push(
			resolve(status.ascetAgentRoot, "ascetcli/output/ascet-search/AscetSearch.exe"),
			resolve(status.ascetAgentRoot, "src/ascetcli/output/ascet-search/AscetSearch.exe"),
		);
	}
	candidates.push(
		resolve(cwd, "ascetcli/output/ascet-search/AscetSearch.exe"),
		resolve(cwd, "src/ascetcli/output/ascet-search/AscetSearch.exe"),
	);
	return candidates.find((candidate) => existsSync(candidate)) ?? candidates[0];
}

export async function runAscetSearch(
	params: AscetSearchParams,
	options: RunAscetSearchOptions,
): Promise<AscetCliJsonResult> {
	const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
	const cliPath = resolveAscetSearchPath(options);
	const args = [params.mode, params.q, "-n", String(params.limit ?? DEFAULT_LIMIT), "-t", String(timeoutMs)];
	if (!existsSync(cliPath)) {
		return {
			ok: false,
			data: null,
			request: { cwd: options.cwd, cliPath, args, timeoutMs, jobKind: "read", mutatesDatabase: false },
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			operationId: `native_search_${params.mode}`,
			stage: "preflight",
			error: {
				code: "ascet_search_missing",
				message: `ASCET Search CLI not found: ${cliPath}`,
			},
		};
	}
	return runAscetCliJson(args, {
		cwd: options.cwd,
		cliPath,
		env: options.env,
		signal: options.signal,
		timeoutMs,
		queueTimeoutMs: timeoutMs,
		agentId: options.agentId,
		toolName: "ascet_search",
		commandId: `native_search_${params.mode}`,
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
		processName: "AscetSearch.exe",
		responseProtocol: "raw-json",
		scheduler: options.scheduler,
		executeCli: options.executeCli,
	});
}

export function normalizeAscetSearchResult(
	params: AscetSearchParams,
	result: AscetCliJsonResult,
): AscetSearchNormalizedResult {
	if (!result.ok) {
		const cliError = parseJsonRecord(result.stderr) ?? parseJsonRecord(result.stdout);
		return {
			ok: false,
			error: {
				code:
					typeof cliError?.code === "string" && cliError.code.length > 0
						? cliError.code
						: (result.error?.code ?? "ascet_search_failed"),
				message:
					typeof cliError?.error === "string" && cliError.error.length > 0
						? cliError.error
						: (result.error?.message ?? "ASCET Search failed."),
			},
		};
	}

	const payload = asRecord(result.data);
	if (
		payload?.ok !== true ||
		payload.mode !== params.mode ||
		typeof payload.count !== "number" ||
		!Number.isInteger(payload.count) ||
		payload.count < 0 ||
		!Array.isArray(payload.items) ||
		typeof payload.ms !== "number" ||
		typeof payload.waitMs !== "number"
	) {
		return {
			ok: false,
			error: {
				code: "ascet_search_invalid_response",
				message: "ASCET Search returned an invalid response.",
			},
		};
	}

	return {
		ok: true,
		data: {
			count: payload.count,
			items: payload.items,
			...(payload.more === true ? { more: true } : {}),
			searchMs: payload.ms,
			queueWaitMs: payload.waitMs,
		},
	};
}

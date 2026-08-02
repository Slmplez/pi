import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import {
	ensureAscetSearchIndex,
	getAscetSearchIndexState,
	isUsableSqliteSearchResult,
	queryAscetTextCodeIndex,
} from "./search-index.ts";

export interface AscetSearchTextCodeParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	methodName?: string;
	section?: "auto" | "body" | "all" | "header" | "external-c";
	match?: "exact" | "glob" | "contains";
	limit?: number;
	cursor?: string;
}

export interface RunAscetSearchTextCodeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

function normalizeComponentPath(value: string): string {
	return value
		.trim()
		.replace(/\//g, "\\")
		.replace(/^\\+|\\+$/g, "");
}

function normalizeMatchMode(value: string | undefined): "exact" | "glob" | "contains" {
	return value === "exact" || value === "glob" || value === "contains" ? value : "contains";
}

function normalizeLimit(value: number | undefined): number {
	return Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : 20;
}

function normalizeCursor(value: string | undefined): number {
	const parsed = Number.parseInt(value?.trim() || "0", 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`, "i");
}

function isSearchIndexDisabled(env: Record<string, string | undefined> | undefined): boolean {
	return (env?.PI_ASCET_SEARCH_INDEX ?? process.env.PI_ASCET_SEARCH_INDEX) === "0";
}

function getConfiguredMaxTextChars(env: Record<string, string | undefined> | undefined): number | undefined {
	const configured = env?.PI_ASCET_SEARCH_INDEX_MAX_TEXT_CHARS ?? process.env.PI_ASCET_SEARCH_INDEX_MAX_TEXT_CHARS;
	if (configured === undefined || configured.trim() === "") {
		return undefined;
	}
	const parsed = Number(configured);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function getIndexedMatchCount(result: AscetCliJsonResult): number {
	const data = result.data;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return 0;
	}
	const payload = (data as { result?: unknown }).result;
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return 0;
	}
	const matches = (payload as { matches?: unknown }).matches;
	return Array.isArray(matches) ? matches.length : 0;
}

function canUseTextCodeIndexResult(result: AscetCliJsonResult): boolean {
	if (isUsableSqliteSearchResult(result)) {
		return true;
	}
	const state = getAscetSearchIndexState();
	if (!result.ok || state.status !== "ready") {
		return false;
	}
	return state.scanComplete || getIndexedMatchCount(result) > 0;
}

function buildReadTextCodeArgs(params: AscetSearchTextCodeParams): string[] {
	if (!params.componentPath) {
		throw new Error("componentPath is required for read_text_code fallback.");
	}
	const args = ["exec", "read_text_code", normalizeComponentPath(params.componentPath)];
	if (params.methodName) {
		args.push("--method-name", params.methodName);
	}
	if (params.section) {
		args.push("--section", params.section);
	}
	args.push("--json");
	return args;
}

function unwrapResult(data: unknown): Record<string, unknown> | undefined {
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return undefined;
	}
	const envelope = data as { result?: unknown };
	if (envelope.result !== null && typeof envelope.result === "object" && !Array.isArray(envelope.result)) {
		return envelope.result as Record<string, unknown>;
	}
	return data as Record<string, unknown>;
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function lineMatches(line: string, query: string, matchMode: "exact" | "glob" | "contains", pattern?: RegExp): boolean {
	if (matchMode === "exact") {
		return line.trim().toLowerCase() === query.toLowerCase();
	}
	if (matchMode === "glob") {
		return pattern?.test(line) ?? false;
	}
	return line.toLowerCase().includes(query.toLowerCase());
}

function fallbackMatches(params: AscetSearchTextCodeParams, payload: Record<string, unknown>) {
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const text = asString(payload.text);
	const pattern = matchMode === "glob" ? globToRegExp(query) : undefined;
	const allMatches = text
		.split(/\r?\n/)
		.map((line, index) => ({ line, lineNumber: index + 1 }))
		.filter((entry) => lineMatches(entry.line, query, matchMode, pattern));
	const page = allMatches.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, allMatches.length);
	const pageComplete = nextCursor >= allMatches.length;
	const componentPath = asString(payload.componentPath) || normalizeComponentPath(params.componentPath ?? "");
	const section = asString(payload.section) || params.section || "auto";
	const methodName = asString(payload.methodName) || params.methodName || "";
	return {
		query,
		componentPath,
		scopePath: params.scopePath ?? "",
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete: pageComplete,
		truncated: !pageComplete,
		truncationReason: pageComplete ? "" : "result_limit",
		filters: {
			methodName,
			section,
			limit,
		},
		counts: {
			matches: page.length,
			totalCandidates: allMatches.length,
			candidatesVisited: allMatches.length,
		},
		matches: page.map((entry) => ({
			componentPath,
			componentKind: asString(payload.componentKind),
			componentLanguageKind: asString(payload.languageKind),
			section,
			methodName,
			methodKind: "",
			text: "",
			path: `${componentPath}${methodName ? `::${methodName}` : ""}#${section}`,
			lineNumber: entry.lineNumber,
			snippet: entry.line.trim(),
		})),
		source: "read_text_code_fallback",
	};
}

function buildIndexUnavailableResult(
	params: AscetSearchTextCodeParams,
	options: RunAscetSearchTextCodeOptions,
): AscetCliJsonResult {
	const data = {
		ok: false,
		result: null,
		error: {
			code: "text_code_index_unavailable",
			message:
				"Text code search needs a warmed quick-search index or a componentPath for scoped read_text_code fallback.",
		},
		meta: {
			mode: "index",
			operation: "search_text_code",
		},
	};
	const stdout = JSON.stringify(data);
	return {
		ok: false,
		data,
		request: {
			cwd: options.cwd,
			cliPath: "quick_search_index",
			args: ["index", "search_text_code", params.query],
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout,
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: {
			code: "text_code_index_unavailable",
			message: data.error.message,
		},
	};
}

async function runScopedFallback(
	params: AscetSearchTextCodeParams,
	options: RunAscetSearchTextCodeOptions,
): Promise<AscetCliJsonResult> {
	if (!params.componentPath) {
		return buildIndexUnavailableResult(params, options);
	}

	const readResult = await runAscetCliJson(buildReadTextCodeArgs(params), {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		executeCli: options.executeCli,
		commandId: "read_text_code",
		toolName: "ascet_search",
		jobKind: "read",
	});
	if (!readResult.ok) {
		return readResult;
	}

	const payload = unwrapResult(readResult.data);
	if (!payload) {
		return readResult;
	}
	const resultPayload = fallbackMatches(params, payload);
	const data = {
		ok: true,
		result: resultPayload,
		error: null,
		meta: {
			mode: "fallback",
			operation: "search_text_code",
			source: "read_text_code_fallback",
		},
	};

	return {
		...readResult,
		ok: true,
		data,
		stdout: JSON.stringify(data),
	};
}

export async function runAscetSearchTextCode(
	params: AscetSearchTextCodeParams,
	options: RunAscetSearchTextCodeOptions,
): Promise<AscetCliJsonResult> {
	if (!isSearchIndexDisabled(options.env)) {
		const indexed = queryAscetTextCodeIndex(params, { cwd: options.cwd, env: options.env });
		if (indexed && canUseTextCodeIndexResult(indexed)) {
			return indexed;
		}

		if (!params.componentPath) {
			const warmup = await ensureAscetSearchIndex({
				cwd: options.cwd,
				env: options.env,
				signal: options.signal,
				timeoutMs: options.timeoutMs,
				partition: "text_code",
				includeTextCode: true,
				maxTextChars: getConfiguredMaxTextChars(options.env),
				executeCli: options.executeCli,
				toolName: "ascet_search",
			});
			if (warmup.ok) {
				const warmed = queryAscetTextCodeIndex(params, { cwd: options.cwd, env: options.env });
				if (warmed && canUseTextCodeIndexResult(warmed)) {
					return warmed;
				}
			}
		}
	}

	return runScopedFallback(params, options);
}

export function formatSearchTextCodeResult(result: AscetCliJsonResult): string {
	return formatAscetCliJsonResult("search_text_code", result);
}

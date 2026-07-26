import {
	type AscetSearchIndexWarmupOptions,
	type AscetSearchIndexWarmupResult,
	ensureAscetSearchIndex,
} from "./search-index.ts";
import { ASCET_REQUIRED_P0_INDEX_AREAS } from "./search-index-sqlite/schema.ts";
import { getAscetSqliteIndexStatus } from "./search-index-sqlite/status.ts";
import type { AscetSqliteIndexStatus } from "./search-index-sqlite/types.ts";
import { type AscetStatusPathOptions, type AscetStatusReport, createAscetStatusReport } from "./status.ts";

export interface AscetRuntimeProbeReport {
	ok: boolean;
	commandId: "warm_search_index";
	description: string;
	databaseName: string;
	databasePath: string;
	entryCount: number;
	elapsedMs: number;
	scanComplete: boolean;
	fromCache: boolean;
	error?: {
		code: string;
		message: string;
	};
	exitCode: number | null;
	timedOut: boolean;
	stdout: string;
	stderr: string;
}

export interface AscetRuntimeStatusReport extends Omit<AscetStatusReport, "ok" | "summary"> {
	ok: boolean;
	installationOk: boolean;
	runtimeOk: boolean;
	runtime: AscetRuntimeProbeReport;
	index: AscetSqliteIndexStatus;
	summary: string;
}

export interface AscetRuntimeStatusOptions extends AscetStatusPathOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
	warmSearchIndex?: (options: AscetRuntimeProbeOptions) => Promise<AscetSearchIndexWarmupResult>;
}

type AscetRuntimeProbeOptions = Pick<AscetSearchIndexWarmupOptions, "cwd" | "env" | "signal"> & {
	timeoutMs: number;
	partition: "p0";
	forceRefresh: false;
	includeTextCode: true;
	scanTimeoutMs: number;
	toolName: "ascet_status";
};

const RUNTIME_PROBE_DESCRIPTION = "ASCET quick-search P0 index: SQLite active generation";
const RUNTIME_FAILURE_NEXT_STEP =
	"Next step: open the target database in ASCET GUI, wait for the startup index refresh, then rerun ascet_status.";
const REQUIRED_P0_AREAS = new Set<string>(ASCET_REQUIRED_P0_INDEX_AREAS);

function formatAreaStatus(index: AscetSqliteIndexStatus): string[] {
	const rows = index.areas
		.filter((area) => REQUIRED_P0_AREAS.has(area.area))
		.map((area) => {
			const marker =
				area.status === "ready"
					? "[ok]"
					: area.status === "building"
						? "[..]"
						: area.status === "missing"
							? "[ ]"
							: "[x]";
			const suffix =
				area.status === "failed" || area.status === "stale"
					? ` ${area.errorCode || area.status}${area.errorMessage ? `: ${area.errorMessage}` : ""}`
					: "";
			return `${marker} ${area.area.padEnd(22)} ${area.itemCount}${suffix}`;
		});
	return rows;
}

function formatRuntimeProbe(report: AscetRuntimeProbeReport, index: AscetSqliteIndexStatus): string {
	if (report.ok) {
		return [
			`ASCET quick-search index: ${index.status === "stale" ? "stale" : "ready"}`,
			`  ${RUNTIME_PROBE_DESCRIPTION}`,
			`  database: ${report.databaseName || "(unknown)"}`,
			`  entries: ${report.entryCount}`,
			`  scanComplete: ${report.scanComplete}`,
			`  elapsedMs: ${report.elapsedMs}`,
			`  storage: sqlite`,
			...formatAreaStatus(index),
		]
			.filter((line): line is string => line !== null)
			.join("\n");
	}
	return [
		`ASCET quick-search index: FAILED (${report.error?.code ?? "unknown"})`,
		`  ${RUNTIME_PROBE_DESCRIPTION}`,
		report.error?.message ? `  ${report.error.message}` : null,
		report.timedOut ? "  timed out: true" : null,
		report.stderr.trim() ? `  stderr: ${report.stderr.trim()}` : null,
		report.stdout.trim() ? `  stdout: ${report.stdout.trim()}` : null,
		...formatAreaStatus(index),
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

function createRuntimeSummary(
	installation: AscetStatusReport,
	runtime: AscetRuntimeProbeReport,
	index: AscetSqliteIndexStatus,
): string {
	return [
		`ASCET status: ${installation.ok && runtime.ok ? "ready" : "not ready"}`,
		`ASCET installation: ${installation.ok ? "ready" : "not ready"}`,
		`ASCET runtime: ${runtime.ok ? "ready" : "not ready"}`,
		...installation.summary.split("\n").slice(1),
		formatRuntimeProbe(runtime, index),
		installation.ok && !runtime.ok ? RUNTIME_FAILURE_NEXT_STEP : null,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

function toRuntimeProbeReport(result: AscetSearchIndexWarmupResult): AscetRuntimeProbeReport {
	return {
		ok: result.ok,
		commandId: "warm_search_index",
		description: RUNTIME_PROBE_DESCRIPTION,
		databaseName: result.databaseName,
		databasePath: result.databasePath,
		entryCount: result.entryCount,
		elapsedMs: result.elapsedMs,
		scanComplete: result.scanComplete,
		fromCache: result.fromCache,
		error: result.error,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

function runtimeProbeReportFromSqliteStatus(index: AscetSqliteIndexStatus): AscetRuntimeProbeReport {
	const ready = index.status === "ready";
	const usable = ready || index.status === "stale";
	return {
		ok: usable,
		commandId: "warm_search_index",
		description: RUNTIME_PROBE_DESCRIPTION,
		databaseName: index.databaseName,
		databasePath: index.databasePath,
		entryCount: index.areas.reduce((total, area) => total + area.itemCount, 0),
		elapsedMs: index.elapsedMs,
		scanComplete: index.areas.length > 0 && index.areas.every((area) => area.scanComplete),
		fromCache: true,
		error: usable
			? undefined
			: {
					code: index.status === "missing" ? "search_index_missing" : `search_index_${index.status}`,
					message:
						index.status === "missing"
							? "ASCET SQLite P0 quick-search index is missing."
							: `ASCET SQLite P0 quick-search index is ${index.status}.`,
				},
		exitCode: null,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

function disabledRuntimeProbeReport(): AscetRuntimeProbeReport {
	return {
		ok: false,
		commandId: "warm_search_index",
		description: RUNTIME_PROBE_DESCRIPTION,
		databaseName: "",
		databasePath: "",
		entryCount: 0,
		elapsedMs: 0,
		scanComplete: false,
		fromCache: false,
		error: {
			code: "search_index_disabled",
			message: "ASCET quick-search index warmup is disabled by PI_ASCET_SEARCH_INDEX=0.",
		},
		exitCode: null,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

function createRuntimeProbeOptions(options: {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs: number;
}): AscetRuntimeProbeOptions {
	return {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		partition: "p0",
		forceRefresh: false,
		includeTextCode: true,
		scanTimeoutMs: Math.min(options.timeoutMs, 90_000),
		toolName: "ascet_status",
	};
}

async function defaultRuntimeProbe(options: AscetRuntimeProbeOptions): Promise<AscetSearchIndexWarmupResult> {
	return ensureAscetSearchIndex(options);
}

export async function createAscetRuntimeStatusReport(
	options: AscetRuntimeStatusOptions,
): Promise<AscetRuntimeStatusReport> {
	const installation = createAscetStatusReport(options);
	const timeoutMs = options.timeoutMs ?? 60_000;
	const warmSearchIndex = options.warmSearchIndex ?? defaultRuntimeProbe;
	const index = getAscetSqliteIndexStatus(options.cwd);
	const runtime = installation.ok
		? options.warmSearchIndex
			? toRuntimeProbeReport(
					await warmSearchIndex(
						createRuntimeProbeOptions({ cwd: options.cwd, env: options.env, signal: options.signal, timeoutMs }),
					),
				)
			: (options.env?.PI_ASCET_SEARCH_INDEX ?? process.env.PI_ASCET_SEARCH_INDEX) === "0"
				? disabledRuntimeProbeReport()
				: runtimeProbeReportFromSqliteStatus(index)
		: {
				ok: false,
				commandId: "warm_search_index" as const,
				description: RUNTIME_PROBE_DESCRIPTION,
				databaseName: "",
				databasePath: "",
				entryCount: 0,
				elapsedMs: 0,
				scanComplete: false,
				fromCache: false,
				error: {
					code: "ascet_installation_not_ready",
					message: "ASCET CLI executable or contract catalog is missing; quick-search index warmup was skipped.",
				},
				exitCode: null,
				timedOut: false,
				stdout: "",
				stderr: "",
			};

	return {
		...installation,
		ok: installation.ok && runtime.ok,
		installationOk: installation.ok,
		runtimeOk: runtime.ok,
		runtime,
		index,
		summary: createRuntimeSummary(installation, runtime, index),
	};
}

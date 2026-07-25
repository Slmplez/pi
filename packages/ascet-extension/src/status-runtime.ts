import {
	type AscetSearchIndexWarmupOptions,
	type AscetSearchIndexWarmupResult,
	ensureAscetSearchIndex,
} from "./search-index.ts";
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
	summary: string;
}

export interface AscetRuntimeStatusOptions extends AscetStatusPathOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
	warmSearchIndex?: (options: AscetRuntimeProbeOptions) => Promise<AscetSearchIndexWarmupResult>;
}

type AscetRuntimeProbeOptions = Pick<AscetSearchIndexWarmupOptions, "cwd" | "env" | "signal"> & {
	timeoutMs: number;
	partition: "components";
	forceRefresh: true;
	scanTimeoutMs: number;
	toolName: "ascet_status";
};

const RUNTIME_PROBE_DESCRIPTION =
	"ASCET quick-search index warmup: AscetCli.exe exec warm_search_index --partition components --force --json";
const RUNTIME_FAILURE_NEXT_STEP =
	"Next step: start ASCET GUI with ToolAPI enabled, then rerun ascet_status or the ASCET command. If ASCET is already open, verify the ToolAPI connection/profile.";

function formatRuntimeProbe(report: AscetRuntimeProbeReport): string {
	if (report.ok) {
		return [
			"ASCET quick-search index: ready",
			`  ${RUNTIME_PROBE_DESCRIPTION}`,
			`  database: ${report.databaseName || "(unknown)"}`,
			`  entries: ${report.entryCount}`,
			`  scanComplete: ${report.scanComplete}`,
			`  elapsedMs: ${report.elapsedMs}`,
			report.fromCache ? "  source: memory cache" : null,
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
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

function createRuntimeSummary(installation: AscetStatusReport, runtime: AscetRuntimeProbeReport): string {
	return [
		`ASCET status: ${installation.ok && runtime.ok ? "ready" : "not ready"}`,
		`ASCET installation: ${installation.ok ? "ready" : "not ready"}`,
		`ASCET runtime: ${runtime.ok ? "ready" : "not ready"}`,
		...installation.summary.split("\n").slice(1),
		formatRuntimeProbe(runtime),
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
		partition: "components",
		forceRefresh: true,
		scanTimeoutMs: Math.min(options.timeoutMs, 15_000),
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
	const runtime = installation.ok
		? toRuntimeProbeReport(
				await warmSearchIndex(
					createRuntimeProbeOptions({ cwd: options.cwd, env: options.env, signal: options.signal, timeoutMs }),
				),
			)
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
		summary: createRuntimeSummary(installation, runtime),
	};
}

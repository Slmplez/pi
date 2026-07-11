import type { AscetCliJsonResult } from "./cli.ts";
import { runAscetCliJson } from "./cli.ts";
import { type AscetStatusPathOptions, type AscetStatusReport, createAscetStatusReport } from "./status.ts";

export interface AscetRuntimeProbeReport {
	ok: boolean;
	commandId: "list_folders";
	description: string;
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
	probe?: (options: {
		cwd: string;
		env?: Record<string, string | undefined>;
		signal?: AbortSignal;
		timeoutMs: number;
	}) => Promise<AscetCliJsonResult>;
}

const RUNTIME_PROBE_DESCRIPTION = "ASCET ToolAPI live probe: AscetCli.exe exec list_folders --depth 0 --json";

function formatRuntimeProbe(report: AscetRuntimeProbeReport): string {
	if (report.ok) {
		return `ASCET runtime probe: OK\n  ${RUNTIME_PROBE_DESCRIPTION}`;
	}
	return [
		`ASCET runtime probe: FAILED (${report.error?.code ?? "unknown"})`,
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
	].join("\n");
}

function toRuntimeProbeReport(result: AscetCliJsonResult): AscetRuntimeProbeReport {
	return {
		ok: result.ok,
		commandId: "list_folders",
		description: RUNTIME_PROBE_DESCRIPTION,
		error: result.error,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

async function defaultRuntimeProbe(options: {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs: number;
}): Promise<AscetCliJsonResult> {
	return runAscetCliJson(["exec", "list_folders", "--depth", "0", "--json"], {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		commandId: "status_runtime_probe",
		toolName: "ascet_status",
		jobKind: "read",
		queueTimeoutMs: Math.min(options.timeoutMs, 15_000),
	});
}

export async function createAscetRuntimeStatusReport(
	options: AscetRuntimeStatusOptions,
): Promise<AscetRuntimeStatusReport> {
	const installation = createAscetStatusReport(options);
	const timeoutMs = options.timeoutMs ?? 20_000;
	const probe = options.probe ?? defaultRuntimeProbe;
	const runtime = installation.ok
		? toRuntimeProbeReport(await probe({ cwd: options.cwd, env: options.env, signal: options.signal, timeoutMs }))
		: {
				ok: false,
				commandId: "list_folders" as const,
				description: RUNTIME_PROBE_DESCRIPTION,
				error: {
					code: "ascet_installation_not_ready",
					message: "ASCET CLI executable or contract catalog is missing; runtime probe was skipped.",
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

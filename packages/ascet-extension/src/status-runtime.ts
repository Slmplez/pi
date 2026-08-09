import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { type AscetSchedulerStatusReport, createAscetSchedulerStatusReport } from "./scheduler/status.ts";
import { type AscetStatusPathOptions, type AscetStatusReport, createAscetStatusReport } from "./status.ts";

export interface AscetRuntimeProbeReport {
	ok: boolean;
	commandId: "selftest";
	description: string;
	elapsedMs: number;
	error?: {
		code: string;
		message: string;
	};
	exitCode: number | null;
	timedOut: boolean;
	stdout: string;
	stderr: string;
}

export interface AscetDllReport {
	ok: boolean;
	path: string;
}

export interface AscetRuntimeStatusReport extends Omit<AscetStatusReport, "ok" | "summary"> {
	ok: boolean;
	installationOk: boolean;
	dllOk: boolean;
	runtimeOk: boolean;
	schedulerOk: boolean;
	dll: AscetDllReport;
	runtime: AscetRuntimeProbeReport;
	scheduler: AscetSchedulerStatusReport;
	summary: string;
}

export interface AscetLiveToolApiProbeOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs: number;
}

export type AscetLiveToolApiProbe = (options: AscetLiveToolApiProbeOptions) => Promise<AscetCliJsonResult>;

export interface AscetRuntimeStatusOptions extends AscetStatusPathOptions {
	signal?: AbortSignal;
	timeoutMs?: number;
	liveToolApiProbe?: AscetLiveToolApiProbe;
}

const RUNTIME_PROBE_DESCRIPTION = "ASCET live ToolAPI quick self-test";
const RUNTIME_FAILURE_NEXT_STEP =
	"Next step: start ASCET GUI with ToolAPI enabled, verify the target database is open, then rerun ascet_status.";

function resolveAscetDllPath(cliPath: string): string {
	const cliDirectory = dirname(cliPath);
	const candidates = [
		resolve(cliDirectory, "Etas.AscetNET.dll"),
		resolve(cliDirectory, "Ascetapidll", "Etas.AscetNET.dll"),
	];
	return candidates.find((path) => existsSync(path)) ?? candidates[0];
}

function formatDllStatus(dll: AscetDllReport): string {
	return [`ASCET DLL: ${dll.ok ? "ready" : "missing"}`, `  ${dll.path}`].join("\n");
}

function formatRuntimeProbe(report: AscetRuntimeProbeReport): string {
	if (report.ok) {
		return ["ASCET ToolAPI: ready", `  ${report.description}`, `  elapsedMs: ${report.elapsedMs}`].join("\n");
	}
	return [
		`ASCET ToolAPI: FAILED (${report.error?.code ?? "unknown"})`,
		`  ${report.description}`,
		report.error?.message ? `  ${report.error.message}` : null,
		report.timedOut ? "  timed out: true" : null,
		report.stderr.trim() ? `  stderr: ${report.stderr.trim()}` : null,
		report.stdout.trim() ? `  stdout: ${report.stdout.trim()}` : null,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

function createRuntimeSummary(
	installation: AscetStatusReport,
	dll: AscetDllReport,
	runtime: AscetRuntimeProbeReport,
	scheduler: AscetSchedulerStatusReport,
): string {
	return [
		`ASCET status: ${installation.ok && dll.ok && runtime.ok && scheduler.ok ? "ready" : "not ready"}`,
		`ASCET installation: ${installation.ok ? "ready" : "not ready"}`,
		...installation.summary.split("\n").slice(1),
		formatDllStatus(dll),
		formatRuntimeProbe(runtime),
		`ASCET scheduler: ${scheduler.ok ? "ready" : "not ready"}`,
		scheduler.summary,
		installation.ok && dll.ok && !runtime.ok ? RUNTIME_FAILURE_NEXT_STEP : null,
	]
		.filter((line): line is string => line !== null)
		.join("\n");
}

function toRuntimeProbeReport(result: AscetCliJsonResult, elapsedMs: number): AscetRuntimeProbeReport {
	return {
		ok: result.ok,
		commandId: "selftest",
		description: RUNTIME_PROBE_DESCRIPTION,
		elapsedMs,
		error: result.error,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

async function defaultLiveToolApiProbe(options: AscetLiveToolApiProbeOptions): Promise<AscetCliJsonResult> {
	return runAscetCliJson(["selftest", "quick", "--json"], {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		toolName: "ascet_status",
		commandId: "selftest",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
}

function unavailableRuntimeProbeReport(message: string): AscetRuntimeProbeReport {
	return {
		ok: false,
		commandId: "selftest",
		description: RUNTIME_PROBE_DESCRIPTION,
		elapsedMs: 0,
		error: {
			code: "ascet_installation_not_ready",
			message,
		},
		exitCode: null,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

export async function createAscetRuntimeStatusReport(
	options: AscetRuntimeStatusOptions,
): Promise<AscetRuntimeStatusReport> {
	const installation = createAscetStatusReport(options);
	const dllPath = resolveAscetDllPath(installation.paths.cliPath);
	const dll = { ok: existsSync(dllPath), path: dllPath } satisfies AscetDllReport;
	const timeoutMs = options.timeoutMs ?? 60_000;
	const scheduler = await createAscetSchedulerStatusReport("status", { env: options.env });
	const liveToolApiProbe = options.liveToolApiProbe ?? defaultLiveToolApiProbe;
	let runtime: AscetRuntimeProbeReport;

	if (!installation.ok || !dll.ok) {
		runtime = unavailableRuntimeProbeReport(
			!installation.ok
				? "ASCET Bridge executable or contract catalog is missing; live ToolAPI probe was skipped."
				: "Etas.AscetNET.dll is missing; live ToolAPI probe was skipped.",
		);
	} else {
		const startedAt = Date.now();
		runtime = toRuntimeProbeReport(
			await liveToolApiProbe({ cwd: options.cwd, env: options.env, signal: options.signal, timeoutMs }),
			Date.now() - startedAt,
		);
	}

	return {
		...installation,
		ok: installation.ok && dll.ok && runtime.ok && scheduler.ok,
		installationOk: installation.ok,
		dllOk: dll.ok,
		runtimeOk: runtime.ok,
		schedulerOk: scheduler.ok,
		dll,
		runtime,
		scheduler,
		summary: createRuntimeSummary(installation, dll, runtime, scheduler),
	};
}

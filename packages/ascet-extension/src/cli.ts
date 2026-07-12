import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
import { AscetCliLockTimeoutError, acquireAscetCliLock } from "./scheduler/cli-lock.ts";
import {
	AscetSchedulerCancelledError,
	AscetSchedulerExecutionTimeoutError,
	AscetSchedulerQueueTimeoutError,
} from "./scheduler/errors.ts";
import { getGlobalAscetScheduler } from "./scheduler/global.ts";
import { getGlobalAscetOperationHealthStore } from "./scheduler/operation-health.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import type { AscetJobKind } from "./scheduler/types.ts";
import { createAscetStatusReport } from "./status.ts";

export interface AscetCliRequest {
	cwd: string;
	cliPath: string;
	args: string[];
	stdin?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
}

export interface AscetCliExecutionResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	aborted?: boolean;
	request: AscetCliRequest;
}

export interface RunAscetCliJsonOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	stdin?: string;
	acceptedExitCodes?: number[];
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	agentId?: string;
	toolName?: string;
	commandId?: string;
	jobKind?: AscetJobKind;
	queueTimeoutMs?: number;
}

export interface AscetCliJsonResult {
	ok: boolean;
	data: unknown;
	request: AscetCliRequest;
	stdout: string;
	stderr: string;
	exitCode: number | null;
	timedOut: boolean;
	error?: {
		code: string;
		message: string;
	};
}

export function getProcessTreeKillCommand(
	pid: number,
	platform = process.platform,
): { command: string; args: string[] } | undefined {
	if (!Number.isFinite(pid) || pid <= 0) {
		return undefined;
	}
	if (platform === "win32") {
		return { command: "taskkill", args: ["/PID", String(pid), "/T", "/F"] };
	}
	return undefined;
}

function terminateProcess(child: ChildProcess): void {
	if (child.pid === undefined) {
		child.kill();
		return;
	}
	const processTreeKill = getProcessTreeKillCommand(child.pid);
	if (!processTreeKill) {
		child.kill();
		return;
	}
	const killer = spawn(processTreeKill.command, processTreeKill.args, {
		windowsHide: true,
		stdio: "ignore",
	});
	killer.on("error", () => {
		child.kill();
	});
}

export async function executeAscetCli(request: AscetCliRequest): Promise<AscetCliExecutionResult> {
	return new Promise((resolve, reject) => {
		const child = spawn(request.cliPath, request.args, {
			cwd: request.cwd,
			windowsHide: true,
			stdio: request.stdin === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
		});
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let aborted = false;
		let timeout: NodeJS.Timeout | undefined;

		if (request.timeoutMs && request.timeoutMs > 0) {
			timeout = setTimeout(() => {
				timedOut = true;
				terminateProcess(child);
			}, request.timeoutMs);
		}

		const abort = () => {
			aborted = true;
			terminateProcess(child);
		};
		request.signal?.addEventListener("abort", abort, { once: true });

		const stdoutStream = child.stdout;
		const stderrStream = child.stderr;
		if (!stdoutStream || !stderrStream) {
			reject(new Error("ASCET CLI process stdio streams are unavailable."));
			return;
		}
		const stdinStream = child.stdin;
		if (request.stdin !== undefined && !stdinStream) {
			reject(new Error("ASCET CLI process stdin stream is unavailable."));
			return;
		}

		stdoutStream.setEncoding("utf8");
		stderrStream.setEncoding("utf8");
		stdoutStream.on("data", (chunk) => {
			stdout += chunk;
		});
		stderrStream.on("data", (chunk) => {
			stderr += chunk;
		});
		child.on("error", reject);
		child.on("close", (exitCode) => {
			if (timeout) {
				clearTimeout(timeout);
			}
			request.signal?.removeEventListener("abort", abort);
			resolve({ exitCode, stdout, stderr, timedOut, aborted, request });
		});
		if (request.stdin !== undefined) {
			stdinStream?.write(request.stdin);
			stdinStream?.end();
		}
	});
}

function inferCommandId(args: string[]): string {
	if (args[0] === "exec" && args[1]) {
		return args[1];
	}
	if (args[0] === "batch" && args[1]) {
		return `batch_${args[1]}`;
	}
	return args[0] ?? "ascet_cli";
}

function inferJobKind(commandId: string): AscetJobKind {
	if (
		commandId.startsWith("create_") ||
		commandId.startsWith("delete_") ||
		commandId.startsWith("set_") ||
		commandId.startsWith("apply_") ||
		commandId.startsWith("batch_")
	) {
		return "write";
	}
	return "read";
}

async function executeScheduledAscetCli(
	request: AscetCliRequest,
	options: RunAscetCliJsonOptions,
): Promise<AscetCliExecutionResult> {
	const commandId = options.commandId ?? inferCommandId(request.args);
	const toolName = options.toolName ?? "ascet_cli";
	const agentId = options.agentId ?? "system";
	const scheduler = options.scheduler ?? getGlobalAscetScheduler();
	return scheduler.submit({
		agentId,
		toolName,
		commandId,
		kind: options.jobKind ?? inferJobKind(commandId),
		queueTimeoutMs: options.queueTimeoutMs ?? 60_000,
		executionTimeoutMs: (request.timeoutMs ?? 60_000) + 5_000,
		signal: request.signal,
		async run() {
			const lock = await acquireAscetCliLock(
				{
					agentId,
					commandId,
					toolName,
					processName: "AscetCli.exe",
				},
				{
					env: options.env,
					acquireTimeoutMs: Math.min(options.queueTimeoutMs ?? 60_000, 60_000),
				},
			);
			try {
				return await (options.executeCli ?? executeAscetCli)(request);
			} finally {
				await lock.release();
			}
		},
	});
}

function parseJson(text: string): { ok: true; data: unknown } | { ok: false; message: string } {
	const trimmed = text.trim();
	if (!trimmed) {
		return { ok: false, message: "ASCET CLI produced empty stdout; expected JSON." };
	}
	try {
		return { ok: true, data: JSON.parse(trimmed) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, message: `ASCET CLI produced invalid JSON: ${message}` };
	}
}

export async function runAscetCliJson(args: string[], options: RunAscetCliJsonOptions): Promise<AscetCliJsonResult> {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	const commandId = options.commandId ?? inferCommandId(args);
	const request: AscetCliRequest = {
		cwd: options.cwd,
		cliPath: status.paths.cliPath,
		args,
		stdin: options.stdin,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
	};

	if (options.signal?.aborted) {
		return {
			ok: false,
			data: null,
			request,
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			error: {
				code: "ascet_cli_aborted",
				message: "ASCET CLI execution was aborted before it started.",
			},
		};
	}

	if (!existsSync(request.cliPath)) {
		return {
			ok: false,
			data: null,
			request,
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			error: {
				code: "ascet_cli_missing",
				message: `ASCET CLI not found: ${request.cliPath}`,
			},
		};
	}

	let execution: AscetCliExecutionResult;
	try {
		execution = await executeScheduledAscetCli(request, { ...options, commandId });
	} catch (error) {
		const errorCode =
			error instanceof AscetSchedulerQueueTimeoutError
				? "ascet_scheduler_queue_timeout"
				: error instanceof AscetSchedulerExecutionTimeoutError
					? "ascet_scheduler_exec_timeout"
					: error instanceof AscetSchedulerCancelledError
						? "ascet_cli_aborted"
						: error instanceof AscetCliLockTimeoutError
							? "ascet_cli_lock_timeout"
							: "ascet_cli_failed";
		const health = getGlobalAscetOperationHealthStore({ env: options.env });
		if (errorCode === "ascet_scheduler_exec_timeout") {
			health.recordFailure({ commandId, reason: "scheduler_timeout" });
		}
		if (errorCode === "ascet_cli_lock_timeout") {
			health.recordFailure({ commandId, reason: "cli_lock_timeout" });
		}
		await health.flush();
		return {
			ok: false,
			data: null,
			request,
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: error instanceof AscetSchedulerExecutionTimeoutError,
			error: {
				code: errorCode,
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}
	const parsed = parseJson(execution.stdout);
	const aborted = options.signal?.aborted === true || execution.aborted === true;
	const acceptedExitCodes = options.acceptedExitCodes ?? [0];
	const processOk = acceptedExitCodes.includes(execution.exitCode ?? Number.NaN) && !execution.timedOut && !aborted;
	const ok = processOk && parsed.ok;
	const health = getGlobalAscetOperationHealthStore({ env: options.env });
	if (execution.timedOut) {
		health.recordFailure({ commandId, reason: "child_command_timeout" });
	} else if (ok) {
		health.recordSuccess(commandId);
	}
	await health.flush();

	return {
		ok,
		data: parsed.ok ? parsed.data : null,
		request: execution.request,
		stdout: execution.stdout,
		stderr: execution.stderr,
		exitCode: execution.exitCode,
		timedOut: execution.timedOut,
		error: ok
			? undefined
			: {
					code: aborted
						? "ascet_cli_aborted"
						: execution.timedOut
							? "ascet_cli_timeout"
							: processOk
								? "ascet_cli_invalid_json"
								: "ascet_cli_failed",
					message: aborted
						? "ASCET CLI execution was aborted."
						: processOk && !parsed.ok
							? parsed.message
							: execution.stderr.trim() ||
								execution.stdout.trim() ||
								`ASCET CLI exited with ${execution.exitCode}`,
				},
	};
}

export function formatAscetCliJsonResult(operation: string, result: AscetCliJsonResult): string {
	if (result.ok) {
		return JSON.stringify(result.data, null, 2);
	}
	const message = result.error?.message ?? "";
	const runtimeHint =
		result.error?.code === "ascet_cli_failed" && /(ToolAPI|stdio streams are unavailable|runtime)/i.test(message)
			? "hint: ASCET runtime (ToolAPI) is not connected. Start ASCET GUI with ToolAPI enabled, then rerun ascet_status or the ASCET command."
			: "";
	return [
		`ASCET ${operation} failed: ${result.error?.code ?? "unknown"}`,
		message,
		runtimeHint,
		result.stderr ? `stderr:\n${result.stderr.trim()}` : "",
		result.stdout ? `stdout:\n${result.stdout.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

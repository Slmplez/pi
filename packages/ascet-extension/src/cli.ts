import { type ChildProcess, spawn } from "node:child_process";
import { existsSync } from "node:fs";
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
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
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

		child.stdout.setEncoding("utf8");
		child.stderr.setEncoding("utf8");
		child.stdout.on("data", (chunk) => {
			stdout += chunk;
		});
		child.stderr.on("data", (chunk) => {
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
			child.stdin.write(request.stdin);
			child.stdin.end();
		}
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
	const request: AscetCliRequest = {
		cwd: options.cwd,
		cliPath: status.paths.cliPath,
		args,
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

	const execution = await (options.executeCli ?? executeAscetCli)(request);
	const parsed = parseJson(execution.stdout);
	const aborted = options.signal?.aborted === true || execution.aborted === true;
	const processOk = execution.exitCode === 0 && !execution.timedOut && !aborted;
	const ok = processOk && parsed.ok;

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
	return [
		`ASCET ${operation} failed: ${result.error?.code ?? "unknown"}`,
		result.error?.message ?? "",
		result.stderr ? `stderr:\n${result.stderr.trim()}` : "",
		result.stdout ? `stdout:\n${result.stdout.trim()}` : "",
	]
		.filter(Boolean)
		.join("\n");
}

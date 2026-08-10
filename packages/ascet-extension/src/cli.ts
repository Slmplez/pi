import { type ChildProcess, spawn } from "node:child_process";
import { existsSync, mkdirSync } from "node:fs";
import { join } from "node:path";
import { getAscetArtifactRoot, getAscetOutputThresholdBytes, writeAscetFileAtomically } from "./observation-store.ts";
import { AscetCliLockTimeoutError, acquireAscetCliLock } from "./scheduler/cli-lock.ts";
import {
	AscetCliProcessError,
	AscetSchedulerCancelledError,
	AscetSchedulerExecutionTimeoutError,
	AscetSchedulerQueueTimeoutError,
} from "./scheduler/errors.ts";
import { getGlobalAscetScheduler } from "./scheduler/global.ts";
import { getGlobalAscetOperationHealthStore } from "./scheduler/operation-health.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import type { AscetJobKind } from "./scheduler/types.ts";
import { createAscetStatusReport } from "./status.ts";
import { toToolFailurePayload, toToolSuccessPayload } from "./tool-response-contract.ts";

export interface AscetCliRequestData {
	cwd: string;
	cliPath: string;
	args: string[];
	stdin?: string;
	timeoutMs?: number;
	jobKind?: AscetJobKind;
	mutatesDatabase?: boolean;
}

/** Runtime-only request. Never expose this object through tool result details. */
export interface AscetCliRequest extends AscetCliRequestData {
	signal?: AbortSignal;
	onSpawn?: (pid: number) => void | Promise<void>;
}

export interface AscetCliExecutionResult {
	exitCode: number | null;
	stdout: string;
	stderr: string;
	timedOut: boolean;
	aborted?: boolean;
	request: AscetCliRequestData;

	spawnAttempted?: boolean;
	spawnSucceeded?: boolean;
	requestDispatched?: boolean;
	acceptedReceived?: boolean;
	processClosed?: boolean;
	validResponseReceived?: boolean;
	outputLimitExceeded?: "stdout" | "stderr";
}

export interface RunAscetCliJsonOptions {
	cwd: string;
	cliPath?: string;
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
	/** Scheduler resource label. Live ASCET operations should use ascet.toolapi.global. */
	resourceKey?: string;
	queueTimeoutMs?: number;
}

export interface AscetCliJsonResult {
	ok: boolean;
	data: unknown;
	request: AscetCliRequestData;
	stdout: string;
	stderr: string;
	exitCode: number | null;
	timedOut: boolean;
	aborted?: boolean;
	operationId?: string;
	stage?: string;
	diagnostics?: AscetCliFailureDiagnostics;
	error?: {
		code: string;
		message: string;
		stage?: string;
		details?: unknown;
		operation?: string;
	};
	formattedOutputArtifact?: AscetFormattedOutputArtifact;
}

export interface AscetCliStructuredError {
	code: string;
	message: string;
	stage?: string;
	details?: unknown;
	operation?: string;
}

export interface AscetCliFailureDiagnostics {
	operationId: string;
	stage: "preflight" | "scheduler_queue" | "scheduler_exec" | "cli_process" | "json_parse" | "result";
	exitCode: number | null;
	timedOut: boolean;
	aborted: boolean;
	stderrSummary: string;
	stdoutSummary: string;
	retryable: boolean;
}

export interface AscetFormattedOutputArtifact {
	operation: string;
	path: string;
	sizeBytes: number;
	thresholdBytes: number;
	summary: string;
	counts?: Record<string, number>;
	searchHint: string;
}

const MAX_BRIDGE_REQUEST_BYTES = 16 * 1024 * 1024;
const MAX_BRIDGE_STDOUT_BYTES = 16 * 1024 * 1024;
const MAX_BRIDGE_STDERR_BYTES = 2 * 1024 * 1024;

let formatArtifactCounter = 0;

function getFormatArtifactThresholdBytes(): number {
	return getAscetOutputThresholdBytes();
}

function getFormatArtifactRoot(): string {
	return getAscetArtifactRoot();
}

function safeArtifactName(value: string): string {
	const safe = value.replace(/[^A-Za-z0-9_.-]+/g, "_").replace(/^_+|_+$/g, "");
	return safe.length > 0 ? safe.slice(0, 80) : "ascet_cli";
}

function quotePowerShellArg(value: string): string {
	return `'${value.replace(/'/g, "''")}'`;
}

function buildArtifactSearchHint(artifactPath: string): string {
	const quotedPath = quotePowerShellArg(artifactPath);
	return `Search locally with rg -n '<pattern>' ${quotedPath}; preview with Get-Content -Path ${quotedPath} -TotalCount 120.`;
}

function persistFormattedOutput(operation: string, formatted: string): { path: string; sizeBytes: number } {
	const root = getFormatArtifactRoot();
	mkdirSync(root, { recursive: true });
	const artifactPath = join(
		root,
		`${safeArtifactName(operation)}-${process.pid}-${Date.now()}-${formatArtifactCounter++}.json`,
	);
	const content = formatted.endsWith("\n") ? formatted : `${formatted}\n`;
	writeAscetFileAtomically(artifactPath, content);
	return {
		path: artifactPath,
		sizeBytes: Buffer.byteLength(content, "utf8"),
	};
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asNonEmptyString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function stripEmbeddedJsonTail(summary: string): string {
	return summary.replace(/\s+(Readback|Verify):\s*[{[][\s\S]*$/u, "").trim();
}

function extractStructuredSummary(value: unknown): string | undefined {
	const record = asRecord(value);
	if (!record) {
		return undefined;
	}
	const directSummary = asNonEmptyString(record.summary);
	if (directSummary) {
		return stripEmbeddedJsonTail(directSummary);
	}
	return extractStructuredSummary(record.result);
}

function extractCounts(value: unknown): Record<string, number> | undefined {
	const record = asRecord(value);
	if (!record) {
		return undefined;
	}
	const counts = asRecord(record.counts) ?? extractCounts(record.result);
	if (!counts) {
		return undefined;
	}
	const numericCounts: Record<string, number> = {};
	for (const [key, entry] of Object.entries(counts)) {
		if (typeof entry === "number" && Number.isFinite(entry)) {
			numericCounts[key] = entry;
		}
	}
	return Object.keys(numericCounts).length > 0 ? numericCounts : undefined;
}

function formatCounts(counts: Record<string, number> | undefined): string | undefined {
	if (!counts) {
		return undefined;
	}
	return `counts: ${Object.entries(counts)
		.map(([key, value]) => `${key}=${value}`)
		.join(", ")}`;
}

function formatPersistedArtifactMessage(artifact: AscetFormattedOutputArtifact): string {
	return [
		artifact.summary,
		formatCounts(artifact.counts),
		`Stored full ASCET output for ${artifact.operation} at ${artifact.path} (${artifact.sizeBytes} bytes).`,
		artifact.searchHint,
	]
		.filter(Boolean)
		.join("\n");
}

function formatPersistedSuccess(operation: string, result: AscetCliJsonResult, formatted: string): string {
	if (result.formattedOutputArtifact?.operation === operation) {
		return formatPersistedArtifactMessage(result.formattedOutputArtifact);
	}

	const persisted = persistFormattedOutput(operation, formatted);
	const summary = extractStructuredSummary(result.data) ?? `${operation} returned large ASCET JSON output.`;
	const artifact = {
		operation,
		path: persisted.path,
		sizeBytes: persisted.sizeBytes,
		thresholdBytes: getFormatArtifactThresholdBytes(),
		summary,
		counts: extractCounts(result.data),
		searchHint: buildArtifactSearchHint(persisted.path),
	} satisfies AscetFormattedOutputArtifact;
	result.formattedOutputArtifact = artifact;
	return formatPersistedArtifactMessage(artifact);
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

async function terminateProcess(child: ChildProcess): Promise<void> {
	if (child.pid === undefined) {
		child.kill();
		return;
	}
	const processTreeKill = getProcessTreeKillCommand(child.pid);
	if (!processTreeKill) {
		child.kill();
		return;
	}
	await new Promise<void>((resolve) => {
		const killer = spawn(processTreeKill.command, processTreeKill.args, {
			windowsHide: true,
			stdio: "ignore",
		});
		let settled = false;
		const finish = () => {
			if (!settled) {
				settled = true;
				resolve();
			}
		};
		killer.once("error", () => {
			child.kill();
			finish();
		});
		killer.once("close", (exitCode) => {
			if (exitCode !== 0) child.kill();
			finish();
		});
	});
}

function createAscetCliRequestData(request: AscetCliRequestData): AscetCliRequestData {
	const data: AscetCliRequestData = {
		cwd: request.cwd,
		cliPath: request.cliPath,
		args: [...request.args],
	};
	if (request.stdin !== undefined) data.stdin = request.stdin;
	if (request.timeoutMs !== undefined) data.timeoutMs = request.timeoutMs;
	if (request.jobKind !== undefined) data.jobKind = request.jobKind;
	if (request.mutatesDatabase !== undefined) data.mutatesDatabase = request.mutatesDatabase;
	return data;
}

function normalizeAscetCliExecutionResult(execution: AscetCliExecutionResult): AscetCliExecutionResult {
	return {
		...execution,
		request: createAscetCliRequestData(execution.request),
	};
}

export async function executeAscetCli(request: AscetCliRequest): Promise<AscetCliExecutionResult> {
	if (request.signal?.aborted) {
		return {
			exitCode: null,
			stdout: "",
			stderr: "",
			timedOut: false,
			aborted: true,
			spawnAttempted: false,
			spawnSucceeded: false,
			requestDispatched: false,
			acceptedReceived: false,
			processClosed: true,
			validResponseReceived: false,
			request: createAscetCliRequestData(request),
		};
	}
	return new Promise((resolve, reject) => {
		let child: ChildProcess;
		try {
			child = spawn(request.cliPath, request.args, {
				cwd: request.cwd,
				windowsHide: true,
				stdio: request.stdin === undefined ? ["ignore", "pipe", "pipe"] : ["pipe", "pipe", "pipe"],
			});
		} catch (error) {
			reject(error);
			return;
		}
		let stdout = "";
		let stderr = "";
		let timedOut = false;
		let aborted = false;
		let spawnSucceeded = false;
		let requestDispatched = false;
		let launchError: Error | undefined;
		let outputLimitExceeded: "stdout" | "stderr" | undefined;
		let stdoutBytes = 0;
		let stderrBytes = 0;
		let timeout: NodeJS.Timeout | undefined;
		let terminationPromise: Promise<void> | undefined;
		let spawnMetadataPromise: Promise<void> | undefined;
		const startTermination = () => {
			terminationPromise ??= terminateProcess(child);
		};
		if (request.timeoutMs && request.timeoutMs > 0) {
			timeout = setTimeout(() => {
				timedOut = true;
				startTermination();
			}, request.timeoutMs);
		}
		const abort = () => {
			aborted = true;
			startTermination();
		};
		request.signal?.addEventListener("abort", abort, { once: true });
		child.once("spawn", () => {
			spawnSucceeded = true;
			requestDispatched = true;
			if (child.pid !== undefined && request.onSpawn) {
				spawnMetadataPromise = Promise.resolve(request.onSpawn(child.pid)).catch((error: unknown) => {
					launchError = error instanceof Error ? error : new Error(String(error));
					startTermination();
				});
			}
		});
		child.stdout?.setEncoding("utf8");
		child.stderr?.setEncoding("utf8");
		child.stdout?.on("data", (chunk) => {
			const text = String(chunk);
			stdoutBytes += Buffer.byteLength(text, "utf8");
			if (stdoutBytes > MAX_BRIDGE_STDOUT_BYTES) {
				outputLimitExceeded = "stdout";
				startTermination();
				return;
			}
			stdout += text;
		});
		child.stderr?.on("data", (chunk) => {
			const text = String(chunk);
			stderrBytes += Buffer.byteLength(text, "utf8");
			if (stderrBytes > MAX_BRIDGE_STDERR_BYTES) {
				outputLimitExceeded = "stderr";
				startTermination();
				return;
			}
			stderr += text;
		});
		child.once("error", (error) => {
			launchError = error;
		});
		child.once("close", async (exitCode) => {
			if (timeout) clearTimeout(timeout);
			request.signal?.removeEventListener("abort", abort);
			await terminationPromise;
			await spawnMetadataPromise;
			if (launchError) {
				stderr = stderr.trim().length > 0 ? `${stderr.trim()}\n${launchError.message}` : launchError.message;
			}
			resolve({
				exitCode,
				stdout,
				stderr,
				timedOut,
				aborted,
				spawnAttempted: true,
				spawnSucceeded,
				requestDispatched,
				acceptedReceived: false,
				processClosed: true,
				validResponseReceived: false,
				outputLimitExceeded,
				request: createAscetCliRequestData(request),
			});
		});
		if (request.stdin !== undefined) {
			child.stdin?.write(request.stdin);
			child.stdin?.end();
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
		resourceKey: options.resourceKey,
		queueTimeoutMs: options.queueTimeoutMs ?? 60_000,
		executionTimeoutMs: (request.timeoutMs ?? 60_000) + 5_000,
		signal: request.signal,
		async run(schedulerSignal) {
			const scheduledRequest: AscetCliRequest = {
				...request,
				signal: schedulerSignal,
			};
			const lock = await acquireAscetCliLock(
				{
					agentId,
					commandId,
					toolName,
					processName: "AscetBridge.exe",
				},
				{
					env: options.env,
					acquireTimeoutMs: Math.min(options.queueTimeoutMs ?? 60_000, 60_000),
					signal: schedulerSignal,
				},
			);
			scheduledRequest.onSpawn = async (pid) => {
				await lock.setBridgePid(pid);
				await request.onSpawn?.(pid);
			};
			try {
				const execution = normalizeAscetCliExecutionResult(
					await (options.executeCli ?? executeAscetCli)(scheduledRequest),
				);
				const acceptedExitCodes = options.acceptedExitCodes ?? [0];
				const aborted = scheduledRequest.signal?.aborted === true || execution.aborted === true;
				if (execution.outputLimitExceeded) {
					throw new AscetCliProcessError(
						execution,
						"ascet_cli_failed",
						`ASCET Bridge ${execution.outputLimitExceeded} exceeded its transport limit.`,
					);
				}
				if (aborted) {
					throw new AscetCliProcessError(execution, "ascet_cli_aborted", "ASCET CLI execution was aborted.");
				}
				if (execution.timedOut) {
					throw new AscetCliProcessError(execution, "ascet_cli_timeout", "ASCET CLI execution timed out.");
				}
				const rawParsed = parseJson(execution.stdout);
				execution.validResponseReceived = rawParsed.ok && isBridgeResponseEnvelope(rawParsed.data);
				const parsed = requireBridgeResponseEnvelope(rawParsed, options.executeCli === undefined);
				const structuredError = parsed.ok ? getCliFailureEnvelopeError(parsed.data) : undefined;
				if (!acceptedExitCodes.includes(execution.exitCode ?? Number.NaN)) {
					throw createAscetCliProcessError(
						execution,
						"ascet_cli_failed",
						structuredError?.message ??
							(execution.stderr.trim() ||
								execution.stdout.trim() ||
								`ASCET CLI exited with ${execution.exitCode}`),
						structuredError,
					);
				}
				if (isParseJsonFailure(parsed)) {
					throw new AscetCliProcessError(execution, "ascet_cli_invalid_json", parsed.message);
				}
				if (structuredError) {
					throw createAscetCliProcessError(
						execution,
						"ascet_cli_failed",
						structuredError.message,
						structuredError,
					);
				}
				return execution;
			} finally {
				await lock.release();
			}
		},
	});
}

type ParseJsonResult = { ok: true; data: unknown } | { ok: false; message: string };

function parseJson(text: string): ParseJsonResult {
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

function isParseJsonFailure(value: ParseJsonResult): value is { ok: false; message: string } {
	return value.ok === false;
}

function isBridgeResponseEnvelope(value: unknown): boolean {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return false;
	}
	const envelope = value as Record<string, unknown>;
	if (envelope.type !== "response" || envelope.protocolVersion !== 1 || typeof envelope.ok !== "boolean") {
		return false;
	}
	if (envelope.meta === null || typeof envelope.meta !== "object" || Array.isArray(envelope.meta)) {
		return false;
	}
	const meta = envelope.meta as Record<string, unknown>;
	return (
		typeof meta.bridgePid === "number" &&
		Number.isInteger(meta.bridgePid) &&
		meta.bridgePid > 0 &&
		typeof meta.bridgeGeneration === "string" &&
		meta.bridgeGeneration.length > 0 &&
		typeof meta.durationMs === "number" &&
		meta.durationMs >= 0 &&
		typeof meta.sessionPolicy === "string" &&
		Object.hasOwn(meta, "mutationStarted") &&
		(meta.mutationStarted === null || typeof meta.mutationStarted === "boolean")
	);
}

function requireBridgeResponseEnvelope(parsed: ParseJsonResult, required: boolean): ParseJsonResult {
	if (!required || isParseJsonFailure(parsed) || isBridgeResponseEnvelope(parsed.data)) {
		return parsed;
	}
	return { ok: false, message: "ASCET Bridge produced JSON that is not a valid protocolVersion=1 response envelope." };
}

function getBridgeMutationStarted(execution: AscetCliExecutionResult): boolean | null | undefined {
	const parsed = parseJson(execution.stdout);
	if (isParseJsonFailure(parsed) || !isBridgeResponseEnvelope(parsed.data)) {
		return undefined;
	}
	const envelope = parsed.data as Record<string, unknown>;
	const meta = envelope.meta as Record<string, unknown>;
	return typeof meta.mutationStarted === "boolean" || meta.mutationStarted === null ? meta.mutationStarted : undefined;
}

function getCliFailureEnvelopeError(value: unknown): AscetCliStructuredError | undefined {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return undefined;
	}
	const envelope = value as Record<string, unknown>;
	if (
		envelope.ok !== false ||
		envelope.error === null ||
		typeof envelope.error !== "object" ||
		Array.isArray(envelope.error)
	) {
		return undefined;
	}
	const error = envelope.error as Record<string, unknown>;
	if (typeof error.code !== "string" || error.code.trim().length === 0) {
		return undefined;
	}
	return {
		code: error.code.trim(),
		message:
			typeof error.message === "string" && error.message.trim().length > 0
				? error.message.trim()
				: "ASCET CLI returned ok=false.",
		stage: typeof error.stage === "string" && error.stage.trim().length > 0 ? error.stage.trim() : undefined,
		details: error.details,
		operation:
			typeof error.operation === "string" && error.operation.trim().length > 0 ? error.operation.trim() : undefined,
	};
}

function createAscetCliProcessError(
	execution: AscetCliExecutionResult,
	resultCode: "ascet_cli_failed" | "ascet_cli_timeout" | "ascet_cli_aborted" | "ascet_cli_invalid_json",
	message: string,
	structuredError?: AscetCliStructuredError,
): AscetCliProcessError {
	const processError = new AscetCliProcessError(
		execution,
		resultCode,
		message,
		structuredError?.code ?? resultCode,
	) as AscetCliProcessError & {
		structuredError?: AscetCliStructuredError;
	};
	if (structuredError) {
		processError.structuredError = structuredError;
	}
	return processError;
}

function getStructuredCliProcessError(error: AscetCliProcessError): AscetCliStructuredError | undefined {
	return (error as AscetCliProcessError & { structuredError?: AscetCliStructuredError }).structuredError;
}

function buildCliFailureMessage(params: {
	aborted: boolean;
	processOk: boolean;
	parsed: ParseJsonResult;
	execution: AscetCliExecutionResult;
}): string {
	const parsed = params.parsed;
	if (params.aborted) {
		return "ASCET CLI execution was aborted.";
	}
	if (params.processOk && isParseJsonFailure(parsed)) {
		return parsed.message;
	}
	return (
		params.execution.stderr.trim() ||
		params.execution.stdout.trim() ||
		`ASCET CLI exited with ${params.execution.exitCode}`
	);
}

function summarizeFailureText(value: string, maxLength = 1000): string {
	const normalized = sanitizeCliFailureText(value);
	return normalized.length <= maxLength ? normalized : `${normalized.slice(0, maxLength)}...`;
}

function isControlPlaneRequest(args: string[]): boolean {
	return args[0] === "capabilities" || (args[0] === "selftest" && args[1]?.toLowerCase() === "offline");
}

function mapWriteFailure(
	jobKind: AscetJobKind,
	originalCode: string,
	execution?: AscetCliExecutionResult,
	started?: boolean,
): { code: string; details?: Record<string, unknown> } {
	if (jobKind !== "write") return { code: originalCode };
	const notStarted =
		started === false ||
		(started === undefined &&
			(execution === undefined || execution.spawnSucceeded === false || execution.requestDispatched === false));
	return notStarted
		? { code: "write_not_started", details: { originalCode, retryable: true, requiresReadback: false } }
		: { code: "write_outcome_unknown", details: { originalCode, retryable: false, requiresReadback: true } };
}
function retryableFailureCode(code: string): boolean {
	return (
		code === "write_not_started" ||
		code === "ascet_cli_timeout" ||
		code === "ascet_scheduler_queue_timeout" ||
		code === "ascet_scheduler_exec_timeout" ||
		code === "ascet_cli_lock_timeout"
	);
}

function buildFailureDiagnostics(params: {
	operationId: string;
	stage: AscetCliFailureDiagnostics["stage"];
	execution?: AscetCliExecutionResult;
	code: string;
}): AscetCliFailureDiagnostics {
	const execution = params.execution;
	return {
		operationId: params.operationId,
		stage: params.stage,
		exitCode: execution?.exitCode ?? null,
		timedOut: execution?.timedOut === true || params.code.endsWith("_timeout"),
		aborted: execution?.aborted === true || params.code === "ascet_cli_aborted",
		stderrSummary: summarizeFailureText(execution?.stderr ?? ""),
		stdoutSummary: summarizeFailureText(execution?.stdout ?? ""),
		retryable: retryableFailureCode(params.code),
	};
}

export async function runAscetCliJson(args: string[], options: RunAscetCliJsonOptions): Promise<AscetCliJsonResult> {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	const commandId = options.commandId ?? inferCommandId(args);
	const jobKind = options.jobKind ?? inferJobKind(commandId);
	const request: AscetCliRequest = {
		cwd: options.cwd,
		cliPath: options.cliPath ?? status.paths.cliPath,
		args,
		stdin: options.stdin,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		jobKind,
		mutatesDatabase: jobKind === "write",
	};

	const requestSizeBytes = Buffer.byteLength(JSON.stringify({ args, stdin: options.stdin ?? null }), "utf8");
	if (requestSizeBytes > MAX_BRIDGE_REQUEST_BYTES) {
		const mappedFailure = mapWriteFailure(jobKind, "ascet_bridge_request_too_large", undefined, false);
		return {
			ok: false,
			data: null,
			request: createAscetCliRequestData(request),
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			operationId: commandId,
			stage: "preflight",
			diagnostics: buildFailureDiagnostics({ operationId: commandId, stage: "preflight", code: mappedFailure.code }),
			error: {
				code: mappedFailure.code,
				message: `ASCET Bridge request exceeded ${MAX_BRIDGE_REQUEST_BYTES} bytes.`,
				details: mappedFailure.details,
			},
		};
	}
	if (options.signal?.aborted) {
		const mappedFailure = mapWriteFailure(jobKind, "ascet_cli_aborted", undefined, false);
		return {
			ok: false,
			data: null,
			request: createAscetCliRequestData(request),
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			aborted: true,
			operationId: commandId,
			stage: "preflight",
			diagnostics: buildFailureDiagnostics({
				operationId: commandId,
				stage: "preflight",
				code: mappedFailure.code,
			}),
			error: {
				code: mappedFailure.code,
				message: "ASCET Bridge execution was aborted before it started.",
				details: mappedFailure.details,
			},
		};
	}

	if (!existsSync(request.cliPath)) {
		const mappedFailure = mapWriteFailure(jobKind, "ascet_bridge_missing", undefined, false);
		return {
			ok: false,
			data: null,
			request: createAscetCliRequestData(request),
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			operationId: commandId,
			stage: "preflight",
			diagnostics: buildFailureDiagnostics({
				operationId: commandId,
				stage: "preflight",
				code: mappedFailure.code,
			}),
			error: {
				code: mappedFailure.code,
				message: `ASCET Bridge not found: ${request.cliPath}`,
				details: mappedFailure.details,
			},
		};
	}

	let execution: AscetCliExecutionResult;
	try {
		execution = isControlPlaneRequest(args)
			? normalizeAscetCliExecutionResult(await (options.executeCli ?? executeAscetCli)(request))
			: await executeScheduledAscetCli(request, { ...options, commandId, jobKind });
	} catch (error) {
		if (error instanceof AscetCliProcessError) {
			const failedExecution = error.execution;
			const structuredError = getStructuredCliProcessError(error);
			const dispatchStarted = failedExecution.spawnSucceeded === true || failedExecution.requestDispatched === true;
			const preserveStructuredError =
				structuredError !== undefined &&
				(jobKind !== "write" || !dispatchStarted || getBridgeMutationStarted(failedExecution) === false);
			const mappedFailure = preserveStructuredError
				? { code: structuredError.code, details: structuredError.details }
				: mapWriteFailure(jobKind, structuredError?.code ?? error.resultCode, failedExecution);
			const mappedDetails =
				!preserveStructuredError && structuredError
					? {
							...(mappedFailure.details ?? {}),
							backend: {
								code: structuredError.code,
								stage: structuredError.stage,
								details: structuredError.details,
								operation: structuredError.operation,
							},
						}
					: mappedFailure.details;
			const health = getGlobalAscetOperationHealthStore({ env: options.env });
			if (error.resultCode === "ascet_cli_timeout") {
				health.recordFailure({ commandId, reason: "child_command_timeout" });
			}
			await health.flush();
			return {
				ok: false,
				data: null,
				request: createAscetCliRequestData(failedExecution.request),
				stdout: failedExecution.stdout,
				stderr: failedExecution.stderr,
				exitCode: failedExecution.exitCode,
				timedOut: failedExecution.timedOut,
				aborted: failedExecution.aborted === true,
				operationId: commandId,
				stage: error.resultCode === "ascet_cli_invalid_json" ? "json_parse" : "cli_process",
				diagnostics: buildFailureDiagnostics({
					operationId: commandId,
					stage: error.resultCode === "ascet_cli_invalid_json" ? "json_parse" : "cli_process",
					execution: failedExecution,
					code: mappedFailure.code,
				}),
				error: preserveStructuredError
					? {
							code: structuredError.code,
							message: structuredError.message,
							stage: structuredError.stage,
							details: structuredError.details,
							operation: structuredError.operation,
						}
					: {
							code: mappedFailure.code,
							message: structuredError?.message ?? error.message,
							details: mappedDetails,
						},
			};
		}
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
		const mappedFailure = mapWriteFailure(
			jobKind,
			errorCode,
			undefined,
			error instanceof AscetSchedulerExecutionTimeoutError,
		);
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
			request: createAscetCliRequestData(request),
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: error instanceof AscetSchedulerExecutionTimeoutError,
			operationId: commandId,
			stage:
				error instanceof AscetSchedulerQueueTimeoutError
					? "scheduler_queue"
					: error instanceof AscetSchedulerExecutionTimeoutError
						? "scheduler_exec"
						: "result",
			diagnostics: buildFailureDiagnostics({
				operationId: commandId,
				stage:
					error instanceof AscetSchedulerQueueTimeoutError
						? "scheduler_queue"
						: error instanceof AscetSchedulerExecutionTimeoutError
							? "scheduler_exec"
							: "result",
				code: mappedFailure.code,
			}),
			error: {
				code: mappedFailure.code,
				message: error instanceof Error ? error.message : String(error),
				details: mappedFailure.details,
			},
		};
	}
	const rawParsed = parseJson(execution.stdout);
	execution.validResponseReceived = rawParsed.ok && isBridgeResponseEnvelope(rawParsed.data);
	const parsed = requireBridgeResponseEnvelope(rawParsed, options.executeCli === undefined);
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
		request: createAscetCliRequestData(execution.request),
		stdout: execution.stdout,
		stderr: execution.stderr,
		exitCode: execution.exitCode,
		timedOut: execution.timedOut,
		aborted,
		operationId: commandId,
		stage: ok ? undefined : processOk ? "json_parse" : "cli_process",
		diagnostics: ok
			? undefined
			: buildFailureDiagnostics({
					operationId: commandId,
					stage: processOk ? "json_parse" : "cli_process",
					execution,
					code: aborted
						? "ascet_cli_aborted"
						: execution.timedOut
							? "ascet_cli_timeout"
							: processOk
								? "ascet_cli_invalid_json"
								: "ascet_cli_failed",
				}),
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
					message: buildCliFailureMessage({
						aborted,
						processOk,
						parsed,
						execution,
					}),
				},
	};
}

export function formatAscetCliJsonResult(operation: string, result: AscetCliJsonResult): string {
	if (result.ok) {
		const payload = toToolSuccessPayload(result.data);
		const formatted = JSON.stringify(payload, null, 2) ?? "null";
		if (Buffer.byteLength(formatted, "utf8") <= getFormatArtifactThresholdBytes()) {
			return formatted;
		}
		return formatPersistedSuccess(operation, result, formatted);
	}
	const message = sanitizeCliFailureText(result.error?.message ?? "");
	const runtimeHint =
		result.error?.code === "ascet_cli_failed" && /(ToolAPI|stdio streams are unavailable|runtime)/i.test(message)
			? "hint: ASCET runtime (ToolAPI) is not connected. Start ASCET GUI with ToolAPI enabled, then rerun ascet_status or the ASCET command."
			: "";
	const diagnostics = result.diagnostics;
	return JSON.stringify(
		toToolFailurePayload({
			code: result.error?.code ?? "unknown",
			message: sanitizeCliFailureText(result.error?.message ?? ""),
			details: {
				hint: runtimeHint,
				stderr: sanitizeCliFailureText(result.stderr),
				stdout: sanitizeCliFailureText(result.stdout),
				exitCode: result.exitCode,
				timedOut: result.timedOut ? true : undefined,
				operationId: diagnostics?.operationId,
				stage: diagnostics?.stage,
				aborted: diagnostics?.aborted ? true : undefined,
				retryable: diagnostics?.retryable,
				stderrSummary: diagnostics?.stderrSummary,
				stdoutSummary: diagnostics?.stdoutSummary,
				backend:
					result.error?.stage || result.error?.operation || result.error?.details !== undefined
						? {
								stage: result.error.stage,
								operation: result.error.operation,
								details: result.error.details,
							}
						: undefined,
			},
		}),
		null,
		2,
	);
}

function sanitizeCliFailureText(text: string): string {
	return text
		.split(/\r?\n/)
		.filter((line) => !/^\s+at\s/.test(line))
		.map((line) => line.replace(/^Exception\[\d+\]:\s*/i, ""))
		.join("\n")
		.trim();
}

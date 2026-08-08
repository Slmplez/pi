import type { AscetCliExecutionResult } from "../cli.ts";

export type AscetCliProcessFailureCode =
	| "ascet_cli_failed"
	| "ascet_cli_timeout"
	| "ascet_cli_aborted"
	| "ascet_cli_invalid_json";

export class AscetCliProcessError extends Error {
	readonly execution: AscetCliExecutionResult;
	readonly resultCode: AscetCliProcessFailureCode;
	readonly code: string;

	constructor(
		execution: AscetCliExecutionResult,
		resultCode: AscetCliProcessFailureCode,
		message: string,
		code: string = resultCode,
	) {
		super(message);
		this.name = "AscetCliProcessError";
		this.execution = execution;
		this.resultCode = resultCode;
		this.code = code;
	}
}

export class AscetSchedulerQueueTimeoutError extends Error {
	readonly code = "ASCET_QUEUE_TIMEOUT";
	readonly jobId: string;
	readonly commandId: string;
	readonly timeoutMs: number;

	constructor(jobId: string, commandId: string, timeoutMs: number) {
		super(`ASCET job ${jobId} (${commandId}) did not enter execution within ${timeoutMs}ms.`);
		this.name = "AscetSchedulerQueueTimeoutError";
		this.jobId = jobId;
		this.commandId = commandId;
		this.timeoutMs = timeoutMs;
	}
}

export class AscetSchedulerExecutionTimeoutError extends Error {
	readonly code = "ASCET_EXEC_TIMEOUT";
	readonly jobId: string;
	readonly commandId: string;
	readonly timeoutMs: number;

	constructor(jobId: string, commandId: string, timeoutMs: number) {
		super(`ASCET job ${jobId} (${commandId}) did not finish within ${timeoutMs}ms.`);
		this.name = "AscetSchedulerExecutionTimeoutError";
		this.jobId = jobId;
		this.commandId = commandId;
		this.timeoutMs = timeoutMs;
	}
}

export class AscetSchedulerCancelledError extends Error {
	readonly code = "ASCET_SCHEDULER_CANCELLED";
	readonly jobId: string;
	readonly commandId: string;

	constructor(jobId: string, commandId: string) {
		super(`ASCET job ${jobId} (${commandId}) was cancelled before execution.`);
		this.name = "AscetSchedulerCancelledError";
		this.jobId = jobId;
		this.commandId = commandId;
	}
}

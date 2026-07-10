export class AscetSchedulerQueueTimeoutError extends Error {
	readonly code = "ASCET_QUEUE_TIMEOUT";

	constructor(
		readonly jobId: string,
		readonly commandId: string,
		readonly timeoutMs: number,
	) {
		super(`ASCET job ${jobId} (${commandId}) did not enter execution within ${timeoutMs}ms.`);
		this.name = "AscetSchedulerQueueTimeoutError";
	}
}

export class AscetSchedulerExecutionTimeoutError extends Error {
	readonly code = "ASCET_EXEC_TIMEOUT";

	constructor(
		readonly jobId: string,
		readonly commandId: string,
		readonly timeoutMs: number,
	) {
		super(`ASCET job ${jobId} (${commandId}) did not finish within ${timeoutMs}ms.`);
		this.name = "AscetSchedulerExecutionTimeoutError";
	}
}

export class AscetSchedulerCancelledError extends Error {
	readonly code = "ASCET_SCHEDULER_CANCELLED";

	constructor(
		readonly jobId: string,
		readonly commandId: string,
	) {
		super(`ASCET job ${jobId} (${commandId}) was cancelled before execution.`);
		this.name = "AscetSchedulerCancelledError";
	}
}

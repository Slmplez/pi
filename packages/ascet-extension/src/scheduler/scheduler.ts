import {
	AscetSchedulerCancelledError,
	AscetSchedulerExecutionTimeoutError,
	AscetSchedulerQueueTimeoutError,
} from "./errors.ts";
import {
	ASCET_SCHEDULER_DEFAULTS,
	type AscetHostState,
	type AscetJob,
	type AscetJobContext,
	type AscetSchedulerOptions,
	type AscetSchedulerSnapshot,
	normalizeAscetJobPriority,
} from "./types.ts";

interface PendingJob<T = unknown> {
	job: AscetJob<T>;
	context: AscetJobContext;
	resolve: (value: T) => void;
	reject: (error: unknown) => void;
	queueTimer?: ReturnType<typeof setTimeout>;
	abortListener?: () => void;
}

export interface AscetScheduler {
	submit<T>(job: AscetJob<T>): Promise<T>;
	getSnapshot(): AscetSchedulerSnapshot;
	markHostDegraded(reason?: string): void;
}

export function createAscetScheduler(options?: AscetSchedulerOptions): AscetScheduler {
	return new InProcessAscetScheduler(options);
}

class InProcessAscetScheduler implements AscetScheduler {
	readonly #queue: AscetJobContext[] = [];
	readonly #pendingByJobId = new Map<string, PendingJob>();
	readonly #recentJobs: AscetJobContext[] = [];
	readonly #maxQueueSize: number;
	readonly #maxPendingPerAgent: number;
	readonly #recentJobLimit: number;
	readonly #now: () => number;
	readonly #generateJobId: () => string;
	#hostState: AscetHostState = "healthy";
	#runningJob: AscetJobContext | null = null;
	#draining = false;
	#jobSequence = 0;

	constructor(options: AscetSchedulerOptions = {}) {
		this.#maxQueueSize = options.maxQueueSize ?? ASCET_SCHEDULER_DEFAULTS.maxQueueSize;
		this.#maxPendingPerAgent = options.maxPendingPerAgent ?? ASCET_SCHEDULER_DEFAULTS.maxPendingPerAgent;
		this.#recentJobLimit = options.recentJobLimit ?? ASCET_SCHEDULER_DEFAULTS.recentJobLimit;
		this.#now = options.now ?? (() => Date.now());
		this.#generateJobId = options.generateJobId ?? (() => `ascet-job-${++this.#jobSequence}`);
	}

	submit<T>(job: AscetJob<T>): Promise<T> {
		const priority = normalizeAscetJobPriority(job.priority);
		const context: AscetJobContext = {
			jobId: job.id ?? this.#generateJobId(),
			agentId: job.agentId,
			toolName: job.toolName,
			commandId: job.commandId,
			kind: job.kind,
			priority,
			resourceKey: job.resourceKey ?? ASCET_SCHEDULER_DEFAULTS.resourceKey,
			state: "queued",
			queuedAt: this.#now(),
		};

		if (job.signal?.aborted) {
			context.state = "cancelled";
			context.finishedAt = this.#now();
			this.#recordRecent(context);
			return Promise.reject(new AscetSchedulerCancelledError(context.jobId, context.commandId));
		}

		if (this.#queue.length >= this.#maxQueueSize) {
			context.state = "failed";
			context.finishedAt = this.#now();
			context.errorCode = "ASCET_QUEUE_FULL";
			context.errorMessage = `ASCET scheduler queue is full (${this.#maxQueueSize}).`;
			this.#recordRecent(context);
			return Promise.reject(new Error(context.errorMessage));
		}

		if (this.#countPendingForAgent(job.agentId) >= this.#maxPendingPerAgent) {
			context.state = "failed";
			context.finishedAt = this.#now();
			context.errorCode = "ASCET_AGENT_QUEUE_FULL";
			context.errorMessage = `ASCET agent ${job.agentId} has too many pending jobs (${this.#maxPendingPerAgent}).`;
			this.#recordRecent(context);
			return Promise.reject(new Error(context.errorMessage));
		}

		const promise = new Promise<T>((resolve, reject) => {
			const pending: PendingJob<T> = {
				job: { ...job, priority },
				context,
				resolve,
				reject,
			};
			this.#pendingByJobId.set(context.jobId, pending as PendingJob);
			this.#queue.push(context);
			this.#armQueueTimeout(pending as PendingJob);
			this.#armCancellation(pending as PendingJob);
		});

		this.#drain();
		return promise;
	}

	getSnapshot(): AscetSchedulerSnapshot {
		const queuedJobs = this.#queue.map((job) => ({ ...job }));
		const runningJob = this.#runningJob ? { ...this.#runningJob } : null;
		return {
			hostState: this.#hostState,
			runningJob,
			queuedJobs,
			recentJobs: this.#recentJobs.map((job) => ({ ...job })),
			pendingByAgent: this.#buildPendingByAgent(),
			activeCount: runningJob ? 1 : 0,
			resource: {
				key: runningJob?.resourceKey ?? ASCET_SCHEDULER_DEFAULTS.resourceKey,
				active: runningJob ? 1 : 0,
				queued: queuedJobs.length,
				concurrency: ASCET_SCHEDULER_DEFAULTS.maxActiveAscetCalls,
				runningJob,
			},
		};
	}

	markHostDegraded(_reason?: string): void {
		this.#hostState = "degraded";
	}

	async #drain(): Promise<void> {
		if (this.#draining) {
			return;
		}
		this.#draining = true;
		try {
			while (!this.#runningJob && this.#queue.length > 0) {
				const nextContext = this.#queue.shift();
				if (!nextContext) {
					break;
				}
				const pending = this.#pendingByJobId.get(nextContext.jobId);
				if (!pending) {
					continue;
				}
				this.#clearQueueTimer(pending);
				this.#clearAbortListener(pending);
				await this.#execute(pending);
			}
		} finally {
			this.#draining = false;
			if (!this.#runningJob && this.#queue.length > 0) {
				queueMicrotask(() => this.#drain());
			}
		}
	}

	async #execute<T>(pending: PendingJob<T>): Promise<void> {
		const { context, job } = pending;
		this.#runningJob = context;
		this.#hostState = "busy";
		context.state = "running";
		context.startedAt = this.#now();
		context.queueWaitMs = context.startedAt - context.queuedAt;
		let executionTimer: ReturnType<typeof setTimeout> | undefined;
		let timedOut = false;
		try {
			const result = await Promise.race([
				job.run(),
				new Promise<T>((_, reject) => {
					executionTimer = setTimeout(() => {
						timedOut = true;
						reject(
							new AscetSchedulerExecutionTimeoutError(context.jobId, context.commandId, job.executionTimeoutMs),
						);
					}, job.executionTimeoutMs);
				}),
			]);
			context.state = "succeeded";
			context.finishedAt = this.#now();
			context.executionMs = context.finishedAt - context.startedAt;
			pending.resolve(result);
			this.#hostState = "healthy";
		} catch (error) {
			context.finishedAt = this.#now();
			context.executionMs = context.startedAt ? context.finishedAt - context.startedAt : undefined;
			if (timedOut || error instanceof AscetSchedulerExecutionTimeoutError) {
				context.state = "exec_timeout";
				context.errorCode = "ASCET_EXEC_TIMEOUT";
				this.#hostState = "degraded";
			} else {
				context.state = "failed";
				context.errorCode =
					error instanceof Error && "code" in error
						? String((error as { code?: unknown }).code)
						: error instanceof Error
							? error.name
							: "ASCET_JOB_FAILED";
				this.#hostState = "healthy";
			}
			context.errorMessage = error instanceof Error ? error.message : String(error);
			pending.reject(error);
		} finally {
			if (executionTimer) {
				clearTimeout(executionTimer);
			}
			this.#pendingByJobId.delete(context.jobId);
			this.#recordRecent(context);
			this.#runningJob = null;
			if (this.#hostState === "busy") {
				this.#hostState = "healthy";
			}
		}
	}

	#armQueueTimeout(pending: PendingJob): void {
		pending.queueTimer = setTimeout(() => {
			if (!this.#pendingByJobId.has(pending.context.jobId)) {
				return;
			}
			const index = this.#queue.findIndex((job) => job.jobId === pending.context.jobId);
			if (index < 0) {
				return;
			}
			this.#queue.splice(index, 1);
			pending.context.state = "queue_timeout";
			pending.context.finishedAt = this.#now();
			pending.context.queueWaitMs = pending.context.finishedAt - pending.context.queuedAt;
			pending.context.errorCode = "ASCET_QUEUE_TIMEOUT";
			pending.context.errorMessage = `ASCET job ${pending.context.jobId} (${pending.context.commandId}) did not enter execution within ${pending.job.queueTimeoutMs}ms.`;
			this.#pendingByJobId.delete(pending.context.jobId);
			this.#clearAbortListener(pending);
			this.#recordRecent(pending.context);
			pending.reject(
				new AscetSchedulerQueueTimeoutError(
					pending.context.jobId,
					pending.context.commandId,
					pending.job.queueTimeoutMs,
				),
			);
		}, pending.job.queueTimeoutMs);
	}

	#armCancellation(pending: PendingJob): void {
		const signal = pending.job.signal;
		if (!signal) {
			return;
		}
		const listener = () => {
			const index = this.#queue.findIndex((job) => job.jobId === pending.context.jobId);
			if (index < 0) {
				return;
			}
			this.#queue.splice(index, 1);
			pending.context.state = "cancelled";
			pending.context.finishedAt = this.#now();
			pending.context.queueWaitMs = pending.context.finishedAt - pending.context.queuedAt;
			pending.context.errorCode = "ASCET_SCHEDULER_CANCELLED";
			pending.context.errorMessage = "ASCET job was cancelled before execution.";
			this.#pendingByJobId.delete(pending.context.jobId);
			this.#clearQueueTimer(pending);
			this.#clearAbortListener(pending);
			this.#recordRecent(pending.context);
			pending.reject(new AscetSchedulerCancelledError(pending.context.jobId, pending.context.commandId));
		};
		pending.abortListener = listener;
		signal.addEventListener("abort", listener, { once: true });
	}

	#clearQueueTimer(pending: PendingJob): void {
		if (pending.queueTimer) {
			clearTimeout(pending.queueTimer);
			pending.queueTimer = undefined;
		}
	}

	#clearAbortListener(pending: PendingJob): void {
		if (pending.abortListener) {
			pending.job.signal?.removeEventListener("abort", pending.abortListener);
			pending.abortListener = undefined;
		}
	}

	#recordRecent(context: AscetJobContext): void {
		this.#recentJobs.push({ ...context });
		while (this.#recentJobs.length > this.#recentJobLimit) {
			this.#recentJobs.shift();
		}
	}

	#countPendingForAgent(agentId: string): number {
		let count = 0;
		for (const pending of this.#pendingByJobId.values()) {
			if (pending.context.agentId === agentId) {
				count++;
			}
		}
		return count;
	}

	#buildPendingByAgent(): Record<string, number> {
		const pendingByAgent: Record<string, number> = {};
		for (const pending of this.#pendingByJobId.values()) {
			pendingByAgent[pending.context.agentId] = (pendingByAgent[pending.context.agentId] ?? 0) + 1;
		}
		return pendingByAgent;
	}
}

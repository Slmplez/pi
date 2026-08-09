export type AscetJobKind = "read" | "write" | "maintenance";
export type AscetJobPriority = "high" | "normal" | "low";
export type AscetResourceKey = string;

export type AscetJobState =
	| "queued"
	| "running"
	| "succeeded"
	| "failed"
	| "cancelled"
	| "queue_timeout"
	| "exec_timeout";

export type AscetHostState = "healthy" | "busy" | "degraded" | "recovering";

export interface AscetJobContext {
	jobId: string;
	agentId: string;
	toolName: string;
	commandId: string;
	kind: AscetJobKind;
	priority: AscetJobPriority;
	resourceKey: AscetResourceKey;
	state: AscetJobState;
	queuedAt: number;
	startedAt?: number;
	finishedAt?: number;
	queueWaitMs?: number;
	executionMs?: number;
	errorCode?: string;
	errorMessage?: string;
}

export interface AscetJob<T> {
	id?: string;
	agentId: string;
	toolName: string;
	commandId: string;
	kind: AscetJobKind;
	priority?: AscetJobPriority;
	resourceKey?: AscetResourceKey;
	queueTimeoutMs: number;
	executionTimeoutMs: number;
	signal?: AbortSignal;
	run: (signal: AbortSignal) => Promise<T>;
}

export interface AscetResourceSnapshot {
	key: AscetResourceKey;
	active: number;
	queued: number;
	concurrency: 1;
	runningJob: AscetJobContext | null;
}

export interface AscetSchedulerSnapshot {
	hostState: AscetHostState;
	runningJob: AscetJobContext | null;
	queuedJobs: AscetJobContext[];
	recentJobs: AscetJobContext[];
	pendingByAgent: Record<string, number>;
	activeCount: number;
	resource: AscetResourceSnapshot;
}

export interface AscetSchedulerOptions {
	maxQueueSize?: number;
	maxPendingPerAgent?: number;
	recentJobLimit?: number;
	now?: () => number;
	generateJobId?: () => string;
}

export const ASCET_SCHEDULER_DEFAULTS = {
	resourceKey: "ascet.toolapi.global" as const,
	maxActiveAscetCalls: 1 as const,
	maxQueueSize: 100,
	maxPendingPerAgent: 20,
	recentJobLimit: 100,
};

export function normalizeAscetJobPriority(value: unknown): AscetJobPriority {
	return value === "high" || value === "normal" || value === "low" ? value : "normal";
}

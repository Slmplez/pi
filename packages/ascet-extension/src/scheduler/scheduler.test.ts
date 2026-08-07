import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	AscetSchedulerCancelledError,
	AscetSchedulerExecutionTimeoutError,
	AscetSchedulerQueueTimeoutError,
} from "./errors.ts";
import { createAscetOperationHealthStore } from "./operation-health.ts";
import { createAscetScheduler } from "./scheduler.ts";
import { createAscetSchedulerStatusReport } from "./status.ts";

function wait(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

describe("AscetScheduler failure containment", () => {
	test("removes a queued job after its queue timeout and drains the next state cleanly", async () => {
		const scheduler = createAscetScheduler();
		let releaseFirst: (() => void) | undefined;
		const first = scheduler.submit({
			agentId: "agent-a",
			toolName: "ascet_test",
			commandId: "blocking_read",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: () =>
				new Promise<string>((resolve) => {
					releaseFirst = () => resolve("first");
				}),
		});
		const queued = scheduler.submit({
			agentId: "agent-b",
			toolName: "ascet_test",
			commandId: "queue_timeout",
			kind: "read",
			queueTimeoutMs: 10,
			executionTimeoutMs: 1_000,
			run: async () => "must-not-run",
		});

		await assert.rejects(queued, AscetSchedulerQueueTimeoutError);
		assert.equal(scheduler.getSnapshot().queuedJobs.length, 0);
		assert.deepEqual(scheduler.getSnapshot().pendingByAgent, { "agent-a": 1 });

		if (!releaseFirst) throw new Error("blocking read did not start");
		releaseFirst();
		await assert.doesNotReject(first);

		const snapshot = scheduler.getSnapshot();
		assert.equal(snapshot.activeCount, 0);
		assert.equal(snapshot.queuedJobs.length, 0);
		assert.deepEqual(snapshot.pendingByAgent, {});
		assert.deepEqual(
			snapshot.recentJobs.map((job) => [job.commandId, job.state]),
			[
				["queue_timeout", "queue_timeout"],
				["blocking_read", "succeeded"],
			],
		);
	});

	test("removes an aborted queued job without executing it", async () => {
		const scheduler = createAscetScheduler();
		let releaseFirst: (() => void) | undefined;
		let queuedRunCount = 0;
		const first = scheduler.submit({
			agentId: "agent-a",
			toolName: "ascet_test",
			commandId: "blocking_read",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: () =>
				new Promise<void>((resolve) => {
					releaseFirst = resolve;
				}),
		});
		const abortController = new AbortController();
		const queued = scheduler.submit({
			agentId: "agent-b",
			toolName: "ascet_test",
			commandId: "cancelled_read",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			signal: abortController.signal,
			run: async () => {
				queuedRunCount++;
				return "must-not-run";
			},
		});

		abortController.abort();
		await assert.rejects(queued, AscetSchedulerCancelledError);
		assert.equal(queuedRunCount, 0);
		assert.equal(scheduler.getSnapshot().queuedJobs.length, 0);
		assert.deepEqual(scheduler.getSnapshot().pendingByAgent, { "agent-a": 1 });

		if (!releaseFirst) throw new Error("blocking read did not start");
		releaseFirst();
		await assert.doesNotReject(first);
		assert.deepEqual(scheduler.getSnapshot().pendingByAgent, {});
		assert.equal(scheduler.getSnapshot().recentJobs.at(-2)?.state, "cancelled");
	});

	test("records an execution timeout, then runs the queued recovery job with a clean queue", async () => {
		const scheduler = createAscetScheduler();
		const timedOut = scheduler.submit({
			agentId: "agent-a",
			toolName: "ascet_test",
			commandId: "stalled_read",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 10,
			run: () => new Promise<never>(() => undefined),
		});
		const recovery = scheduler.submit({
			agentId: "system",
			toolName: "AscetSchedulerMaintenance",
			commandId: "recover",
			kind: "maintenance",
			priority: "high",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: async () => "recovered",
		});

		await assert.rejects(timedOut, AscetSchedulerExecutionTimeoutError);
		await assert.doesNotReject(recovery);
		await wait(0);

		const snapshot = scheduler.getSnapshot();
		assert.equal(snapshot.hostState, "healthy");
		assert.equal(snapshot.activeCount, 0);
		assert.equal(snapshot.queuedJobs.length, 0);
		assert.deepEqual(snapshot.pendingByAgent, {});
		assert.deepEqual(
			snapshot.recentJobs.map((job) => [job.commandId, job.state]),
			[
				["stalled_read", "exec_timeout"],
				["recover", "succeeded"],
			],
		);
	});

	test("propagates recovery to scheduler and operation-health status", async () => {
		const scheduler = createAscetScheduler();
		const operationHealth = createAscetOperationHealthStore();
		scheduler.markHostDegraded("synthetic timeout");
		operationHealth.recordFailure({ commandId: "get_tree", reason: "scheduler_timeout" });

		const report = await createAscetSchedulerStatusReport("recover", {
			scheduler,
			operationHealth,
			recover: async () => undefined,
		});

		assert.equal(report.recovery, "succeeded");
		assert.equal(report.scheduler.hostState, "healthy");
		assert.deepEqual(report.operationHealth, []);
		assert.equal(report.scheduler.activeCount, 0);
		assert.equal(report.scheduler.queuedJobs.length, 0);
		assert.deepEqual(report.scheduler.pendingByAgent, {});
		assert.deepEqual(report.scheduler.recentJobs.at(-1), {
			jobId: "ascet-job-1",
			agentId: "system",
			toolName: "AscetSchedulerMaintenance",
			commandId: "recover",
			kind: "maintenance",
			priority: "high",
			resourceKey: "ascet.toolapi.global",
			state: "succeeded",
			queuedAt: report.scheduler.recentJobs.at(-1)?.queuedAt,
			startedAt: report.scheduler.recentJobs.at(-1)?.startedAt,
			finishedAt: report.scheduler.recentJobs.at(-1)?.finishedAt,
			queueWaitMs: report.scheduler.recentJobs.at(-1)?.queueWaitMs,
			executionMs: report.scheduler.recentJobs.at(-1)?.executionMs,
		});
	});
});

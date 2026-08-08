import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { describe, test } from "node:test";
import { acquireAscetCliLock, getAscetCliLockSnapshot } from "./cli-lock.ts";
import {
	AscetCliProcessError,
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

function createInjectedCliProcessError(code: "ascet_cli_failed" | "ascet_cli_timeout"): AscetCliProcessError {
	const timedOut = code === "ascet_cli_timeout";
	const message = timedOut ? "Synthetic ASCET CLI timeout." : "Synthetic ASCET CLI non-zero exit.";
	return new AscetCliProcessError(
		{
			exitCode: timedOut ? null : 1,
			stdout: "",
			stderr: message,
			timedOut,
			request: {
				cwd: "C:\\synthetic",
				cliPath: "AscetCli.exe",
				args: ["exec", "synthetic"],
			},
		},
		code,
		message,
	);
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

	test("interrupts a queued job once and clears its queue timeout before the runner is released", async () => {
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
			queueTimeoutMs: 10,
			executionTimeoutMs: 1_000,
			signal: abortController.signal,
			run: async () => {
				queuedRunCount++;
				return "must-not-run";
			},
		});

		abortController.abort();
		await assert.rejects(queued, AscetSchedulerCancelledError);
		await wait(20);
		assert.equal(queuedRunCount, 0);
		assert.equal(scheduler.getSnapshot().queuedJobs.length, 0);
		assert.deepEqual(scheduler.getSnapshot().pendingByAgent, { "agent-a": 1 });
		assert.equal(scheduler.getSnapshot().recentJobs.filter((job) => job.commandId === "cancelled_read").length, 1);

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

	test("records an injected non-zero CLI exit and drains the following job", async () => {
		const scheduler = createAscetScheduler();
		const failure = createInjectedCliProcessError("ascet_cli_failed");
		const rejected = scheduler.submit({
			agentId: "agent-a",
			toolName: "ascet_test",
			commandId: "non_zero_exit",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: async () => {
				throw failure;
			},
		});
		const following = scheduler.submit({
			agentId: "agent-b",
			toolName: "ascet_test",
			commandId: "following_read",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: async () => "continued",
		});

		await assert.rejects(rejected, (error: unknown) => error === failure);
		assert.equal(await following, "continued");

		const snapshot = scheduler.getSnapshot();
		assert.equal(snapshot.hostState, "healthy");
		assert.equal(snapshot.activeCount, 0);
		assert.equal(snapshot.queuedJobs.length, 0);
		assert.deepEqual(snapshot.pendingByAgent, {});
		assert.deepEqual(
			snapshot.recentJobs.map((job) => [job.commandId, job.state, job.errorCode]),
			[
				["non_zero_exit", "failed", "ascet_cli_failed"],
				["following_read", "succeeded", undefined],
			],
		);
	});

	test("degrades on an injected CLI timeout, releases the CLI lock, and recovers queue and health state", async () => {
		const scheduler = createAscetScheduler();
		const operationHealth = createAscetOperationHealthStore();
		const tempRoot = mkdtempSync(join(tmpdir(), "pi-ascet-scheduler-"));
		const lockPath = join(tempRoot, "locks", "ascet-toolapi.lock");
		const env = { PI_ASCET_LOCK_PATH: lockPath };
		const failure = createInjectedCliProcessError("ascet_cli_timeout");
		try {
			const timedOut = scheduler.submit({
				agentId: "agent-a",
				toolName: "ascet_test",
				commandId: "cli_timeout",
				kind: "read",
				queueTimeoutMs: 1_000,
				executionTimeoutMs: 1_000,
				run: async () => {
					const lock = await acquireAscetCliLock(
						{
							agentId: "agent-a",
							commandId: "cli_timeout",
							toolName: "ascet_test",
							processName: "synthetic",
						},
						{ env },
					);
					try {
						throw failure;
					} finally {
						await lock.release();
					}
				},
			});

			await assert.rejects(timedOut, (error: unknown) => error === failure);
			assert.equal((await getAscetCliLockSnapshot({ env })).locked, false);
			assert.equal(scheduler.getSnapshot().hostState, "degraded");
			assert.deepEqual(scheduler.getSnapshot().pendingByAgent, {});

			assert.equal(
				await scheduler.submit({
					agentId: "agent-b",
					toolName: "ascet_test",
					commandId: "followup_read",
					kind: "read",
					queueTimeoutMs: 1_000,
					executionTimeoutMs: 1_000,
					run: async () => "continued while degraded",
				}),
				"continued while degraded",
			);
			assert.equal(scheduler.getSnapshot().hostState, "degraded");

			operationHealth.recordFailure({ commandId: "cli_timeout", reason: "child_command_timeout" });
			mkdirSync(dirname(lockPath), { recursive: true });
			const staleTimestamp = new Date(Date.now() - 300_000).toISOString();
			writeFileSync(
				lockPath,
				JSON.stringify({
					token: "stale-lock",
					pid: 999_999_999,
					agentId: "synthetic",
					commandId: "stale",
					toolName: "ascet_test",
					processName: "synthetic",
					acquiredAt: staleTimestamp,
					heartbeatAt: staleTimestamp,
				}),
			);

			const report = await createAscetSchedulerStatusReport("recover", {
				scheduler,
				operationHealth,
				env,
			});
			assert.equal(report.recovery, "succeeded");
			assert.equal(report.scheduler.hostState, "healthy");
			assert.equal(report.cliLock.locked, false);
			assert.deepEqual(report.operationHealth, []);
			assert.equal(report.scheduler.activeCount, 0);
			assert.equal(report.scheduler.queuedJobs.length, 0);
			assert.deepEqual(report.scheduler.pendingByAgent, {});
		} finally {
			rmSync(tempRoot, { recursive: true, force: true });
		}
	});

	test("keeps scheduler and operation health degraded when recovery fails", async () => {
		const scheduler = createAscetScheduler();
		const operationHealth = createAscetOperationHealthStore();
		scheduler.markHostDegraded("synthetic timeout");
		operationHealth.recordFailure({ commandId: "get_tree", reason: "scheduler_timeout" });

		await assert.rejects(
			createAscetSchedulerStatusReport("recover", {
				scheduler,
				operationHealth,
				recover: async () => {
					throw new Error("Synthetic recovery failure.");
				},
			}),
			/Synthetic recovery failure/,
		);

		const snapshot = scheduler.getSnapshot();
		assert.equal(snapshot.hostState, "degraded");
		assert.equal(snapshot.activeCount, 0);
		assert.equal(snapshot.queuedJobs.length, 0);
		assert.deepEqual(snapshot.pendingByAgent, {});
		assert.equal(snapshot.recentJobs.at(-1)?.commandId, "recover");
		assert.equal(snapshot.recentJobs.at(-1)?.state, "failed");
		assert.notEqual(operationHealth.getState("get_tree").status, "healthy");
	});

	test("propagates successful recovery to scheduler and operation-health status", async () => {
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

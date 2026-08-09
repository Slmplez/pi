import { existsSync, mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import type { AscetCliRequest } from "../../ascet-extension/src/cli.ts";
import { runAscetGet } from "../../ascet-extension/src/get.ts";
import { runAscetReadDependentChain } from "../../ascet-extension/src/read-dependent-chain.ts";
import {
	acquireAscetCliLock,
	clearStaleAscetCliLock,
	createAscetOperationHealthStore,
	createAscetScheduler,
	createAscetSchedulerStatusReport,
	createFileOperationHealthPersistence,
	executeAscetSchedulerStatusCommand,
	formatAscetOperationHealthStatus,
	formatAscetSchedulerSnapshot,
	getAscetCliLockSnapshot,
	getGlobalAscetScheduler,
	resetGlobalAscetSchedulerForTests,
	resolvePiAscetLockPath,
	resolvePiAscetOperationHealthPath,
	resolvePiAscetRuntimeRoot,
} from "../../ascet-extension/src/scheduler/index.ts";
import { runApprovedAscetSetElementDependency } from "../../ascet-extension/src/set-element-dependency.ts";
import { runApprovedAscetSetMethodSignature } from "../../ascet-extension/src/set-method-signature.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

function tempRuntimeEnv() {
	return { PI_ASCET_RUNTIME_DIR: mkdtempSync(join(tmpdir(), "pi-ascet-runtime-")) };
}

describe("ASCET scheduler diagnostics", () => {
	it("uses PI-local runtime paths for lock and operation health", () => {
		const env = { LOCALAPPDATA: "C:\\Users\\ZJR\\AppData\\Local" };

		expect(resolvePiAscetRuntimeRoot({ env })).toBe("C:\\Users\\ZJR\\AppData\\Local\\PI\\ascet");
		expect(resolvePiAscetLockPath({ env })).toBe(
			"C:\\Users\\ZJR\\AppData\\Local\\PI\\ascet\\locks\\ascet-toolapi.lock",
		);
		expect(resolvePiAscetOperationHealthPath({ env })).toBe(
			"C:\\Users\\ZJR\\AppData\\Local\\PI\\ascet\\operation-health.json",
		);
	});

	it("formats an empty scheduler snapshot like the Copilot status command", () => {
		const scheduler = createAscetScheduler();
		const output = formatAscetSchedulerSnapshot(scheduler.getSnapshot());

		expect(output).toContain("Host: healthy");
		expect(output).toContain("Active: 0");
		expect(output).toContain("Resource: ascet.toolapi.global active=0 queued=0 concurrency=1");
		expect(output).toContain("Pending: 0");
		expect(output).toContain("Running: none");
		expect(output).toContain("Pending by agent: {}");
	});

	it("serializes ASCET jobs and exposes queued/running state", async () => {
		const scheduler = createAscetScheduler();
		let releaseFirst!: () => void;
		const first = scheduler.submit({
			agentId: "agent-a",
			toolName: "ascet_test",
			commandId: "first",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: () =>
				new Promise<string>((resolve) => {
					releaseFirst = () => resolve("first");
				}),
		});
		const second = scheduler.submit({
			agentId: "agent-b",
			toolName: "ascet_test",
			commandId: "second",
			kind: "read",
			queueTimeoutMs: 1_000,
			executionTimeoutMs: 1_000,
			run: async () => "second",
		});

		await new Promise((resolve) => setTimeout(resolve, 0));
		const snapshot = scheduler.getSnapshot();
		expect(snapshot.runningJob?.commandId).toBe("first");
		expect(snapshot.queuedJobs.map((job) => job.commandId)).toEqual(["second"]);
		expect(snapshot.pendingByAgent).toEqual({ "agent-a": 1, "agent-b": 1 });

		releaseFirst();
		await expect(first).resolves.toBe("first");
		await expect(second).resolves.toBe("second");
	});

	it("reports and clears stale PI CLI locks", async () => {
		const env = tempRuntimeEnv();
		const lock = await acquireAscetCliLock(
			{ agentId: "agent", commandId: "read", toolName: "ascet_test", processName: "AscetBridge.exe" },
			{ env, pid: process.pid, tokenFactory: () => "owned" },
		);
		const active = await getAscetCliLockSnapshot({ env });
		expect(active.locked).toBe(true);
		expect(active.locked && "owner" in active ? active.owner.toolName : "").toBe("ascet_test");
		await lock.release();
		expect((await getAscetCliLockSnapshot({ env })).locked).toBe(false);

		const stalePath = resolvePiAscetLockPath({ env });
		writeFileSync(
			stalePath,
			JSON.stringify({
				token: "stale",
				ownerToken: "stale",
				pid: 999999,
				ownerNodePid: 999999,
				bridgePid: null,
				agentId: "agent",
				commandId: "read",
				toolName: "ascet_test",
				processName: "AscetBridge.exe",
				acquiredAt: new Date(0).toISOString(),
				heartbeatAt: new Date(0).toISOString(),
			}),
		);
		expect((await getAscetCliLockSnapshot({ env, isPidAlive: () => false })).locked).toBe(true);
		expect(await clearStaleAscetCliLock({ env, isPidAlive: () => false })).toBe(true);
		expect(existsSync(stalePath)).toBe(false);
	});

	it("persists degraded operation health under the PI runtime directory", async () => {
		const env = tempRuntimeEnv();
		const path = resolvePiAscetOperationHealthPath({ env });
		const store = createAscetOperationHealthStore({
			persistence: createFileOperationHealthPersistence(path),
		});

		store.recordFailure({ commandId: "get_tree", reason: "child_command_timeout" });
		await store.flush();

		const raw = readFileSync(path, "utf8");
		expect(raw).toContain("get_tree");
		expect(formatAscetOperationHealthStatus(store.listUnhealthy())).toContain("status=degraded");
	});

	it("registers ascet_scheduler_status tool and ascet-scheduler-status command", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_scheduler_status")?.definition;

		expect(tool).toMatchObject({ name: "ascet_scheduler_status", executionMode: "sequential" });
		expect(ascetExtension?.commands.has("ascet-scheduler-status")).toBe(true);
		const response = await tool?.execute("scheduler", { action: "status" }, new AbortController().signal, undefined, {
			cwd: repoRoot,
		} as never);
		const text = response?.content[0]?.type === "text" ? response.content[0].text : "";
		expect(text).toContain("ASCET Scheduler Status");
		expect(text).toContain("CLI Lock:");
		expect(text).toContain("Operation Health:");
	});

	it("formats scheduler status command output and recover output", async () => {
		const env = tempRuntimeEnv();
		const scheduler = createAscetScheduler();
		const operationHealth = createAscetOperationHealthStore();
		operationHealth.recordFailure({ commandId: "read_component_refs", reason: "child_command_timeout" });

		const status = await executeAscetSchedulerStatusCommand("", { env, scheduler, operationHealth });
		expect(status).toContain("ASCET Scheduler Status");
		expect(status).toContain("read_component_refs status=degraded");

		const recover = await executeAscetSchedulerStatusCommand("--recover", {
			env,
			scheduler,
			operationHealth,
			recover: async () => undefined,
		});
		expect(recover).toContain("Recovery: succeeded");
		expect(recover).toContain("degraded: none");
	});

	it("serializes ascet_get tree reads and records get_tree scheduler metadata", async () => {
		const env = tempRuntimeEnv();
		resetGlobalAscetSchedulerForTests();
		const scheduler = getGlobalAscetScheduler();
		let releaseFirst: (() => void) | undefined;
		let resolveFirstStarted: () => void = () => undefined;
		const firstStarted = new Promise<void>((resolve) => {
			resolveFirstStarted = resolve;
		});
		let invocationCount = 0;

		const executeCli = async (request: AscetCliRequest) => {
			const invocation = invocationCount++;
			expect((await getAscetCliLockSnapshot({ env })).locked).toBe(true);
			if (invocation === 0) {
				resolveFirstStarted();
				await new Promise<void>((resolve) => {
					releaseFirst = resolve;
				});
			}
			return {
				exitCode: 0,
				stdout: JSON.stringify({ ok: true, result: { items: [] } }),
				stderr: "",
				timedOut: false,
				request,
			};
		};

		try {
			const first = runAscetGet(
				{ action: "tree", target: { targetPathPrefix: "DEMO" } },
				{ cwd: repoRoot, env, executeCli },
			);
			await firstStarted;
			const second = runAscetGet(
				{ action: "tree", target: { targetPathPrefix: "PlatformLibrary\\Package" } },
				{ cwd: repoRoot, env, executeCli },
			);
			await Promise.resolve();

			expect(invocationCount).toBe(1);
			expect(scheduler.getSnapshot().runningJob).toMatchObject({
				toolName: "ascet_get",
				commandId: "get_tree",
				kind: "read",
				resourceKey: "ascet.toolapi.global",
			});
			expect(scheduler.getSnapshot().queuedJobs).toHaveLength(1);
			expect(scheduler.getSnapshot().queuedJobs[0]).toMatchObject({
				toolName: "ascet_get",
				commandId: "get_tree",
				kind: "read",
				resourceKey: "ascet.toolapi.global",
			});

			if (!releaseFirst) throw new Error("first ascet_get tree read did not start");
			releaseFirst();
			const [firstResult, secondResult] = await Promise.all([first, second]);

			expect(firstResult.ok).toBe(true);
			expect(secondResult.ok).toBe(true);
			expect(invocationCount).toBe(2);
			expect((await getAscetCliLockSnapshot({ env })).locked).toBe(false);
			expect(scheduler.getSnapshot().recentJobs.slice(-2)).toEqual([
				expect.objectContaining({
					toolName: "ascet_get",
					commandId: "get_tree",
					kind: "read",
					resourceKey: "ascet.toolapi.global",
				}),
				expect.objectContaining({
					toolName: "ascet_get",
					commandId: "get_tree",
					kind: "read",
					resourceKey: "ascet.toolapi.global",
				}),
			]);
		} finally {
			resetGlobalAscetSchedulerForTests();
		}
	});

	it("routes dependent-chain reads and dependency dry-run writes through the scheduler", async () => {
		const env = tempRuntimeEnv();
		const scheduler = createAscetScheduler();
		const seenLocks: boolean[] = [];

		const chain = await runAscetReadDependentChain(
			{ componentPath: "DEMO\\DiscreteRiccatiSolver", dependentElement: "B01" },
			{
				cwd: repoRoot,
				env,
				scheduler,
				executeCli: async (request) => {
					seenLocks.push((await getAscetCliLockSnapshot({ env })).locked);
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { complete: true, inputs: [] } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		const write = await runApprovedAscetSetElementDependency(
			{
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "component",
				dryRun: true,
				verifyReadback: true,
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				env,
				scheduler,
				executeCli: async (request) => {
					seenLocks.push((await getAscetCliLockSnapshot({ env })).locked);
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								operationName: "set_element_dependency",
								writeSucceeded: true,
								payload: { write: { dryRun: true }, dependency: { after: "independent" } },
								verification: {
									requested: true,
									attempted: false,
									succeeded: true,
									summary: "dependency_dry_run",
								},
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(chain.ok).toBe(true);
		expect(write.ok).toBe(true);
		expect(seenLocks).toEqual([true, true]);
		expect((await getAscetCliLockSnapshot({ env })).locked).toBe(false);
		expect(scheduler.getSnapshot().recentJobs.map((job) => job.commandId)).toEqual([
			"read_dependent_chain",
			"set_element_dependency",
		]);
	});

	it("routes method signature writes through the scheduler as serial writes", async () => {
		const env = tempRuntimeEnv();
		const scheduler = createAscetScheduler();
		let sawLock = false;
		let signatureSpec: unknown;

		const result = await runApprovedAscetSetMethodSignature(
			{
				componentPath: "DEMO\\PiSmoke",
				methodName: "calc",
				returnType: "cont",
				ifReturnExists: "replace",
				arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
				verifyReadback: true,
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				env,
				scheduler,
				executeCli: async (request) => {
					sawLock = (await getAscetCliLockSnapshot({ env })).locked;
					const signatureJsonIndex = request.args.indexOf("--signature-json");
					expect(signatureJsonIndex).toBeGreaterThan(0);
					signatureSpec = JSON.parse(readFileSync(request.args[signatureJsonIndex + 1]!, "utf8"));
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								operationName: "set_method_signature",
								writeSucceeded: true,
								payload: { returnElementModelType: "cont", arguments: [{ name: "p_CmpF_MC1" }] },
								verification: { requested: true, attempted: true, succeeded: true },
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.ok).toBe(true);
		expect(signatureSpec).toEqual({
			returnType: "cont",
			ifReturnExists: "replace",
			arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
		});
		expect(sawLock).toBe(true);
		expect((await getAscetCliLockSnapshot({ env })).locked).toBe(false);
		const job = scheduler.getSnapshot().recentJobs.at(-1);
		expect(job?.commandId).toBe("set_method_signature");
		expect(job?.kind).toBe("write");
	});

	it("captures get_tree timeout failures in operation health", async () => {
		const env = tempRuntimeEnv();
		const result = await runAscetGet(
			{ action: "tree", target: { targetPathPrefix: "DEMO" } },
			{
				cwd: repoRoot,
				env,
				executeCli: async (request) => ({
					exitCode: null,
					stdout: "",
					stderr: "",
					timedOut: true,
					request,
				}),
			},
		);
		const report = await createAscetSchedulerStatusReport("status", { env });

		expect(result.ok).toBe(false);
		expect(report.operationHealth.some((state) => state.commandId === "get_tree")).toBe(true);
	});
});

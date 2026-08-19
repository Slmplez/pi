import { strict as assert } from "node:assert";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	assertLiveReadiness,
	createLiveInvoker,
	extractBridgeEvidence,
	extractCanonicalResult,
	type DatabaseIdentityReadinessSnapshot,
	type SchedulerReadinessSnapshot,
} from "./ascet-edit-live-campaign-live.ts";
import type { ActionPlan, ActionScenario, ActionVariant, CampaignPlan } from "./ascet-edit-live-campaign.ts";

function plan(databasePath: string): CampaignPlan {
	return {
		schemaVersion: 1,
		campaignId: "offline-live-runner-fixture",
		channel: "source",
		mode: "evidence-preserved",
		database: { path: databasePath, fingerprint: "db-fingerprint" },
		bridge: { path: "ascetcli/output/ascet-csharp/bin/AscetBridge.exe", sha256: "PLAN-SHA" },
		source: { revision: "fixture", worktreeStatusDigest: "fixture" },
		scheduler: { requiredHostState: "healthy", requiredActiveCount: 0, requiredQueuedCount: 0, requiredCliLock: false },
		actions: [],
	};
}

function healthyScheduler(): SchedulerReadinessSnapshot {
	return { hostState: "healthy", activeCount: 0, queuedCount: 0, cliLock: false, raw: { fixture: true } };
}

function matchingDatabase(path: string): DatabaseIdentityReadinessSnapshot {
	return { path, fingerprint: "db-fingerprint", raw: { database: { path } }, bridge: { request: { identity: true }, stdout: "{}", exitCode: 0 } };
}

function fixtureAction(scenario: ActionScenario): { action: ActionPlan; variant: ActionVariant; scenario: ActionScenario } {
	const action = { id: "01-create_folder", action: "create_folder", runIndex: 1, variants: [] } as ActionPlan;
	const variant = { id: "create-folder-folder", variant: "folder", scenarios: [scenario] } as ActionVariant;
	return { action, variant, scenario };
}

test("readiness gate verifies cwd, Bridge SHA, scheduler, and current database identity", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-runner-readiness-"));
	try {
		const fixturePlan = plan(root);
		let identityCalls = 0;
		const readiness = await assertLiveReadiness(fixturePlan, {
			repoRoot: root,
			cwd: root,
			env: { ASCET_BRIDGE_PATH: join(root, "Bridge.exe") },
			dependencies: {
				canonicalPath: (value) => value.toLowerCase(),
				fileSha256: () => "plan-sha",
				schedulerProbe: async () => healthyScheduler(),
				databaseIdentityProbe: async ({ cwd }) => {
					identityCalls += 1;
					return matchingDatabase(cwd);
				},
			},
		});
		assert.equal(readiness.actualBridgeSha256, "PLAN-SHA");
		assert.equal(readiness.database.fingerprint, "db-fingerprint");
		assert.equal(readiness.scheduler.queuedCount, 0);
		assert.equal(identityCalls, 1);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("readiness failure stops before database identity probe", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-runner-gate-"));
	try {
		let identityCalls = 0;
		await assert.rejects(
			assertLiveReadiness(plan(root), {
				repoRoot: root,
				cwd: join(root, "wrong-db"),
				env: {},
				dependencies: {
					canonicalPath: (value) => value.toLowerCase(),
					fileSha256: () => "plan-sha",
					schedulerProbe: async () => healthyScheduler(),
					databaseIdentityProbe: async () => {
						identityCalls += 1;
						return matchingDatabase(root);
					},
				},
			}),
			/cwd does not match/,
		);
		assert.equal(identityCalls, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("readiness rejects Bridge, scheduler, and database identity mismatches", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-runner-mismatch-"));
	try {
		const base = {
			repoRoot: root,
			cwd: root,
			env: {},
			dependencies: {
				canonicalPath: (value: string) => value.toLowerCase(),
				fileSha256: () => "different-sha",
				schedulerProbe: async () => healthyScheduler(),
				databaseIdentityProbe: async () => matchingDatabase(root),
			},
		};
		await assert.rejects(assertLiveReadiness(plan(root), base), /Bridge SHA mismatch/);
		await assert.rejects(
			assertLiveReadiness(plan(root), {
				...base,
				dependencies: { ...base.dependencies, fileSha256: () => "plan-sha", schedulerProbe: async () => ({ ...healthyScheduler(), hostState: "busy" }) },
			}),
			/scheduler is not idle/,
		);
		await assert.rejects(
			assertLiveReadiness(plan(root), {
				...base,
				dependencies: { ...base.dependencies, fileSha256: () => "plan-sha", databaseIdentityProbe: async () => ({ ...matchingDatabase(root), fingerprint: "other" }) },
			}),
			/database fingerprint mismatch/,
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("live invoker isolates telemetry IDs and returns public readback with Bridge evidence", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-live-runner-invoker-"));
	try {
		const contexts: Array<{ env: Record<string, string | undefined>; tool: string }> = [];
		const invoker = createLiveInvoker({
			repoRoot: root,
			cwd: root,
			bridgePath: join(root, "Bridge.exe"),
			outputRoot: root,
			toolExecutor: async (tool, request, context) => {
				contexts.push({ env: context.env, tool });
				const artifactRoot = context.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
				assert.ok(artifactRoot);
				const telemetryPath = join(artifactRoot, "telemetry", "element-write.jsonl");
				const directory = join(artifactRoot, "telemetry");
				mkdirSync(directory, { recursive: true });
				writeFileSync(telemetryPath, `${JSON.stringify({ runId: context.env.PI_ASCET_RUN_ID, phaseId: context.env.PI_ASCET_PHASE_ID, caseId: context.env.PI_ASCET_CASE_ID, attemptId: context.env.PI_ASCET_ATTEMPT_ID })}\n`, "utf8");
				return {
					content: [{ type: "text", text: JSON.stringify({ public: true, request }) }],
					details: { raw: { request, stdout: JSON.stringify({ bridge: true }), stderr: "", exitCode: 0 } },
				};
			},
		});
		const first = fixtureAction({ id: "case-1", scenario: "changed-success", request: { action: "create_folder" }, objectManifest: { root: "fixture" }, expectedOutcome: "changed-success", readback: { id: "tree", tool: "ascet_get", params: { action: "tree" }, phase: "independent" } });
		const second = fixtureAction({ id: "case-2", scenario: "confirmed-no-op", request: { action: "create_folder" }, objectManifest: { root: "fixture" }, expectedOutcome: "confirmed-no-op" });
		const firstInvocation = await invoker.invoke(first.action, first.variant, first.scenario);
		const secondInvocation = await invoker.invoke(second.action, second.variant, second.scenario);
		const readback = await invoker.readback(first.action, first.variant, first.scenario, first.scenario.readback as { id: string; tool: string; params: Record<string, unknown>; phase: "independent" });
		assert.match(String(firstInvocation.telemetry), /case-1/);
		assert.match(String(secondInvocation.telemetry), /case-2/);
		assert.notEqual(contexts[0].env.PI_ASCET_EXTENSION_ARTIFACT_ROOT, contexts[1].env.PI_ASCET_EXTENSION_ARTIFACT_ROOT);
		assert.match(String(contexts[0].env.PI_ASCET_EXTENSION_ARTIFACT_ROOT).replaceAll("\\", "/"), /\/runtime-artifacts\/[0-9a-f]{16}\/write$/);
		assert.equal(contexts[0].env.PI_ASCET_RUN_ID, "01-create_folder-create-folder-folder-case-1-01");
		assert.equal(contexts[0].env.PI_ASCET_ATTEMPT_ID, "001");
		assert.deepEqual((readback as { publicResult: unknown }).publicResult, (await invoker.readback(first.action, first.variant, first.scenario, first.scenario.readback as { id: string; tool: string; params: Record<string, unknown>; phase: "independent" }) as { publicResult: unknown }).publicResult);
		assert.ok((readback as { bridgeEvidence: unknown }).bridgeEvidence);
        const before = { id: "before", tool: "ascet_get", params: { action: "tree", checkpoint: "before" }, phase: "precondition" as const };
        const after = { id: "after", tool: "ascet_get", params: { action: "tree", checkpoint: "after" }, phase: "postcondition" as const };
        await invoker.readback(first.action, first.variant, first.scenario, before);
        await invoker.readback(first.action, first.variant, first.scenario, after);
        assert.equal(contexts.at(-2)?.env.PI_ASCET_PHASE_ID, "readback-before-precondition");
        assert.equal(contexts.at(-1)?.env.PI_ASCET_PHASE_ID, "readback-after-postcondition");
		assert.match(readFileSync(join(String(contexts[0].env.PI_ASCET_EXTENSION_ARTIFACT_ROOT), "telemetry", "element-write.jsonl"), "utf8"), /case-1/);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("canonical result extraction prefers the raw Bridge payload", () => {
	assert.deepEqual(
		extractCanonicalResult({ details: { raw: { data: { ok: true, result: { changed: true, mutationStatus: "applied" } } }, outcome: { status: "ok" } } }),
		{ changed: true, mutationStatus: "applied" },
	);
	assert.deepEqual(
		extractCanonicalResult({ details: { raw: { data: { ok: true, result: { payload: { changed: true, mutationStatus: "applied" } } } } } }),
		{ changed: true, mutationStatus: "applied" },
	);
});

test("Bridge evidence extraction preserves raw and diagnostic fields", () => {
	assert.deepEqual(
		extractBridgeEvidence({ details: { raw: { request: { raw: true }, stdout: "raw", stderr: "", exitCode: 0 } } }),
		{ request: { raw: true }, stdout: "raw", stderr: "", exitCode: 0 },
	);
	assert.deepEqual(
		extractBridgeEvidence({ content: [{ text: "public" }], details: { diagnostics: { request: { diagnostic: true }, exitCode: 0 } } }),
		{ request: { diagnostic: true }, stdout: "public", stderr: undefined, exitCode: 0 },
	);
});

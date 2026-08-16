import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliJsonResult, AscetCliLifecycleEvent, AscetCliRequest } from "../cli.ts";
import { AscetMutationCoordinator, AscetMutationCoordinatorError } from "./mutation-coordinator.ts";
import { AscetMutationGuardStore } from "./mutation-guard-store.ts";

const request: AscetCliRequest = { cwd: "C:/Repo", cliPath: "AscetBridge.exe", args: [] };

function rawResult(input: Partial<AscetCliJsonResult>): AscetCliJsonResult {
	return {
		ok: false,
		data: null,
		request,
		stdout: "",
		stderr: "",
		exitCode: 1,
		timedOut: false,
		...input,
	};
}

function input(
	events: string[],
	dispatch: (onLifecycle: (event: AscetCliLifecycleEvent) => void) => Promise<AscetCliJsonResult>,
) {
	return {
		action: "apply_element_spec",
		planId: "plan-1",
		planFingerprint: "a".repeat(64),
		databaseFingerprint: "db-1",
		targetOid: "oid-1",
		targetKind: "component",
		canonicalPath: "Package\\Demo\\C",
		targetImpactFingerprint: "sha256:impact-1",
		guardGeneration: 0,
		sessionId: "session-1",
		approvalTtlMs: 60_000,
		journal: {
			beforeSnapshot: { elements: [{ name: "before" }] },
			attemptedMutation: { action: "apply_element_spec", elements: [{ name: "after" }] },
		},
		beginExecution: () => events.push("plan:executing"),
		completeExecution: () => events.push("plan:consumed"),
		dispatch,
	};
}

describe("ASCET mutation coordinator", () => {
	test("consumes approval and executes the guarded plan under one target lock", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-"));
		try {
			const events: string[] = [];
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			const raw = await coordinator.execute(
				input(events, async (onLifecycle) => {
					onLifecycle({ stage: "before_bridge", commandId: "apply_element_spec", jobKind: "write" });
					events.push("bridge:dispatch");
					onLifecycle({ stage: "bridge_entered", commandId: "apply_element_spec", jobKind: "write" });
					onLifecycle({ stage: "backend_response_received", commandId: "apply_element_spec", jobKind: "write" });
					return rawResult({
						ok: true,
						data: { result: { verifyReadbackRequested: true, readbackVerified: true } },
						exitCode: 0,
					});
				}),
			);
			assert.equal(raw.ok, true);
			assert.deepEqual(events, ["plan:executing", "bridge:dispatch", "plan:consumed"]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("does not dispatch when execution authorization cannot start", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-auth-"));
		try {
			const events: string[] = [];
			let dispatched = false;
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			const coordinatorInput = input(events, async () => {
				dispatched = true;
				return rawResult({ ok: true });
			});
			coordinatorInput.beginExecution = () => {
				throw new Error("execution authorization expired");
			};

			await assert.rejects(coordinator.execute(coordinatorInput), /execution authorization expired/u);
			assert.equal(dispatched, false);
			assert.equal(existsSync(coordinator.getTargetLockPath("db-1", "oid-1")), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("quarantines a stale target lock without deleting a lock it does not own", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-stale-"));
		try {
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			const lockPath = coordinator.getTargetLockPath("db-1", "oid-1");
			mkdirSync(join(lockPath, ".."), { recursive: true });
			writeFileSync(
				lockPath,
				`${JSON.stringify({ databaseFingerprint: "db-1", targetOid: "oid-1", pid: 2147483647 })}\n`,
			);
			let dispatched = false;

			await assert.rejects(
				coordinator.execute(
					input([], async () => {
						dispatched = true;
						return rawResult({});
					}),
				),
				(error: unknown) => {
					assert.ok(error instanceof AscetMutationCoordinatorError);
					assert.equal(error.code, "mutation_target_quarantined");
					return true;
				},
			);
			assert.equal(dispatched, false);
			assert.equal(existsSync(lockPath), true);
			const guard = new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1");
			assert.equal(guard.clear, false);
			assert.equal(guard.record?.reason, "process_interrupted");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("does not quarantine a failure before the mutation Bridge lifecycle starts", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-prebridge-"));
		try {
			const events: string[] = [];
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			await assert.rejects(
				coordinator.execute(
					input(events, async () => {
						throw new Error("local preparation failed");
					}),
				),
				/local preparation failed/u,
			);
			assert.deepEqual(events, ["plan:executing"]);
			assert.equal(new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1").clear, true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("does not quarantine a scheduler failure before bridge_entered", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-before-bridge-"));
		try {
			const events: string[] = [];
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			await assert.rejects(
				coordinator.execute(
					input(events, async (onLifecycle) => {
						onLifecycle({ stage: "before_bridge", commandId: "apply_element_spec", jobKind: "write" });
						throw new Error("scheduler lock unavailable");
					}),
				),
				/scheduler lock unavailable/u,
			);
			assert.deepEqual(events, ["plan:executing"]);
			assert.equal(new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1").clear, true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("quarantines an unknown outcome and blocks every alias for the same OID", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-coordinator-"));
		try {
			const coordinator = new AscetMutationCoordinator({ artifactRoot: root });
			await coordinator.execute(
				input([], async (onLifecycle) => {
					onLifecycle({ stage: "before_bridge", commandId: "apply_element_spec", jobKind: "write" });
					onLifecycle({ stage: "bridge_entered", commandId: "apply_element_spec", jobKind: "write" });
					onLifecycle({ stage: "backend_response_received", commandId: "apply_element_spec", jobKind: "write" });
					return rawResult({ error: { code: "write_outcome_unknown", message: "unknown" }, operationId: "op-1" });
				}),
			);
			const guard = new AscetMutationGuardStore({ artifactRoot: root }).assertClear("db-1", "oid-1");
			assert.equal(guard.clear, false);
			assert.equal(guard.record?.reason, "unknown_outcome");
			assert.ok(guard.record?.journalPath);
			assert.ok(existsSync(guard.record.journalPath));
			const journal = JSON.parse(readFileSync(guard.record.journalPath, "utf8")) as {
				status: string;
				beforeSnapshot: unknown;
				attemptedMutation: unknown;
			};
			assert.equal(journal.status, "unknown");
			assert.deepEqual(journal.beforeSnapshot, { elements: [{ name: "before" }] });
			assert.deepEqual(journal.attemptedMutation, {
				action: "apply_element_spec",
				elements: [{ name: "after" }],
			});
			assert.match(guard.record.beforeSnapshotFingerprint ?? "", /^sha256:/u);
			assert.match(guard.record.desiredFingerprint ?? "", /^sha256:/u);

			await assert.rejects(
				coordinator.execute({ ...input([], async () => rawResult({})), canonicalPath: "Project\\P::C" }),
				(error: unknown) => {
					assert.ok(error instanceof AscetMutationCoordinatorError);
					assert.equal(error.code, "mutation_target_quarantined");
					return true;
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

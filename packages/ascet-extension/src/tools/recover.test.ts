import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { AscetMutationGuardStore } from "../edit/mutation-guard-store.ts";
import { AscetMutationJournalStore } from "../edit/mutation-journal-store.ts";
import { getAscetDatabaseIdentity } from "../get.ts";
import { runAscetRecover } from "./recover.ts";

describe("ASCET mutation reconciliation", () => {
	test("inspects a quarantined target without clearing it", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-reconcile-inspect-"));
		try {
			const store = new AscetMutationGuardStore({ artifactRoot: root });
			const quarantined = store.quarantine({
				databaseFingerprint: "db-1",
				targetOid: "shared-oid",
				targetKind: "module",
				canonicalPath: "Package\\Shared",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-1",
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});

			const result = await runAscetRecover(
				{
					action: "reconcile_mutation",
					mode: "inspect",
					databaseFingerprint: "db-1",
					targetOid: "shared-oid",
					expectedGeneration: quarantined.generation,
				},
				{ cwd: process.cwd(), env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root } },
			);

			assert.equal(result.ok, true);
			assert.equal(result.data.mutationGuard?.clear, false);
			assert.equal(result.data.mutationGuard?.record?.status, "quarantined");
			assert.equal(store.assertClear("db-1", "shared-oid").clear, false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("returns verified journal metadata without exposing snapshot payloads", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-reconcile-journal-"));
		try {
			const journalStore = new AscetMutationJournalStore({ artifactRoot: root });
			const journal = journalStore.prepare({
				databaseFingerprint: "db-1",
				targetOid: "shared-oid",
				targetKind: "module",
				canonicalPath: "Package\\Shared",
				action: "apply_element_spec",
				planId: "plan-1",
				planFingerprint: "plan-fingerprint",
				targetImpactFingerprint: "impact-fingerprint",
				guardGeneration: 0,
				beforeSnapshot: { secret: "before" },
				attemptedMutation: { secret: "after" },
			});
			const guardStore = new AscetMutationGuardStore({ artifactRoot: root });
			const quarantined = guardStore.quarantine({
				databaseFingerprint: "db-1",
				targetOid: "shared-oid",
				targetKind: "module",
				canonicalPath: "Package\\Shared",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-1",
				journalPath: journal.path,
				beforeSnapshotFingerprint: journal.record.beforeSnapshotFingerprint,
				desiredFingerprint: journal.record.desiredFingerprint,
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});

			const result = await runAscetRecover(
				{
					action: "reconcile_mutation",
					mode: "inspect",
					databaseFingerprint: "db-1",
					targetOid: "shared-oid",
					expectedGeneration: quarantined.generation,
				},
				{ cwd: process.cwd(), env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root } },
			);

			assert.equal(result.data.mutationJournal?.status, "prepared");
			assert.equal(result.data.mutationJournal?.action, "apply_element_spec");
			assert.equal("beforeSnapshot" in (result.data.mutationJournal ?? {}), false);
			assert.equal("attemptedMutation" in (result.data.mutationJournal ?? {}), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("rolls an Element target back to the durable before snapshot and clears quarantine", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-reconcile-rollback-"));
		try {
			const database = { name: "DB", path: "C:/Repo/DB" };
			const databaseFingerprint = getAscetDatabaseIdentity({ database })?.fingerprint;
			assert.ok(databaseFingerprint);
			const beforeElements = [{ name: "A", kind: "variable", modelType: "cont", scope: "local" }];
			const attemptedElements = [
				...beforeElements,
				{ name: "B", kind: "variable", modelType: "cont", scope: "local" },
			];
			const journalStore = new AscetMutationJournalStore({ artifactRoot: root });
			const journal = journalStore.prepare({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				action: "apply_element_spec",
				planId: "plan-rollback",
				planFingerprint: "plan-fingerprint",
				targetImpactFingerprint: "impact-fingerprint",
				guardGeneration: 0,
				beforeSnapshot: {
					catalogSnapshot: { identity: { componentOID: "oid-1" }, elements: beforeElements },
					normalizedSpec: { elements: attemptedElements },
				},
				attemptedMutation: { action: "apply_element_spec" },
			});
			const guardStore = new AscetMutationGuardStore({ artifactRoot: root });
			const quarantined = guardStore.quarantine({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-rollback",
				journalPath: journal.path,
				beforeSnapshotFingerprint: journal.record.beforeSnapshotFingerprint,
				desiredFingerprint: journal.record.desiredFingerprint,
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});
			let catalogReads = 0;
			let restoredSpec: unknown;
			const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
				let result: unknown;
				if (request.args[1] === "get_database_identity") {
					result = { database };
				} else if (request.args[1] === "read_element_catalog") {
					catalogReads++;
					result = {
						identity: { componentOID: "oid-1" },
						elements: catalogReads === 1 ? attemptedElements : beforeElements,
					};
				} else if (request.args[1] === "apply_element_spec") {
					restoredSpec = JSON.parse(readFileSync(request.args[3]!, "utf8")) as unknown;
					result = { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
				} else {
					throw new Error(`Unexpected operation ${request.args[1]}`);
				}
				return {
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result, error: null }),
					stderr: "",
					timedOut: false,
					request,
				};
			};

			const result = await runAscetRecover(
				{
					action: "reconcile_mutation",
					mode: "rollback_to_before",
					databaseFingerprint,
					targetOid: "oid-1",
					expectedGeneration: quarantined.generation,
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root },
					executeCli,
					confirm: async () => true,
				},
			);

			assert.equal(result.data.reconciliation?.status, "rolled_back");
			assert.deepEqual(restoredSpec, { elements: beforeElements });
			assert.equal(guardStore.assertClear(databaseFingerprint, "oid-1").clear, true);
			assert.equal(journalStore.load(journal.path).status, "rolled_back");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("cleanup_created removes only journal-proven created Elements", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-reconcile-cleanup-"));
		try {
			const database = { name: "DB", path: "C:/Repo/DB" };
			const databaseFingerprint = getAscetDatabaseIdentity({ database })?.fingerprint;
			assert.ok(databaseFingerprint);
			const beforeElements = [{ name: "A", kind: "variable", modelType: "cont", scope: "local", comment: "before" }];
			const liveA = { ...beforeElements[0], comment: "keep-current" };
			const createdB = { name: "B", kind: "variable", modelType: "cont", scope: "local" };
			const journalStore = new AscetMutationJournalStore({ artifactRoot: root });
			const journal = journalStore.prepare({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				action: "apply_element_spec",
				planId: "plan-cleanup",
				planFingerprint: "plan-fingerprint",
				targetImpactFingerprint: "impact-fingerprint",
				guardGeneration: 0,
				beforeSnapshot: {
					catalogSnapshot: { identity: { componentOID: "oid-1" }, elements: beforeElements },
					normalizedSpec: { elements: [createdB] },
				},
				attemptedMutation: { action: "apply_element_spec" },
			});
			const guardStore = new AscetMutationGuardStore({ artifactRoot: root });
			const quarantined = guardStore.quarantine({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-cleanup",
				journalPath: journal.path,
				beforeSnapshotFingerprint: journal.record.beforeSnapshotFingerprint,
				desiredFingerprint: journal.record.desiredFingerprint,
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});
			let catalogReads = 0;
			let cleanupSpec: unknown;
			const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
				let result: unknown;
				if (request.args[1] === "get_database_identity") result = { database };
				else if (request.args[1] === "read_element_catalog") {
					catalogReads++;
					result = {
						identity: { componentOID: "oid-1" },
						elements: catalogReads === 1 ? [liveA, createdB] : [liveA],
					};
				} else if (request.args[1] === "apply_element_spec") {
					cleanupSpec = JSON.parse(readFileSync(request.args[3]!, "utf8")) as unknown;
					result = { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
				} else throw new Error(`Unexpected operation ${request.args[1]}`);
				return {
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result, error: null }),
					stderr: "",
					timedOut: false,
					request,
				};
			};
			const result = await runAscetRecover(
				{
					action: "reconcile_mutation",
					mode: "cleanup_created",
					databaseFingerprint,
					targetOid: "oid-1",
					expectedGeneration: quarantined.generation,
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root },
					executeCli,
					confirm: async () => true,
				},
			);
			assert.deepEqual(cleanupSpec, { elements: [liveA] });
			const reconciliation = result.data.reconciliation;
			assert.ok(reconciliation && "removedElements" in reconciliation);
			assert.deepEqual(reconciliation.removedElements, ["B"]);
			assert.equal(guardStore.assertClear(databaseFingerprint, "oid-1").clear, true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("accept_current clears quarantine only when the complete Element catalog matches the journal target state", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-reconcile-accept-"));
		try {
			const database = { name: "DB", path: "C:/Repo/DB" };
			const databaseFingerprint = getAscetDatabaseIdentity({ database })?.fingerprint;
			assert.ok(databaseFingerprint);
			const beforeA = { name: "A", kind: "variable", modelType: "cont", scope: "local", comment: "before" };
			const desiredA = { ...beforeA, comment: "after" };
			const journalStore = new AscetMutationJournalStore({ artifactRoot: root });
			const journal = journalStore.prepare({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				action: "apply_element_spec",
				planId: "plan-accept",
				planFingerprint: "plan-fingerprint",
				targetImpactFingerprint: "impact-fingerprint",
				guardGeneration: 0,
				beforeSnapshot: {
					catalogSnapshot: { identity: { componentOID: "oid-1" }, elements: [beforeA] },
					normalizedSpec: { elements: [desiredA] },
				},
				attemptedMutation: { action: "apply_element_spec", intent: "patch" },
			});
			const guardStore = new AscetMutationGuardStore({ artifactRoot: root });
			const quarantined = guardStore.quarantine({
				databaseFingerprint,
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-accept",
				journalPath: journal.path,
				beforeSnapshotFingerprint: journal.record.beforeSnapshotFingerprint,
				desiredFingerprint: journal.record.desiredFingerprint,
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});
			const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
				const result =
					request.args[1] === "get_database_identity"
						? { database }
						: request.args[1] === "read_element_catalog"
							? { identity: { componentOID: "oid-1" }, elements: [desiredA] }
							: (() => {
									throw new Error(`Unexpected operation ${request.args[1]}`);
								})();
				return {
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result, error: null }),
					stderr: "",
					timedOut: false,
					request,
				};
			};
			const result = await runAscetRecover(
				{
					action: "reconcile_mutation",
					mode: "accept_current",
					databaseFingerprint,
					targetOid: "oid-1",
					expectedGeneration: quarantined.generation,
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root },
					executeCli,
					confirm: async () => true,
				},
			);
			assert.equal(result.data.reconciliation?.status, "accepted_current");
			assert.equal(guardStore.assertClear(databaseFingerprint, "oid-1").clear, true);
			assert.equal(journalStore.load(journal.path).status, "applied");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

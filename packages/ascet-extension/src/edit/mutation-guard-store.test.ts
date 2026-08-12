import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { AscetMutationGuardStore, AscetMutationGuardStoreError } from "./mutation-guard-store.ts";

function environment(): { root: string; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "ascet-mutation-guard-"));
	return { root, cleanup: () => rmSync(root, { recursive: true, force: true }) };
}

describe("ASCET mutation guard store", () => {
	test("persists unknown outcomes by database fingerprint and target OID", () => {
		const env = environment();
		try {
			const store = new AscetMutationGuardStore({ artifactRoot: env.root });
			const record = store.quarantine({
				databaseFingerprint: "db-1",
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-1",
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});

			assert.equal(record.status, "quarantined");
			assert.equal(record.generation, 1);
			assert.deepEqual(store.assertClear("db-1", "oid-1"), {
				clear: false,
				generation: 1,
				record,
			});
			assert.equal(JSON.parse(readFileSync(store.getRecordPath("db-1", "oid-1"), "utf8")).targetOid, "oid-1");
		} finally {
			env.cleanup();
		}
	});

	test("cannot be bypassed by a different alias path for the same OID", () => {
		const env = environment();
		try {
			const store = new AscetMutationGuardStore({ artifactRoot: env.root });
			store.quarantine({
				databaseFingerprint: "db-1",
				targetOid: "shared-oid",
				targetKind: "module",
				canonicalPath: "Package\\Shared",
				reason: "rollback_failed",
				operation: "set_method_code",
				operationId: "operation-2",
				evidence: { bridgeEntered: true, backendResponseReceived: true, mutationStarted: true },
			});

			assert.equal(store.assertClear("db-1", "shared-oid").clear, false);
			assert.equal(store.assertClear("db-1", "other-oid").clear, true);
		} finally {
			env.cleanup();
		}
	});

	test("requires reconciliation evidence and increments generation when cleared", () => {
		const env = environment();
		try {
			const store = new AscetMutationGuardStore({ artifactRoot: env.root });
			const quarantined = store.quarantine({
				databaseFingerprint: "db-1",
				targetOid: "oid-1",
				targetKind: "component",
				canonicalPath: "Package\\C",
				reason: "unknown_outcome",
				operation: "apply_element_spec",
				operationId: "operation-3",
				evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
			});
			const cleared = store.clear({
				databaseFingerprint: "db-1",
				targetOid: "oid-1",
				expectedGeneration: quarantined.generation,
				reconciliationEvidenceFingerprint: "sha256:reconciled",
			});

			assert.equal(cleared.status, "clear");
			assert.equal(cleared.generation, 2);
			assert.deepEqual(store.assertClear("db-1", "oid-1"), { clear: true, generation: 2, record: cleared });
			assert.throws(
				() =>
					store.clear({
						databaseFingerprint: "db-1",
						targetOid: "oid-1",
						expectedGeneration: 1,
						reconciliationEvidenceFingerprint: "sha256:stale",
					}),
				(error: unknown) =>
					error instanceof AscetMutationGuardStoreError && error.code === "guard_generation_mismatch",
			);
		} finally {
			env.cleanup();
		}
	});
});

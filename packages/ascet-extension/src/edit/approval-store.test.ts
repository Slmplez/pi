import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { AscetApprovalStore, AscetApprovalStoreError } from "./approval-store.ts";

function environment(now = "2026-08-11T00:00:00.000Z") {
	const root = mkdtempSync(join(tmpdir(), "ascet-approval-store-"));
	let current = new Date(now);
	return {
		root,
		now: () => new Date(current),
		advance(milliseconds: number) {
			current = new Date(current.getTime() + milliseconds);
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

const binding = {
	action: "apply_element_spec",
	planId: "plan-1",
	planFingerprint: "plan-fingerprint",
	databaseFingerprint: "database-fingerprint",
	targetOid: "target-oid",
	targetImpactFingerprint: "impact-fingerprint",
	guardGeneration: 2,
	sessionId: "session-1",
};

describe("ASCET approval store", () => {
	test("creates and atomically consumes a target-bound receipt", () => {
		const env = environment();
		try {
			const store = new AscetApprovalStore({ artifactRoot: env.root, now: env.now, generateToken: () => "secret" });
			const created = store.create({ ...binding, ttlMs: 60_000 });
			assert.equal(created.receipt.consumedAt, undefined);
			assert.notEqual(created.receipt.tokenHash, created.token);

			const consumed = store.consume({ ...binding, approvalId: created.receipt.approvalId, token: created.token });
			assert.equal(consumed.consumedAt, "2026-08-11T00:00:00.000Z");
			assert.throws(
				() => store.consume({ ...binding, approvalId: created.receipt.approvalId, token: created.token }),
				(error: unknown) => error instanceof AscetApprovalStoreError && error.code === "approval_consumed",
			);
		} finally {
			env.cleanup();
		}
	});

	test("rejects target, impact, and guard generation mismatches", () => {
		const env = environment();
		try {
			const store = new AscetApprovalStore({ artifactRoot: env.root, now: env.now, generateToken: () => "secret" });
			const created = store.create({ ...binding, ttlMs: 60_000 });
			for (const mismatch of [
				{ targetOid: "other-target" },
				{ targetImpactFingerprint: "other-impact" },
				{ guardGeneration: 3 },
			]) {
				assert.throws(
					() =>
						store.consume({
							...binding,
							...mismatch,
							approvalId: created.receipt.approvalId,
							token: created.token,
						}),
					(error: unknown) =>
						error instanceof AscetApprovalStoreError && error.code === "approval_binding_mismatch",
				);
			}
		} finally {
			env.cleanup();
		}
	});

	test("rejects expired receipts", () => {
		const env = environment();
		try {
			const store = new AscetApprovalStore({ artifactRoot: env.root, now: env.now, generateToken: () => "secret" });
			const created = store.create({ ...binding, ttlMs: 1_000 });
			env.advance(1_001);
			assert.throws(
				() => store.consume({ ...binding, approvalId: created.receipt.approvalId, token: created.token }),
				(error: unknown) => error instanceof AscetApprovalStoreError && error.code === "approval_expired",
			);
		} finally {
			env.cleanup();
		}
	});
});

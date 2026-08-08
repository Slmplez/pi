import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	type AscetPlanRecord,
	AscetPlanStore,
	AscetPlanStoreError,
	canonicalizeAscetPlanJson,
	createAscetPlanFingerprint,
} from "./plan-store.ts";

function createRoot(): string {
	return mkdtempSync(join(tmpdir(), "pi-ascet-plan-store-"));
}

function assertPlanError(callback: () => unknown, code: AscetPlanStoreError["code"]): void {
	assert.throws(callback, (error: unknown) => {
		assert.ok(error instanceof AscetPlanStoreError);
		assert.equal(error.code, code);
		return true;
	});
}

function createInput() {
	return {
		operation: "apply_element_spec",
		params: {
			targetPath: "Demo/Element",
			data: { value: 42, variant: "Default" },
		},
		backendPreflight: {
			ok: true,
			resolved: { kind: "Parameter", oid: "P-1" },
		},
	} as const;
}

describe("AscetPlanStore", () => {
	test("creates a canonical persisted plan and reads it back", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-create" });
			const input = createInput();
			const created = store.create(input);
			const persistedPath = join(root, "plans", "plan-create.json");
			const loaded = store.load(created.planId);
			const persisted = JSON.parse(readFileSync(persistedPath, "utf8")) as AscetPlanRecord;

			assert.equal(existsSync(persistedPath), true);
			assert.deepEqual(loaded, created);
			assert.deepEqual(persisted, created);
			assert.equal(
				created.fingerprint,
				createAscetPlanFingerprint(input.operation, input.params, input.backendPreflight),
			);
			assert.equal(canonicalizeAscetPlanJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("uses canonical ordering and reports stale plans before commit", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-stale" });
			const input = createInput();
			const created = store.create(input);

			assert.deepEqual(
				store.verify({
					planId: created.planId,
					operation: input.operation,
					params: { data: { variant: "Default", value: 42 }, targetPath: "Demo/Element" },
					backendPreflight: { resolved: { oid: "P-1", kind: "Parameter" }, ok: true },
				}),
				created,
			);
			assertPlanError(
				() =>
					store.verify({
						planId: created.planId,
						operation: input.operation,
						params: { ...input.params, data: { ...input.params.data, value: 43 } },
						backendPreflight: input.backendPreflight,
					}),
				"stale_plan",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("returns structured errors for operation and plan identity mismatches", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-identity" });
			const input = createInput();
			const created = store.create(input);

			assertPlanError(
				() => store.verify({ ...input, planId: created.planId, operation: "set_element_dependency" }),
				"plan_operation_mismatch",
			);

			const persistedPath = join(root, "plans", "plan-identity.json");
			const persisted = JSON.parse(readFileSync(persistedPath, "utf8")) as AscetPlanRecord;
			writeFileSync(persistedPath, JSON.stringify({ ...persisted, planId: "plan-other" }), "utf8");
			assertPlanError(() => store.load(created.planId), "plan_id_mismatch");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("returns plan_expired when the verification clock passes expiresAt", () => {
		const root = createRoot();
		let now = new Date("2026-08-08T00:00:00.000Z");
		try {
			const store = new AscetPlanStore({
				artifactRoot: root,
				now: () => now,
				generatePlanId: () => "plan-expired",
			});
			const input = createInput();
			const created = store.create({ ...input, ttlMs: 1_000 });
			now = new Date(created.expiresAt);

			assertPlanError(() => store.load(created.planId), "plan_expired");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("binds a plan to workspace, agent, and runtime session", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-binding" });
			const input = createInput();
			const binding = { workspace: "C:/Repo", agentId: "agent-a", sessionId: "session-a" };
			const created = store.create({ ...input, binding });

			assert.deepEqual(store.verify({ ...input, planId: created.planId, binding }), created);
			assertPlanError(
				() =>
					store.verify({
						...input,
						planId: created.planId,
						binding: { ...binding, agentId: "agent-b" },
					}),
				"plan_binding_mismatch",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("consume marks a plan atomically and prevents replay", () => {
		const root = createRoot();
		let now = new Date("2026-08-08T00:00:00.000Z");
		try {
			const store = new AscetPlanStore({
				artifactRoot: root,
				now: () => now,
				generatePlanId: () => "plan-consume",
			});
			const input = createInput();
			const created = store.create(input);
			const consumed = store.consume({ ...input, planId: created.planId });

			assert.equal(consumed.consumedAt, now.toISOString());
			assertPlanError(() => store.consume({ ...input, planId: created.planId }), "plan_consumed");
			assertPlanError(() => store.load(created.planId), "plan_consumed");

			now = new Date("2026-08-08T00:01:00.000Z");
			assertPlanError(() => store.consume({ ...input, planId: created.planId }), "plan_consumed");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

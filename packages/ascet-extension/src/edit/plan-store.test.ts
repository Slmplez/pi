import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	ASCET_PLAN_RECORD_VERSION,
	type AscetPlanRecord,
	AscetPlanStore,
	AscetPlanStoreError,
	type CreateAscetPlanInput,
	canonicalizeAscetPlanJson,
	createAscetPlanContractFingerprint,
	createAscetPlanEvidenceFingerprint,
	createAscetPlanFingerprint,
	type VerifyAscetPlanInput,
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

function createInput(): CreateAscetPlanInput {
	return {
		operation: "apply_element_spec",
		params: {
			action: "apply_element_spec",
			componentPath: "Demo/Element",
			intent: "create",
			elements: [{ name: "P", kind: "parameter" }],
		},
		binding: { workspace: "C:/Repo", agentId: "agent-a", sessionId: "session-a" },
		databaseIdentity: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
		targetIdentity: { path: "Demo/Element", oid: "component-1", kind: "component" },
		targetImpact: {
			sharedObject: true,
			requestedPath: "Project\\Demo::Element",
			ownerPath: "Package\\Demo\\Element",
			targetOid: "component-1",
			aliasPaths: ["Package\\Demo\\Element", "Project\\Demo::Element"],
			affectedProjects: ["Project\\Demo"],
			completeness: "complete",
			writeAllowed: true,
			fingerprint: "sha256:impact-a",
		},
		guardGeneration: 4,
		backendPreflight: {
			ok: true,
			resolved: { kind: "component", oid: "component-1" },
		},
		contractFingerprint: createAscetPlanContractFingerprint({
			action: "apply_element_spec",
			phase: "plan",
			intent: "create",
		}),
	};
}

function verifyInput(planId: string): VerifyAscetPlanInput {
	return { ...createInput(), planId };
}

describe("AscetPlanStore v3", () => {
	test("creates a canonical persisted v3 plan with impact, guard generation, and layered fingerprints", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-create" });
			const input = createInput();
			const created = store.create(input);
			const persistedPath = join(root, "plans", "plan-create.json");
			const loaded = store.load(created.planId);
			const persisted = JSON.parse(readFileSync(persistedPath, "utf8")) as AscetPlanRecord;
			const evidenceFingerprint = createAscetPlanEvidenceFingerprint(
				input.backendPreflight,
				input.databaseIdentity,
				input.targetIdentity,
				input.targetImpact,
				input.guardGeneration,
			);

			assert.equal(existsSync(persistedPath), true);
			assert.equal(created.version, ASCET_PLAN_RECORD_VERSION);
			assert.equal(created.state, "planned");
			assert.deepEqual(created.targetImpact, input.targetImpact);
			assert.equal(created.guardGeneration, 4);
			assert.deepEqual(loaded, created);
			assert.deepEqual(persisted, created);
			assert.equal(created.evidenceFingerprint, evidenceFingerprint);
			assert.equal(
				created.planFingerprint,
				createAscetPlanFingerprint({
					operation: input.operation,
					params: input.params,
					binding: input.binding,
					databaseIdentity: input.databaseIdentity,
					targetIdentity: input.targetIdentity,
					targetImpact: input.targetImpact,
					guardGeneration: input.guardGeneration,
					evidenceFingerprint,
					contractFingerprint: input.contractFingerprint,
				}),
			);
			assert.equal(canonicalizeAscetPlanJson({ b: 2, a: 1 }), '{"a":1,"b":2}');
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("rejects legacy records instead of executing a v1 plan", () => {
		const root = createRoot();
		try {
			const planDirectory = join(root, "plans");
			mkdirSync(planDirectory, { recursive: true });
			writeFileSync(
				join(planDirectory, "legacy-plan.json"),
				JSON.stringify({
					planId: "legacy-plan",
					operation: "apply_element_spec",
					params: {},
					backendPreflight: {},
					fingerprint: "a".repeat(64),
					createdAt: "2026-08-11T00:00:00.000Z",
					expiresAt: "2026-08-11T00:05:00.000Z",
				}),
				"utf8",
			);
			const store = new AscetPlanStore({ artifactRoot: root });
			assertPlanError(() => store.load("legacy-plan"), "plan_version_unsupported");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("validates operation, binding, contract, database, target, evidence, and params independently", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-validation" });
			const created = store.create(createInput());
			const current = verifyInput(created.planId);
			assert.deepEqual(store.verify(current), created);
			assertPlanError(
				() => store.verify({ ...current, operation: "set_element_dependency" }),
				"plan_operation_mismatch",
			);
			assertPlanError(
				() => store.verify({ ...current, binding: { ...current.binding, agentId: "agent-b" } }),
				"plan_binding_mismatch",
			);
			assertPlanError(
				() => store.verify({ ...current, contractFingerprint: "b".repeat(64) }),
				"plan_contract_mismatch",
			);
			assertPlanError(
				() =>
					store.verify({
						...current,
						databaseIdentity: { ...current.databaseIdentity, path: "C:/Repo/Other", fingerprint: "b".repeat(64) },
					}),
				"plan_database_identity_mismatch",
			);
			assertPlanError(
				() => store.verify({ ...current, targetIdentity: { ...current.targetIdentity, oid: "component-2" } }),
				"plan_target_identity_mismatch",
			);
			assertPlanError(
				() => store.verify({ ...current, targetImpact: { fingerprint: "sha256:impact-b" } }),
				"plan_target_impact_mismatch",
			);
			assertPlanError(
				() => store.verify({ ...current, guardGeneration: current.guardGeneration + 1 }),
				"plan_guard_generation_mismatch",
			);
			assertPlanError(
				() =>
					store.verify({
						...current,
						backendPreflight: { ok: true, resolved: { kind: "component", oid: "component-1" }, changed: true },
					}),
				"plan_evidence_mismatch",
			);
			assertPlanError(
				() =>
					store.verify({
						...current,
						params: { action: "apply_element_spec", componentPath: "Demo/Other", intent: "create", elements: [] },
					}),
				"stale_plan",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("returns plan identity mismatch for a renamed persisted record", () => {
		const root = createRoot();
		try {
			const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-identity" });
			const created = store.create(createInput());
			const persistedPath = join(root, "plans", "plan-identity.json");
			const persisted = JSON.parse(readFileSync(persistedPath, "utf8")) as AscetPlanRecord;
			writeFileSync(persistedPath, JSON.stringify({ ...persisted, planId: "plan-other" }), "utf8");
			assertPlanError(() => store.load(created.planId), "plan_id_mismatch");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("returns plan_expired at the exact expiration boundary", () => {
		const root = createRoot();
		let now = new Date("2026-08-11T00:00:00.000Z");
		try {
			const store = new AscetPlanStore({ artifactRoot: root, now: () => now, generatePlanId: () => "plan-expired" });
			const created = store.create({ ...createInput(), ttlMs: 1_000 });
			now = new Date(created.expiresAt);
			assertPlanError(() => store.load(created.planId), "plan_expired");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("consume is lock-protected, marks the plan atomically, and prevents replay", () => {
		const root = createRoot();
		let now = new Date("2026-08-11T00:00:00.000Z");
		try {
			const store = new AscetPlanStore({ artifactRoot: root, now: () => now, generatePlanId: () => "plan-consume" });
			const created = store.create(createInput());
			const input = verifyInput(created.planId);
			const lockPath = join(root, "plans", "plan-consume.json.consume.lock");
			writeFileSync(lockPath, "locked", "utf8");
			assertPlanError(() => store.consume(input), "plan_busy");
			assert.equal(existsSync(lockPath), true, "a competing consumer must not delete the active consume lock");
			rmSync(lockPath, { force: true });

			const executing = store.beginExecution(input);
			assert.equal(executing.state, "executing");
			assert.equal(executing.executingAt, now.toISOString());
			assertPlanError(() => store.load(created.planId), "plan_executing");
			const consumed = store.consume(input);
			assert.equal(consumed.state, "consumed");
			assert.equal(consumed.consumedAt, now.toISOString());
			assertPlanError(() => store.consume(input), "plan_consumed");
			assertPlanError(() => store.load(created.planId), "plan_consumed");
			now = new Date("2026-08-11T00:01:00.000Z");
			assertPlanError(() => store.consume(input), "plan_consumed");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

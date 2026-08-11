import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import {
	ASCET_PLAN_RECORD_VERSION,
	AscetPlanStore,
	AscetPlanStoreError,
	type CreateAscetPlanInput,
	createAscetPlanContractFingerprint,
	type VerifyAscetPlanInput,
} from "./plan-store.ts";

function createInput(): CreateAscetPlanInput {
	const input: Record<string, unknown> = {
		operation: "apply_element_spec",
		params: { action: "apply_element_spec", componentPath: "Demo/Element", intent: "create", elements: [] },
		binding: { workspace: "C:/Repo", agentId: "agent-a", sessionId: "session-a" },
		databaseIdentity: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
		targetIdentity: { path: "Demo/Element", oid: "component-1", kind: "component" },
		backendPreflight: { ok: true },
		contractFingerprint: createAscetPlanContractFingerprint({ action: "apply_element_spec", phase: "plan" }),
	};
	if (Number(ASCET_PLAN_RECORD_VERSION) === 3) {
		input.targetImpact = {
			sharedObject: false,
			requestedPath: "Demo/Element",
			ownerPath: "Demo/Element",
			targetOid: "component-1",
			aliasPaths: ["Demo/Element"],
			affectedProjects: [],
			completeness: "complete",
			writeAllowed: true,
			fingerprint: "sha256:impact",
		};
		input.guardGeneration = 0;
	}
	return input as unknown as CreateAscetPlanInput;
}

test("plan_busy contender does not remove the active consume lock", () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-plan-lock-"));
	try {
		const store = new AscetPlanStore({ artifactRoot: root, generatePlanId: () => "plan-lock" });
		const created = store.create(createInput());
		const lockPath = join(root, "plans", `${created.planId}.json.consume.lock`);
		writeFileSync(lockPath, "held", "utf8");
		const input = { ...createInput(), planId: created.planId } as VerifyAscetPlanInput;
		assert.throws(
			() => store.consume(input),
			(error: unknown) => error instanceof AscetPlanStoreError && error.code === "plan_busy",
		);
		assert.equal(existsSync(lockPath), true);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

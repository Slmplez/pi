import assert from "node:assert/strict";
import test from "node:test";
import type { AscetInspection } from "./contracts.ts";
import { generateEsdlDraft, validateEsdlDraftTarget } from "./esdl-draft.ts";

const inspection: AscetInspection = {
	schemaVersion: "ascet-inspection/v1",
	componentPath: "AEB_Core/AEB_Release",
	objectKind: "class",
	complete: true,
	summary: {},
	methods: [{ name: "step" }],
	interfaces: { inputs: [], outputs: [], parameters: [], variables: [] },
	dependencies: [],
	operations: [],
	warnings: [],
	errors: [],
	sourceHash: "inspection-hash",
};

test("generates a review-only ESDL draft without live write", () => {
	const draft = generateEsdlDraft({
		runId: "run-001",
		componentPath: "AEB_Core/AEB_Release",
		inspection,
		methodDrafts: [{ methodName: "step", code: "brakeRequest = vehicleSpeed > 50;", operation: "replace" }],
	});
	assert.equal(draft.valid, true);
	assert.equal(draft.readbackRequired, true);
	assert.equal(draft.text.includes("target: AEB_Core/AEB_Release"), true);
	assert.deepEqual(validateEsdlDraftTarget(draft, inspection), []);
});

test("rejects missing ESDL semantics and target mismatch", () => {
	const missing = generateEsdlDraft({ runId: "run-001", componentPath: "AEB_Core/AEB_Release", inspection });
	assert.equal(missing.valid, false);
	assert.equal(
		missing.issues.some((issue) => issue.code === "esdl_invalid"),
		true,
	);
	const mismatch = generateEsdlDraft({
		runId: "run-001",
		componentPath: "AEB_Core/Other",
		inspection,
		methodDrafts: [{ methodName: "step", code: "{}" }],
	});
	assert.equal(
		mismatch.issues.some((issue) => issue.code === "draft_target_mismatch"),
		true,
	);
});

test("carries new parameters into a deterministic review-only apply plan", () => {
	const draft = generateEsdlDraft({
		runId: "run-002",
		componentPath: "AEB_Core/AEB_Release",
		inspection,
		methodDrafts: [{ methodName: "step", code: "{}" }],
		elementSpec: {
			schemaVersion: "ascet-element-spec/v1",
			componentPath: "AEB_Core/AEB_Release",
			elements: [{ name: "emergencyThreshold", kind: "parameter", type: "float", defaultValue: 50 }],
		},
	});
	assert.equal(draft.elementSpec?.valid, true);
	assert.equal(draft.applyPlan?.schemaVersion, "ascet-esdl-apply-plan/v1");
	assert.equal(draft.applyPlan?.ready, true);
	assert.equal(draft.applyPlan?.operations[0]?.action, "create");
	assert.equal(draft.applyPlan?.liveWritePerformed, false);
});

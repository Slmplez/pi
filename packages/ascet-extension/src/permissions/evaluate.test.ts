import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAscetEditPermissionDescriptor } from "./descriptors.ts";
import { evaluateAscetPermission } from "./evaluate.ts";
import type { AscetPermissionEvaluationInput, PermissionMode } from "./types.ts";

function evaluate(
	mode: PermissionMode,
	action: AscetPermissionEvaluationInput["action"],
	overrides: Partial<AscetPermissionEvaluationInput> = {},
) {
	const descriptor = getAscetEditPermissionDescriptor(action);
	assert.ok(descriptor);
	return evaluateAscetPermission({
		mode,
		action,
		descriptor,
		hardGatesPassed: true,
		evidenceComplete: true,
		path: "DEMO\\Component",
		...overrides,
	});
}

describe("ASCET permission evaluator", () => {
	test("implements the initial mode/risk matrix", () => {
		assert.equal(evaluate("default", "create_method").behavior, "ask");
		assert.equal(evaluate("default", "set_element_dependency").behavior, "ask");
		assert.equal(evaluate("default", "delete_method").behavior, "ask");
		assert.equal(evaluate("acceptEdits", "create_method").behavior, "allow");
		assert.equal(evaluate("acceptEdits", "set_element_dependency").behavior, "ask");
		assert.equal(evaluate("acceptEdits", "delete_method").behavior, "ask");
		assert.equal(evaluate("auto", "create_method").behavior, "allow");
		assert.equal(evaluate("auto", "set_element_dependency").behavior, "ask");
	});

	test("requires scoped allow for medium auto writes", () => {
		assert.equal(
			evaluate("auto", "set_element_dependency", {
				rules: [{ behavior: "allow", action: "set_element_dependency", path: "DEMO*" }],
			}).behavior,
			"allow",
		);
	});

	test("requires separate primary and editability allows for a compound medium write", () => {
		assert.equal(
			evaluate("auto", "set_element_dependency", {
				editableAcquisitionRequired: true,
				rules: [{ behavior: "allow", action: "request_editability", path: "DEMO*" }],
			}).behavior,
			"ask",
		);
		assert.equal(
			evaluate("auto", "set_element_dependency", {
				editableAcquisitionRequired: true,
				rules: [
					{ behavior: "allow", action: "set_element_dependency", path: "DEMO*" },
					{ behavior: "allow", action: "request_editability", path: "DEMO*" },
				],
			}).behavior,
			"allow",
		);
	});

	test("uses a minimum-risk floor for effects such as missing Diagram creation", () => {
		assert.equal(evaluate("acceptEdits", "create_method", { minimumRisk: "medium" }).behavior, "ask");
		assert.equal(evaluate("auto", "create_method", { minimumRisk: "medium" }).behavior, "ask");
		assert.equal(
			evaluate("auto", "create_method", {
				minimumRisk: "medium",
				rules: [{ behavior: "allow", action: "create_method", path: "DEMO*" }],
			}).behavior,
			"allow",
		);
	});

	test("never lets allow rules auto-approve high-risk writes", () => {
		const result = evaluate("auto", "delete_method", {
			rules: [{ behavior: "allow", action: "delete_method", path: "DEMO*" }],
		});
		assert.equal(result.risk, "high");
		assert.equal(result.behavior, "ask");
	});

	test("lets explicit deny win in every mode", () => {
		for (const mode of ["default", "acceptEdits", "auto"] as const) {
			assert.equal(
				evaluate(mode, "create_method", {
					rules: [{ behavior: "deny", action: "create_method", path: "DEMO*" }],
				}).behavior,
				"deny",
			);
		}
	});

	test("blocks failed hard gates and incomplete evidence", () => {
		assert.equal(evaluate("auto", "create_method", { hardGatesPassed: false }).behavior, "deny");
		assert.equal(evaluate("auto", "create_method", { evidenceComplete: false }).behavior, "deny");
	});

	test("allows verified no-op without a dialog", () => {
		assert.equal(evaluate("default", "create_method", { noOp: true }).behavior, "allow");
	});

	test("raises editable acquisition to medium and enforces mode rules", () => {
		assert.equal(evaluate("acceptEdits", "create_method", { editableAcquisitionRequired: true }).behavior, "ask");
		assert.equal(evaluate("auto", "create_method", { editableAcquisitionRequired: true }).behavior, "ask");
		assert.equal(
			evaluate("auto", "create_method", {
				editableAcquisitionRequired: true,
				rules: [{ behavior: "allow", action: "request_editability", path: "DEMO*" }],
			}).behavior,
			"allow",
		);
	});

	test("classifies shared-object writes as high risk", () => {
		const result = evaluate("auto", "create_method", { sharedObject: true });
		assert.equal(result.risk, "high");
		assert.equal(result.behavior, "ask");
	});
});

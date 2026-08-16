import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAscetEditAction, getAscetEditActionByDiscriminator, listAscetEditActions } from "./contract.ts";

const expectedRisks = {
	create_folder: "safe",
	create_component: "safe",
	create_method: "safe",
	create_dependent_chain: "high",
	set_method_signature: "safe",
	delete_component: "high",
	delete_method: "high",
	delete_folder: "high",
	set_method_code: "high",
	set_module_code: "high",
	set_state_machine_code: "high",
	set_enumerators: "safe",
	apply_element_spec: "medium",
	apply_project_formula: "medium",
	set_element_dependency: "medium",
	check: undefined,
	set: "medium",
} as const;

describe("ASCET edit action contract", () => {
	test("defines the complete canonical action matrix", () => {
		const actions = listAscetEditActions();

		assert.equal(actions.length, 17);
		assert.equal(new Set(actions.map((action) => action.id)).size, 17);
		assert.deepEqual(
			actions.map((action) => action.id),
			Object.keys(expectedRisks),
		);

		for (const action of actions) {
			assert.equal(action.permission?.baseRisk, expectedRisks[action.id]);
			assert.ok(action.executor.length > 0, `${action.id} must declare an executor`);
			if (action.jobKind === "write") {
				assert.ok(action.permission, `${action.id} must declare permission metadata`);
				assert.equal(action.permission.requiresReadback, true);
			}
		}
	});

	test("marks destructive and code-replacement operations as non-auto-approvable", () => {
		for (const id of ["delete_component", "delete_method", "delete_folder"] as const) {
			const permission = getAscetEditAction(id)?.permission;
			assert.equal(permission?.destructive, true);
			assert.equal(permission?.autoApprovable, false);
		}
		for (const id of ["set_method_code", "set_module_code", "set_state_machine_code"] as const) {
			const permission = getAscetEditAction(id)?.permission;
			assert.equal(permission?.replacesExistingContent, true);
			assert.equal(permission?.autoApprovable, false);
		}
	});

	test("keeps editability check read-only and set medium-risk", () => {
		assert.equal(getAscetEditAction("check")?.jobKind, "read");
		assert.equal(getAscetEditAction("check")?.permission, undefined);
		assert.equal(getAscetEditAction("set")?.permission?.baseRisk, "medium");
	});

	test("resolves action metadata from either external discriminator", () => {
		assert.equal(getAscetEditAction("set_enumerators").executor, "setEnumerators");
		assert.equal(getAscetEditActionByDiscriminator("action", "set_enumerators")?.id, "set_enumerators");
		assert.equal(getAscetEditActionByDiscriminator("mode", "check")?.jobKind, "read");
		assert.equal(getAscetEditActionByDiscriminator("mode", "restore"), undefined);
	});
});

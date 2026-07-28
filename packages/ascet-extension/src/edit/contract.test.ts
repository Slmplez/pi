import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { getAscetEditAction, getAscetEditActionByDiscriminator, listAscetEditActions } from "./contract.ts";

const expectedActions = [
	["create_folder", "action", "create_folder", "AscetCreateFolder", "create_folder", "write", true],
	["create_component", "action", "create_component", "AscetCreateComponent", "create_component", "write", true],
	["create_method", "action", "create_method", "AscetCreateMethod", "create_method", "write", true],
	[
		"set_method_signature",
		"action",
		"set_method_signature",
		"AscetSetMethodSignature",
		"set_method_signature",
		"write",
		true,
	],
	["delete_component", "action", "delete_component", "AscetDeleteComponent", "delete_component", "write", true],
	["delete_method", "action", "delete_method", "AscetDeleteMethod", "delete_method", "write", true],
	["delete_folder", "action", "delete_folder", "AscetDeleteFolder", "delete_folder", "write", true],
	["set_method_code", "action", "set_method_code", "AscetSetMethodCode", "set_method_code", "write", true],
	["set_module_code", "action", "set_module_code", "AscetSetModuleCode", "set_module_code", "write", true],
	[
		"set_state_machine_code",
		"action",
		"set_state_machine_code",
		"AscetSetStateMachineCode",
		"set_state_machine_code",
		"write",
		true,
	],
	["set_enumerators", "action", "set_enumerators", "AscetSetEnumerators", "set_enumerators", "write", true],
	["apply_element_spec", "action", "apply_element_spec", "AscetApplyElementSpec", "apply_element_spec", "write", true],
	[
		"apply_project_formula",
		"action",
		"apply_project_formula",
		"AscetApplyProjectFormula",
		"apply_project_formula",
		"write",
		true,
	],
	[
		"set_element_dependency",
		"action",
		"set_element_dependency",
		"AscetSetElementDependency",
		"set_element_dependency",
		"write",
		true,
	],
	["check", "mode", "check", "AscetComponentEditableCheck", "component_editable_check", "read", false],
	["set", "mode", "set", "AscetComponentEditableSet", "component_editable_set", "write", true],
] as const;

describe("ASCET edit action contract", () => {
	test("defines the complete canonical action matrix", () => {
		const actions = listAscetEditActions();

		assert.equal(actions.length, 16);
		assert.equal(new Set(actions.map((action) => action.id)).size, 16);
		assert.deepEqual(
			actions.map((action) => [
				action.id,
				action.discriminator.field,
				action.discriminator.value,
				action.logicalCommandId,
				action.operation,
				action.jobKind,
				action.requiresApproval,
			]),
			expectedActions,
		);

		for (const action of actions) {
			assert.ok(action.executor.length > 0, `${action.id} must declare an executor`);
			assert.ok(action.schemaKey.length > 0, `${action.id} must declare a schema key`);
			assert.ok(action.promptKey.length > 0, `${action.id} must declare a prompt key`);
		}
	});

	test("resolves action metadata from either external discriminator", () => {
		assert.equal(getAscetEditAction("set_enumerators")?.logicalCommandId, "AscetSetEnumerators");
		assert.equal(getAscetEditActionByDiscriminator("action", "set_enumerators")?.operation, "set_enumerators");
		assert.equal(getAscetEditActionByDiscriminator("mode", "check")?.jobKind, "read");
		assert.equal(getAscetEditActionByDiscriminator("mode", "restore"), undefined);
	});
});

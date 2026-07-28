import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type AscetMutationParams, getAscetEditActionId, resolveAscetEditInvocation, runAscetEdit } from "./service.ts";

describe("ASCET edit service", () => {
	test("uses action or mode as the canonical edit action id", () => {
		assert.equal(
			getAscetEditActionId({ action: "set_enumerators", componentPath: "DEMO/E", enumerators: ["OFF"] }),
			"set_enumerators",
		);
		assert.equal(getAscetEditActionId({ mode: "check", componentPath: "DEMO/C" }), "check");
		assert.equal(
			getAscetEditActionId({
				action: "apply_element_spec",
				componentPath: "DEMO/C",
				specFile: "spec.json",
				mode: "restore",
			}),
			"apply_element_spec",
		);
		assert.deepEqual(resolveAscetEditInvocation({ mode: "check", componentPath: "DEMO/C" }), {
			kind: "editability",
			mode: "check",
		});
		assert.deepEqual(
			resolveAscetEditInvocation({
				action: "apply_project_formula",
				projectPath: "DEMO/P",
				specFile: "spec.json",
				mode: "restore",
			}),
			{ kind: "mutation", action: "apply_project_formula" },
		);
	});

	test("rejects unknown and ambiguous discriminators before dispatch", async () => {
		for (const params of [
			{ action: "not_a_real_edit" },
			{ action: "not_a_real_edit", mode: "check", executeWrite: true },
			{ action: undefined, mode: "check" },
			{ mode: "restore", componentPath: "DEMO/C" },
			{ action: "create_folder", mode: "check", folderPath: "DEMO/New" },
			{},
		]) {
			assert.equal(getAscetEditActionId(params), undefined);
			const result = await runAscetEdit(params, { cwd: process.cwd() }, {});
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message:
						"ascet_edit requires exactly one supported discriminator: action for a mutation, or mode=check/set for editability.",
				},
			});
		}
	});

	test("does not dispatch an invalid action even when mode is valid", async () => {
		let dispatches = 0;
		const result = await runAscetEdit(
			{ action: "not_a_real_edit", mode: "check", executeWrite: true },
			{
				cwd: process.cwd(),
				executeCli: async () => {
					dispatches += 1;
					throw new Error("Malformed edit parameters must not dispatch.");
				},
			},
			{},
		);
		assert.equal(result.details.outcome.status, "error");
		assert.equal(dispatches, 0);
	});

	test("recognizes every preserved mutation discriminator", () => {
		const actions: AscetMutationParams["action"][] = [
			"create_folder",
			"create_component",
			"create_method",
			"set_method_signature",
			"delete_component",
			"delete_method",
			"delete_folder",
			"set_method_code",
			"set_module_code",
			"set_state_machine_code",
			"set_enumerators",
			"apply_element_spec",
			"apply_project_formula",
			"set_element_dependency",
		];

		for (const action of actions) {
			assert.equal(getAscetEditActionId({ action } as AscetMutationParams), action);
		}
	});

	test("returns a guarded preflight outcome for every mutation action", async () => {
		const payloads: AscetMutationParams[] = [
			{ action: "create_folder", folderPath: "DEMO/New" },
			{ action: "create_component", componentPath: "DEMO/New/C", kind: "class" },
			{ action: "create_method", componentPath: "DEMO/C", methodName: "calc" },
			{ action: "set_method_signature", componentPath: "DEMO/C", methodName: "calc", returnType: "cont" },
			{ action: "delete_component", componentPath: "DEMO/C" },
			{ action: "delete_method", componentPath: "DEMO/C", methodName: "calc" },
			{ action: "delete_folder", folderPath: "DEMO/New" },
			{ action: "set_method_code", componentPath: "DEMO/C", methodName: "calc", code: "return;" },
			{ action: "set_module_code", modulePath: "DEMO/M", operation: "set-header", code: "" },
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/SM",
				operation: "set-method",
				methodName: "onTick",
				code: "return;",
			},
			{ action: "set_enumerators", componentPath: "DEMO/E", enumerators: ["OFF", "ON"] },
			{ action: "apply_element_spec", componentPath: "DEMO/C", specFile: "spec.json", mode: "restore" },
			{ action: "apply_project_formula", projectPath: "DEMO/P", specFile: "formula.json", mode: "restore" },
			{
				action: "set_element_dependency",
				targetPath: "DEMO/C",
				elementName: "K",
				dependency: "independent",
			},
		];

		for (const params of payloads) {
			const result = await runAscetEdit(params, { cwd: process.cwd() }, {});
			assert.equal(result.details.outcome.status, "preflight", params.action);
			assert.equal(result.details.outcome.plan.action, params.action);
		}
	});
});

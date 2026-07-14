import { describe, expect, it } from "vitest";
import { listAscetRoutes, routeAscetAction } from "../../ascet-extension/src/routing/router.ts";

const EXPECTED_ACTIONS = {
	ascet_explore: ["list_components", "list_diagrams", "inspect_target", "preview_children"],
	ascet_search: ["search_components", "resolve_component", "search_elements", "search_occurrences"],
	ascet_read: ["read", "read_code", "read_implementation", "read_block_diagram", "read_state_machine_flow"],
	ascet_reference: ["component_refs", "used_by", "element_refs"],
	ascet_diff: [
		"diff",
		"diff_method",
		"diff_component_snapshot",
		"diff_state_machine_domain",
		"diff_element_spec",
		"diff_project_formulas",
	],
	ascet_write: [
		"create_folder",
		"delete_folder",
		"create_component",
		"create_method",
		"delete_component",
		"delete_method",
		"set_method_code",
		"set_module_code",
		"set_state_machine_code",
		"apply_element_spec",
		"apply_project_formula",
	],
	ascet_batch_write: [
		"batch_set_method_code",
		"batch_set_element_spec",
		"batch_create_component",
		"batch_create_method",
		"batch_set_project_formula",
		"batch_delete_component",
		"batch_delete_method",
		"batch_create_folder",
		"batch_delete_folder",
	],
	ascet_verify: ["readback"],
} as const;

describe("ASCET Copilot-aligned routing", () => {
	it("covers the Copilot domain action matrix", () => {
		const routes = listAscetRoutes();

		for (const [toolName, actions] of Object.entries(EXPECTED_ACTIONS)) {
			expect(
				routes
					.filter((route) => route.toolName === toolName)
					.map((route) => route.action)
					.filter((action) => actions.includes(action as never)),
			).toEqual([...actions]);
		}
	});

	it("routes read_code through logical AscetReadCode and backend AscetReadTextCode", () => {
		expect(routeAscetAction({ toolName: "ascet_read", action: "read_code" })).toMatchObject({
			logicalCommandId: "AscetReadCode",
			backendCommandId: "AscetReadTextCode",
			operation: "read_code",
		});
	});

	it("routes generic diff by objectKind when the target kind is known", () => {
		expect(routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "class" })).toMatchObject({
			logicalCommandId: "AscetDiffClass",
			backendCommandId: "AscetDiffClass",
			operation: "diff_class",
		});
		expect(routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "module" })).toMatchObject({
			logicalCommandId: "AscetDiffModule",
			backendCommandId: "AscetDiffModule",
			operation: "diff_module",
		});
		expect(routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "statemachine" })).toMatchObject({
			logicalCommandId: "AscetDiffStateMachine",
			backendCommandId: "AscetDiffStateMachine",
			operation: "diff_state_machine",
		});
	});
});

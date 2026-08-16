import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listAscetActionContractsForTool } from "../tools/actions/contract-registry.ts";
import { resolveAscetBackendCommandId } from "./command-aliases.ts";
import { listAscetRoutes, listAscetRoutesForTool, routeAscetAction } from "./router.ts";

describe("ASCET contract-derived routes", () => {
	test("derives every Get route from the Get action contracts", () => {
		const contracts = listAscetActionContractsForTool("ascet_get");
		const routes = listAscetRoutesForTool("ascet_get");
		assert.deepEqual(
			routes.map(({ toolName, action, logicalCommandId, operation, category }) => ({
				toolName,
				action,
				logicalCommandId,
				operation,
				category,
			})),
			contracts.map((contract) => {
				assert.equal(contract.execution.kind, "bridge");
				if (contract.execution.kind !== "bridge") {
					throw new Error(`${contract.id} is not a Bridge action.`);
				}
				return {
					toolName: contract.tool,
					action: contract.action,
					logicalCommandId: contract.execution.logicalCommandId,
					operation: contract.execution.operation,
					category: "domain",
				};
			}),
		);
	});

	test("does not expose retired Get or dependency backend routes", () => {
		const ids = new Set(listAscetRoutes().map((route) => `${route.toolName}.${route.action}`));
		for (const id of [
			"ascet_get.database_identity",
			"ascet_get.database_catalog",
			"ascet_get.elements",
			"ascet_get.component_refs",
			"ascet_get.bde_edges",
			"ascet_get.import_binding",
			"ascet_get.dbitem_refs",
			"ascet_edit.set_element_dependency",
			"configure_parameter_dependency_chain.execute",
		]) {
			assert.equal(ids.has(id), false, id);
		}
	});

	test("routes generic diff actions through declarative object-kind variants", () => {
		assert.equal(routeAscetAction({ toolName: "ascet_diff", action: "diff" }).operation, "diff_component_snapshot");
		assert.equal(
			routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "class" }).operation,
			"diff_class",
		);
		assert.equal(
			routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "module" }).operation,
			"diff_module",
		);
		assert.equal(
			routeAscetAction({ toolName: "ascet_diff", action: "diff", objectKind: "statemachine" }).operation,
			"diff_state_machine",
		);
	});
	test("resolves the dependency-chain logical command to the existing backend command", () => {
		assert.equal(
			resolveAscetBackendCommandId("AscetCreateDependentChain"),
			"AscetConfigureParameterDependencyChainExecute",
		);
	});
});

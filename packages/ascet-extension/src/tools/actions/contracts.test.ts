import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { assertAscetActionResult } from "../../core/tool.ts";
import { listAscetRoutes } from "../../routing/router.ts";
import { ascetSearchParameters } from "../../search.ts";
import { ascetBatchWriteParameters } from "../batch-write/schema.ts";
import { ascetCapabilitiesParameters } from "../capabilities/schema.ts";
import { ascetDiffParameters } from "../diff/schema.ts";
import { ascetEditParameters } from "../edit/schema.ts";
import { ascetGetParameters } from "../get/schema.ts";
import { ascetReadParameters } from "../read/schema.ts";
import { ascetRecoverParameters } from "../recover/schema.ts";
import { ascetSchedulerStatusParameters } from "../scheduler-status/schema.ts";
import { ascetStatusParameters } from "../status/schema.ts";
import {
	getAscetActionContract,
	listAscetActionContracts,
	listAscetActionContractsForTool,
} from "./contract-registry.ts";
import { listActionDescriptors } from "./descriptors.ts";
import { listAscetPublicSchemaVariants } from "./schema-registry.ts";

const schemaByTool = {
	ascet_status: ascetStatusParameters,
	ascet_capabilities: ascetCapabilitiesParameters,
	ascet_recover: ascetRecoverParameters,
	ascet_scheduler_status: ascetSchedulerStatusParameters,
	ascet_search: ascetSearchParameters,
	ascet_get: ascetGetParameters,
	ascet_read: ascetReadParameters,
	ascet_diff: ascetDiffParameters,
	ascet_edit: ascetEditParameters,
	ascet_batch_write: ascetBatchWriteParameters,
} as const;

describe("ASCET action contracts", () => {
	test("defines the canonical Search action and separates action from mode", () => {
		const contract = getAscetActionContract("ascet_search", "search");
		assert.ok(contract);
		assert.equal(contract.id, "ascet_search.search");
		assert.equal(contract.selector, "action");
		assert.deepEqual(contract.execution, { kind: "native-search" });
		assert.equal(
			Value.Check(contract.parameters, { action: "search", mode: "element", q: "P_Threshold", limit: 20 }),
			true,
		);
		assert.equal(Value.Check(contract.parameters, { mode: "element", q: "P_Threshold" }), false);
		assert.equal(Value.Check(contract.parameters, { action: "element", mode: "element", q: "P_Threshold" }), false);
	});

	test("publishes only tree and formulas for Get", () => {
		const contracts = listAscetActionContractsForTool("ascet_get");
		assert.deepEqual(contracts.map((contract) => contract.action).sort(), ["formulas", "tree"]);
		assert.deepEqual(
			contracts.map((contract) => contract.execution),
			[
				{ kind: "bridge", logicalCommandId: "AscetGetTree", operation: "get_tree" },
				{ kind: "bridge", logicalCommandId: "AscetGetFormulas", operation: "get_formulas" },
			],
		);
	});

	test("validates canonical Search and Get result shapes", () => {
		const search = getAscetActionContract("ascet_search", "search");
		const tree = getAscetActionContract("ascet_get", "tree");
		assert.ok(search);
		assert.ok(tree);
		assert.equal(Value.Check(search.result, { count: 1, items: ["match"], more: true }), true);
		assert.equal(Value.Check(tree.result, { count: 1, items: [{ path: "D/P" }] }), true);
		assert.equal(Value.Check(tree.result, { count: 1, items: [], diagnostics: {} }), false);
	});

	test("accepts dependency-chain preview before readback verification", () => {
		const contract = getAscetActionContract("ascet_edit", "create_dependent_chain");
		assert.ok(contract);
		assert.equal(Value.Check(contract.result, { ok: true, changed: true, effects: [] }), true);
		assert.equal(Value.Check(contract.result, { ok: true, changed: true, verified: true }), true);
		assert.equal(Value.Check(contract.result, { ok: false, code: "element_conflict", target: "local" }), true);
		assert.equal(Value.Check(contract.result, { ok: false, code: "rolled_back" }), true);
	});

	test("validates normalized Agent content against the selected result Contract", () => {
		assert.doesNotThrow(() =>
			assertAscetActionResult("ascet_search", "search", {
				content: [{ type: "text", text: JSON.stringify({ count: 1, items: ["P"], more: true }) }],
			}),
		);
		assert.doesNotThrow(() =>
			assertAscetActionResult("ascet_status", "status", {
				content: [{ type: "text", text: "ASCET runtime is available." }],
			}),
		);
		assert.throws(
			() => assertAscetActionResult("ascet_search", "search", { content: [{ type: "text", text: "not JSON" }] }),
			/ascet_search\.search/,
		);
	});
	test("keeps Contract, descriptor, tool schema, route, and result sets bidirectionally consistent", () => {
		const contracts = listAscetActionContracts();
		assert.equal(new Set(contracts.map((contract) => contract.id)).size, contracts.length);
		assert.deepEqual(
			new Set(listActionDescriptors().map((descriptor) => descriptor.id)),
			new Set(contracts.map((contract) => contract.id)),
		);

		for (const [tool, schema] of Object.entries(schemaByTool)) {
			const toolContracts = contracts.filter((contract) => contract.tool === tool);
			const variants = listAscetPublicSchemaVariants(schema);
			for (const contract of toolContracts) {
				assert.equal(typeof contract.result, "object", `${contract.id}: result schema`);
				const selector = contract.selector;
				if (selector === "fixed") continue;
				assert.ok(
					variants.some((variant) => variant.discriminators[selector]?.includes(contract.action)),
					`${contract.id}: missing from tool schema`,
				);
			}
			for (const variant of variants) {
				const selector =
					(variant.discriminators.action?.length ?? 0) > 0
						? "action"
						: (variant.discriminators.mode?.length ?? 0) > 0
							? "mode"
							: "operation";
				for (const action of variant.discriminators[selector] ?? []) {
					assert.ok(
						toolContracts.some((contract) => contract.selector === selector && contract.action === action),
						`${tool}.${action}: schema variant has no Contract`,
					);
				}
			}
		}

		const routes = listAscetRoutes();
		for (const contract of contracts) {
			const contractRoutes = routes.filter(
				(route) => route.toolName === contract.tool && route.action === contract.action,
			);
			const execution = contract.execution;
			if (execution.kind === "native-search") {
				assert.equal(contractRoutes.length, 0, contract.id);
				continue;
			}
			assert.ok(
				contractRoutes.some(
					(route) =>
						route.logicalCommandId === execution.logicalCommandId && route.operation === execution.operation,
				),
				`${contract.id}: missing base route`,
			);
			if (execution.kind === "bridge") {
				for (const variant of execution.variants ?? []) {
					assert.ok(
						contractRoutes.some(
							(route) =>
								route.logicalCommandId === variant.logicalCommandId && route.operation === variant.operation,
						),
						`${contract.id}: missing conditional route`,
					);
				}
			}
		}
		for (const route of routes)
			assert.ok(getAscetActionContract(route.toolName, route.action), `${route.toolName}.${route.action}`);
	});
});

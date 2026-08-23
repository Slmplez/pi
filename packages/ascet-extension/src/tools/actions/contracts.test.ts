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

	test("validates read_code full and summary results without allowing field loss", () => {
		const contract = getAscetActionContract("ascet_read", "read_code");
		assert.ok(contract);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				detailLevel: "full",
				text: "out = in;",
				hash: "abc",
				lineCount: 1,
				byteCount: 9,
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				detailLevel: "full",
				hash: "abc",
				lineCount: 1,
				byteCount: 9,
			}),
			false,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				detailLevel: "summary",
				hash: "abc",
				lineCount: 1,
				byteCount: 9,
			}),
			true,
		);
	});

	test("validates state-machine summary, topology, and full results", () => {
		const contract = getAscetActionContract("ascet_read", "read_state_machine_flow");
		assert.ok(contract);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/SM",
				detailLevel: "topology",
				counts: { stateFlows: 1, transitionFlows: 0 },
				states: [{ name: "Idle", isStartState: true }],
				transitions: [],
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/SM",
				stateFlows: [{ stateName: "Idle" }],
				transitionFlows: [],
				dependencyChains: [],
				referenceTrace: [],
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/SM",
				stateFlows: [{ stateName: "Idle" }],
				dependencyChains: [],
				referenceTrace: [],
			}),
			false,
		);
	});

	test("validates implementation list and selected implementation results", () => {
		const contract = getAscetActionContract("ascet_read", "read_implementation");
		assert.ok(contract);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				kind: "Class",
				implementationSourceKind: "ImplementationConfiguration",
				implementations: [{ name: "Impl", isDefault: true, isClassImplementation: false }],
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				kind: "Class",
				implementationSourceKind: "ImplementationConfiguration",
				mode: "Default",
				resolvedImplementationName: "Impl",
				elements: [],
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				component: "DEMO/PID",
				kind: "Class",
				implementationSourceKind: "ImplementationConfiguration",
				mode: "Default",
				resolvedImplementationName: "Impl",
			}),
			false,
		);
	});

	test("validates read_element_dependency success and capability errors", () => {
		const contract = getAscetActionContract("ascet_read", "read_element_dependency");
		assert.ok(contract);
		assert.equal(
			Value.Check(contract.result, {
				target: "DEMO/Component",
				kind: "component",
				element: "P_Threshold",
				total: 1,
				items: [{ dependency: "dependent", formula: "P_Source" }],
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.result, {
				target: "DEMO/Component",
				kind: "component",
				element: "P_Threshold",
				total: 1,
			}),
			false,
		);
		assert.equal(
			Value.Check(contract.result, {
				error: {
					code: "project_component_enumeration_unavailable",
					message: "Project enumeration is unavailable.",
				},
			}),
			true,
		);
	});

	test("requires verified dependency-chain write results", () => {
		const contract = getAscetActionContract("ascet_edit", "create_dependent_chain");
		assert.ok(contract);
		const applied = {
			outcome: "succeeded",
			status: "ok",
			changed: true,
			mutationStatus: "applied",
			saveAttempted: true,
			saveSucceeded: true,
			saveState: "saved",
			verified: true,
			verificationStatus: "passed",
			verificationMode: "same_session_dependency_endpoints",
			sessionCount: 1,
			saveCount: 1,
			editableRetryCount: 0,
			nativeMutationAttemptCount: 1,
			permission: { mode: "default", decision: "ask" },
			preflight: { status: "not_run" },
			editability: { status: "not_applicable" },
			mutation: { status: "applied" },
			verification: { status: "passed" },
			bridge: { beforeBridge: true, bridgeEntered: true, backendResponseReceived: true },
			recovery: { required: false, actions: [] },
		};
		assert.equal(Value.Check(contract.result, applied), true);
		assert.equal(Value.Check(contract.result, { ...applied, verified: false }), false);
		assert.equal(
			Value.Check(contract.result, { error: { code: "element_conflict", message: "Element conflict." } }),
			false,
		);
	});

	test("keeps every public ascet_edit mutation apply-only", () => {
		const contracts = listAscetActionContractsForTool("ascet_edit").filter(
			(contract) => contract.action !== "check" && contract.action !== "set",
		);
		assert.equal(contracts.length, 15);
		for (const contract of contracts) {
			const example = contract.guidance?.fewShots?.[0]?.args;
			assert.ok(example, contract.action);
			assert.equal(Value.Check(contract.parameters, example), true, `${contract.action}: apply example`);
			assert.equal(
				Value.Check(contract.parameters, { ...example, intent: "preview" }),
				false,
				`${contract.action}: preview`,
			);
			assert.equal(
				Value.Check(contract.result, { error: { code: "write_rejected", message: "Rejected." } }),
				false,
				`${contract.action}: mutation errors require canonical evidence`,
			);
		}
	});

	test("requires the strict SCM envelope for mode=set failures", () => {
		const contract = getAscetActionContract("ascet_edit", "set");
		assert.ok(contract);
		assert.equal(Value.Check(contract.result, { error: { code: "write_rejected", message: "Rejected." } }), false);
		assert.equal(
			Value.Check(contract.result, {
				outcome: "failed",
				editable: null,
				beforeEditable: null,
				afterEditable: null,
				changed: false,
				mutationStatus: "not_started",
				saveAttempted: false,
				saveSucceeded: false,
				saveState: "not_applicable",
				verified: false,
				verificationStatus: "not_applicable",
				verificationMode: "same_session_scm_state",
				sessionCount: 0,
				saveCount: 0,
				nativeMutationAttemptCount: 0,
				nativeScmOperationCount: 0,
				nativeOperations: [],
				error: { code: "write_rejected", message: "Rejected." },
				recovery: { required: false, actions: [] },
			}),
			true,
		);
	});

	test("uses an operation-discriminated state-machine write schema", () => {
		const contract = getAscetActionContract("ascet_edit", "set_state_machine_code");
		assert.ok(contract);
		assert.equal(
			Value.Check(contract.parameters, {
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/StateMachine",
				operation: "set-start-state",
				stateName: "Idle",
				intent: "apply",
			}),
			true,
		);
		assert.equal(
			Value.Check(contract.parameters, {
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/StateMachine",
				operation: "set-start-state",
				stateName: "Idle",
				methodName: "irrelevant",
				intent: "apply",
			}),
			false,
		);
		assert.equal(
			Value.Check(contract.parameters, {
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/StateMachine",
				operation: "bind-transition-action-method",
				sourceState: "Idle",
				targetState: "Run",
				priority: 1.5,
				methodName: "onRun",
				intent: "apply",
			}),
			false,
		);
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

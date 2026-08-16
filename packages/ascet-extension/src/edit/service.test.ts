import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { AscetObservationStore } from "../observation-store.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { type AscetMutationParams, getAscetEditActionId, resolveAscetEditInvocation, runAscetEdit } from "./service.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function completeTreeExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				items: [
					{ path: "DEMO", oid: "F-1", kind: "folder" },
					{ path: "DEMO\\New", oid: "F-2", kind: "folder" },
					{ path: "DEMO\\C", oid: "C-2", kind: "module" },
					{ path: "DEMO\\M", oid: "M-1", kind: "module" },
					{ path: "DEMO\\SM", oid: "SM-1", kind: "statemachine" },
					{ path: "DEMO\\E", oid: "E-1", kind: "enumeration" },
					{ path: "DEMO\\P", oid: "P-1", kind: "project" },
					{ path: "Package\\Shared\\Controller", oid: "C-1", kind: "module" },
					{ path: "DEMO\\Project::Controller", oid: "C-1", kind: "module" },
				],
				coverage: {
					status: "complete_for_scope",
					completeness: "complete",
					collectorCompleted: true,
				},
				truncated: false,
				database: { name: "DB", path: "C:/Repo/DB" },
			},
			error: null,
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

function incompleteTreeExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				items: [],
				coverage: { status: "partial", completeness: "partial", collectorCompleted: false },
				truncated: false,
				database: { name: "DB", path: "C:/Repo/DB" },
			},
			error: null,
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

function directMutationExecution(request: AscetCliRequest): AscetCliExecutionResult {
	if (request.args[1] === "get_tree") return completeTreeExecution(request);
	const operation = request.args[1];
	const result =
		operation === "get_database_identity"
			? { database: { name: "DB", path: "C:/Repo/DB" } }
			: operation === "preflight_create_folder"
				? {
						folderPath: request.args[2],
						databasePath: "C:/Repo/DB",
						existing: ["DEMO"],
						willCreate: [request.args[2]],
						conflicts: [],
						capability: {
							status: "supported",
							methods: ["AddFolder(String)"],
							saveAvailable: true,
							readbackAvailable: true,
						},
						noOp: false,
					}
				: operation === "preflight_create_method"
					? {
							databasePath: "C:/Repo/DB",
							componentPath: request.args[2],
							componentOid: "C-1",
							componentKind: "StateMachine",
							languageKind: "ESDL",
							diagramName: "Main",
							diagramExists: true,
							diagramRuntimeType: "AscetDiagram",
							requiredMethod: "AddAction",
							requiredMethodAvailable: true,
							editable: true,
							readbackAvailable: true,
							noOp: false,
							capability: { status: "supported" },
						}
					: operation === "component_editable_check"
						? true
						: operation === "guarded_create_method"
							? {
									success: true,
									initiallyEditable: true,
									editabilityAcquired: false,
									primaryMutationStarted: true,
									mutationStatus: "applied",
									verificationStatus: "passed",
									method: { readbackVerified: true },
								}
							: { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

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
				elementIntent: "create",
				intent: "preview",
				elements: [],
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
			{ action: "not_a_real_edit", mode: "check", intent: "apply" },
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

	test("rejects model-supplied verifyReadback because executed writes verify automatically", async () => {
		let dispatches = 0;
		const result = await runAscetEdit(
			{
				action: "create_folder",
				folderPath: "DEMO/New",
				verifyReadback: false,
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				executeCli: async () => {
					dispatches += 1;
					throw new Error("Invalid public parameters must not dispatch.");
				},
			},
			approvingContext,
		);

		assert.equal(result.details.outcome.status, "error");
		if (result.details.outcome.status === "error") {
			assert.equal(result.details.outcome.error.code, "ascet_edit_invalid_parameter");
		}
		assert.equal(dispatches, 0);
	});

	test("does not dispatch an invalid action even when mode is valid", async () => {
		let dispatches = 0;
		const result = await runAscetEdit(
			{ action: "not_a_real_edit", mode: "check", intent: "apply" },
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
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-all-preflight-"));
		try {
			const payloads: AscetMutationParams[] = [
				{ action: "create_folder", intent: "preview", folderPath: "DEMO/New" },
				{ action: "create_component", intent: "preview", componentPath: "DEMO/New/C", kind: "class" },
				{
					action: "create_method",
					intent: "preview",
					componentPath: "DEMO/C",
					methodName: "calc",
					methodKind: "abstract",
				},
				{
					action: "set_method_signature",
					intent: "preview",
					componentPath: "DEMO/C",
					methodName: "calc",
					returnType: "cont",
				},
				{ action: "delete_component", intent: "preview", componentPath: "DEMO/C" },
				{ action: "delete_method", intent: "preview", componentPath: "DEMO/C", methodName: "calc" },
				{ action: "delete_folder", intent: "preview", folderPath: "DEMO/New" },
				{
					action: "set_method_code",
					intent: "preview",
					componentPath: "DEMO/C",
					methodName: "calc",
					code: "return;",
				},
				{ action: "set_module_code", intent: "preview", modulePath: "DEMO/M", operation: "set-header", code: "" },
				{
					action: "set_state_machine_code",
					intent: "preview",
					stateMachinePath: "DEMO/SM",
					operation: "set-method",
					methodName: "onTick",
					code: "return;",
				},
				{ action: "set_enumerators", intent: "preview", componentPath: "DEMO/E", enumerators: ["OFF", "ON"] },
				{
					action: "apply_project_formula",
					intent: "preview",
					projectPath: "DEMO/P",
					specFile: "formula.json",
					mode: "restore",
				},
				{
					action: "set_element_dependency",
					intent: "preview",
					targetPath: "DEMO/C",
					elementName: "K",
					dependency: "independent",
					variantPolicy: "default",
					valueRestoration: { policy: "explicit", valuesByVariant: { default: 0 } },
				},
			];

			for (const params of payloads) {
				const result = await runAscetEdit(
					params,
					{
						cwd: root,
						env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
						executeCli: async (request) => {
							if (request.args[1] === "get_tree") return completeTreeExecution(request);
							const operation = request.args[1];
							const backendResult =
								operation === "get_database_identity"
									? { database: { name: "DB", path: "C:/Repo/DB" } }
									: operation === "preflight_create_folder"
										? {
												folderPath: "DEMO\\New",
												existing: ["DEMO"],
												willCreate: ["DEMO\\New"],
												conflicts: [],
												capability: { status: "supported" },
												noOp: false,
											}
										: operation === "preflight_create_method"
											? {
													componentPath: "DEMO\\C",
													componentOid: "C-2",
													componentKind: "Class",
													languageKind: "ESDL",
													diagramName: "Main",
													diagramExists: true,
													diagramRuntimeType: "AscetDiagram",
													requiredMethod: "AddMethod",
													requiredMethodAvailable: true,
													editable: true,
													readbackAvailable: true,
													noOp: false,
													capability: { status: "supported" },
												}
											: operation === "component_editable_check"
												? true
												: operation === "set_element_dependency"
													? {
															validated: true,
															target: "DEMO/C",
															kind: "component",
															identity: { componentOID: "C-1", elementOID: "" },
															definitionHash: "definition-1",
														}
													: { validated: true };
							return {
								exitCode: 0,
								stdout: JSON.stringify({ ok: true, result: backendResult }),
								stderr: "",
								timedOut: false,
								request,
							};
						},
					},
					{},
				);
				assert.equal(result.details.outcome.status, "preflight", params.action);
				assert.equal(result.details.outcome.plan.action, params.action);
				assert.ok(result.details.mutationResult);
				assert.equal(result.details.mutationResult.preflight.status, "passed", params.action);
				assert.equal(result.details.mutationResult.mutation.status, "not_started", params.action);
				assert.equal(result.details.mutationResult.verification.status, "not_applicable", params.action);
				assert.equal(result.details.mutationResult.bridge.bridgeEntered, false, params.action);
				const renderedEnvelope = JSON.parse(result.content[0]?.text ?? "") as Record<string, unknown>;
				assert.equal(renderedEnvelope.status, result.details.mutationResult.status);
				assert.deepEqual(renderedEnvelope.mutation, result.details.mutationResult.mutation);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("rejects unknown apply_element_spec controls instead of forwarding them", async () => {
		for (const extra of ["dryRun", "backupDir"]) {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					specFile: "spec.json",
					[extra]: extra === "dryRun" ? true : "backups",
				},
				{ cwd: process.cwd() },
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message:
						"Invalid parameters for ascet_edit action 'apply_element_spec'. Unknown properties and values not accepted by the action contract are rejected.",
				},
			});
		}
	});

	test("rejects targetKind values not supported by the delegated TypeScript runner", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				intent: "preview",
				targetPath: "DEMO/C",
				elementName: "P",
				dependency: "independent",
				targetKind: "project",
			},
			{ cwd: process.cwd() },
			{},
		);
		assert.equal(result.details.outcome.status, "error");
		if (result.details.outcome.status === "error") {
			assert.equal(result.details.outcome.error.code, "ascet_edit_invalid_parameter");
		}
	});

	test("rejects conflicting targetPath and componentPath values", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				intent: "preview",
				targetPath: "DEMO/Provider",
				componentPath: "DEMO/Consumer",
				elementName: "P",
				dependency: "independent",
			},
			{ cwd: process.cwd() },
			{},
		);
		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "ascet_edit_conflicting_parameter",
				message:
					"set_element_dependency targetPath and componentPath must identify the same target when both are provided.",
			},
		});
	});

	test("blocks a new Element plan when Data and Implementation items cannot be resolved without mutation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-spec-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let diffSpec: unknown;
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "create",
					intent: "preview",
					elements: [
						{ role: "standardPrimitive", name: "K", kind: "parameter", modelType: "cont", scope: "local" },
					],
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						if (request.args[1] === "get_tree") return completeTreeExecution(request);
						calls.push(request.args);
						if (request.args[1] === "diff_element_spec") {
							diffSpec = JSON.parse(readFileSync(request.args[3]!, "utf8"));
						}
						const result =
							request.args[1] === "get_database_identity"
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: request.args[1] === "read_element_catalog"
									? { elements: [], identity: { componentOID: "C-1" } }
									: { changes: [] };
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "data_item_not_resolvable_preflight",
					message:
						"Element preflight could not prove Data/Implementation item resolution for: K (data_item_not_resolvable_preflight, implementation_item_not_resolvable_preflight).",
				},
			});
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog"],
			);
			assert.equal(diffSpec, undefined);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("allows a new primitive Element plan when component configurations are resolvable", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-create-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "create",
					intent: "preview",
					elements: [
						{ role: "standardPrimitive", name: "K", kind: "variable", modelType: "cont", scope: "local" },
					],
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						if (request.args[1] === "get_tree") return completeTreeExecution(request);
						calls.push(request.args);
						const backendResult =
							request.args[1] === "get_database_identity"
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: request.args[1] === "read_element_catalog"
									? {
											elements: [],
											identity: { componentOID: "C-1" },
											componentConfigurationProvenance: {
												defaultDataConfiguration: {
													source: "defaultDataConfiguration",
													configurationName: "DefaultData",
													selected: true,
												},
												defaultImplementationConfiguration: {
													source: "defaultImplementationConfiguration",
													configurationName: "DefaultImpl",
													selected: true,
												},
											},
										}
									: { changes: [{ name: "K", operation: "create" }] };
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: backendResult }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			if (result.details.outcome.status === "preflight") {
				const backend = result.details.outcome.plan.backendPreflight as Record<string, unknown>;
				const capabilities = backend.capabilities as {
					validated: boolean;
					elements: Array<Record<string, unknown>>;
				};
				assert.equal(capabilities.validated, true);
				assert.equal(capabilities.elements[0]?.capabilityStatus, "validated");
			}
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog", "diff_element_spec", "get_database_identity"],
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("blocks an existing Element plan when the selected Data item is unresolved", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-data-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "patch",
					intent: "preview",
					elements: [{ name: "P", comment: "Updated" }],
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						const backendResult = {
							elements: [
								{
									name: "P",
									kind: "parameter",
									modelType: "cont",
									scope: "local",
									configurationProvenance: {
										dataConfiguration: { source: "elementValue", configurationName: "", selected: true },
										implementationConfiguration: {
											source: "defaultImplementationConfiguration",
											configurationName: "DefaultImpl",
											selected: true,
										},
									},
								},
							],
							identity: { componentOID: "C-1", elementOIDs: { P: "E-1" } },
						};
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: backendResult }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "data_item_not_resolvable_preflight",
					message:
						"Element preflight could not prove Data/Implementation item resolution for: P (data_item_not_resolvable_preflight).",
				},
			});
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog"],
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("blocks an existing Element plan when the selected Implementation item is unresolved", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-implementation-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "patch",
					intent: "preview",
					elements: [{ name: "P", comment: "Updated" }],
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						const backendResult = {
							elements: [
								{
									name: "P",
									kind: "parameter",
									modelType: "cont",
									scope: "local",
									configurationProvenance: {
										dataConfiguration: {
											source: "defaultDataConfiguration",
											configurationName: "DefaultData",
											selected: true,
										},
										implementationConfiguration: {
											source: "elementImplementation",
											configurationName: "",
											selected: true,
										},
									},
								},
							],
							identity: { componentOID: "C-1", elementOIDs: { P: "E-1" } },
						};
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: backendResult }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "implementation_item_not_resolvable_preflight",
					message:
						"Element preflight could not prove Data/Implementation item resolution for: P (implementation_item_not_resolvable_preflight).",
				},
			});
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog"],
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("patch reads the live catalog, merges a full snapshot, and keeps specFile internal", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-patch-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let diffSpec: unknown;
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "patch",
					intent: "preview",
					elements: [{ name: "P", comment: "Updated" }],
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						if (request.args[1] === "get_tree") return completeTreeExecution(request);
						calls.push(request.args);
						if (request.args[1] === "diff_element_spec") {
							diffSpec = JSON.parse(readFileSync(request.args[3]!, "utf8"));
						}
						const result =
							request.args[1] === "get_database_identity"
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: request.args[1] === "read_element_catalog"
									? {
											elements: [
												{
													name: "P",
													kind: "parameter",
													modelType: "cont",
													scope: "local",
													data: { value: 1 },
													impl: { valueType: "sint16" },
													comment: "Old",
													configurationProvenance: {
														dataConfiguration: {
															source: "defaultDataConfiguration",
															configurationName: "DefaultData",
															selected: true,
														},
														implementationConfiguration: {
															source: "defaultImplementationConfiguration",
															configurationName: "DefaultImpl",
															selected: true,
														},
													},
												},
											],
											identity: { componentOID: "C-1", elementOIDs: { P: "E-1" } },
											provenance: {
												dataConfiguration: "DefaultData",
												implementationConfiguration: "DefaultImpl",
											},
										}
									: { changes: [{ name: "P", operation: "update" }] };
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			if (result.details.outcome.status === "preflight") {
				const backend = result.details.outcome.plan.backendPreflight as Record<string, unknown>;
				assert.deepEqual(backend.catalogIdentity, { componentOID: "C-1", elementOIDs: { P: "E-1" } });
				assert.equal(backend.operation, "authoritative_element_preflight");
				assert.equal(backend.validated, true);
				const capabilities = backend.capabilities as {
					validated: boolean;
					elements: Array<Record<string, unknown>>;
				};
				assert.equal(capabilities.validated, true);
				assert.deepEqual(capabilities.elements[0], {
					name: "P",
					operation: "patch",
					dataConfiguration: {
						source: "defaultDataConfiguration",
						configurationName: "DefaultData",
						selected: true,
					},
					implementationConfiguration: {
						source: "defaultImplementationConfiguration",
						configurationName: "DefaultImpl",
						selected: true,
					},
					dataItemResolvable: true,
					implementationItemResolvable: true,
					capabilityStatus: "validated",
					blockingCodes: [],
				});
				assert.equal(typeof backend.liveSnapshotHash, "string");
			}
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog", "diff_element_spec", "get_database_identity"],
			);
			const normalizedSpec = diffSpec as {
				elements: Array<Record<string, unknown>>;
			};
			assert.deepEqual(normalizedSpec.elements[0], {
				name: "P",
				kind: "parameter",
				modelType: "cont",
				scope: "local",
				data: { value: 1 },
				impl: { valueType: "sint16" },
				comment: "Updated",
			});
			assert.equal(JSON.stringify(result).includes("specFile"), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("uses the backend dependency dry-run during non-executing preflight", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-dependency-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					intent: "preview",
					targetPath: "DEMO/C",
					elementName: "P",
					dependency: "dependent",
					dependencyFormula: "P_Input",
					dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
					variantPolicy: "default",
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						if (request.args[1] === "get_tree") return completeTreeExecution(request);
						calls.push(request.args);
						const result =
							request.args[1] === "get_database_identity"
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: {
										dryRun: true,
										validated: true,
										target: "DEMO/C",
										kind: "component",
										identity: { componentOID: "C-1", elementOID: "" },
										definitionHash: "definition-1",
									};
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			assert.equal(calls[0]?.includes("--dry-run"), true);
			if (result.details.outcome.status === "preflight") {
				const plan = result.details.outcome.plan as { backendPreflight: { validated: boolean } };
				assert.equal(plan.backendPreflight.validated, true);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("normalizes autoExactName formals into exact backend mappings", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-auto-binding-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetBridge.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					intent: "preview",
					targetPath: "DEMO/C",
					elementName: "P",
					dependency: "dependent",
					dependencyFormula: "max(A,B) * 1e-3",
					dependencyFormals: ["A", "B"],
					bindingPolicy: "autoExactName",
					variantPolicy: "default",
				},
				{
					cwd: root,
					env: {
						ASCET_BRIDGE_PATH: cliPath,
						ASCET_CONTRACTS_PATH: contractsRoot,
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					},
					executeCli: async (request) => {
						if (request.args[1] === "get_tree") return completeTreeExecution(request);
						calls.push(request.args);
						const result =
							request.args[1] === "get_database_identity"
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: {
										dryRun: true,
										validated: true,
										target: "DEMO/C",
										kind: "component",
										identity: { componentOID: "C-1", elementOID: "" },
										definitionHash: "definition-1",
									};
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			assert.ok(calls[0]?.includes("A=A"));
			assert.ok(calls[0]?.includes("B=B"));
			assert.equal(
				calls[0]?.some((arg) => arg.includes("max=max") || arg.includes("e=e")),
				false,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("requires explicit dependency mappings for formulas", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				intent: "preview",
				targetPath: "DEMO/Controller",
				elementName: "P_Effective",
				dependency: "dependent",
				dependencyFormula: "max(A, B) * 1e-3",
			},
			{ cwd: process.cwd() },
			{},
		);

		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "dependency_mappings_required",
				message:
					"set_element_dependency dependencyFormula requires explicit dependencyMappings, or autoExactName with explicit dependencyFormals; formula token inference is disabled.",
			},
		});
	});

	test("does not issue secondary live reads when apply_element_spec readback is unverified", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-service-unverified-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let confirmationMessage = "";
		try {
			const options = {
				cwd: root,
				env: {
					ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
					ASCET_CONTRACTS_PATH: contractsRoot,
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					calls.push(request.args);
					if (request.args[1] === "get_tree") return completeTreeExecution(request);
					const result =
						request.args[1] === "get_database_identity"
							? { database: { name: "DB", path: "C:/Repo/DB" } }
							: request.args[1] === "component_editable_check"
								? true
								: request.args[1] === "read_element_catalog"
									? {
											elements: [
												{
													name: "K",
													kind: "parameter",
													modelType: "cont",
													scope: "local",
													configurationProvenance: {
														dataConfiguration: {
															source: "defaultDataConfiguration",
															configurationName: "DefaultData",
															selected: true,
														},
														implementationConfiguration: {
															source: "defaultImplementationConfiguration",
															configurationName: "DefaultImpl",
															selected: true,
														},
													},
												},
											],
											identity: { componentOID: "C-1", elementOIDs: { K: "E-1" } },
										}
									: request.args[1] === "diff_element_spec"
										? { changes: [] }
										: { ReadbackVerified: false, ElementResults: [{ name: "K", readbackVerified: false }] };
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result, error: null }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			};
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO\\Controller",
					elementIntent: "patch",
					intent: "apply",
					elements: [{ name: "K", comment: "Updated" }],
				},
				options,
				{
					hasUI: true,
					ui: {
						confirm: async (_title, message) => {
							confirmationMessage = message;
							return true;
						},
					},
				},
			);

			assert.match(confirmationMessage, /Target OID: C-1/u);
			assert.match(confirmationMessage, /Shared object: yes/u);
			assert.match(confirmationMessage, /Owner path: DEMO\\Controller/u);
			assert.match(confirmationMessage, /Affected projects: DEMO\\Project/u);
			const outcome = result.details.outcome;
			assert.equal(outcome.status, "partial");
			assert.deepEqual(
				calls.map((args) => args[1]),
				[
					"get_database_identity",
					"read_element_catalog",
					"diff_element_spec",
					"get_tree",
					"component_editable_check",
					"get_database_identity",
					"read_element_catalog",
					"diff_element_spec",
					"get_tree",
					"component_editable_check",
					"apply_element_spec",
				],
			);
			if (outcome.status === "partial") {
				const data = outcome.data as {
					verification: { status: string };
					observations: { invalidated: string[] };
				};
				assert.equal(data.verification.status, "missing");
				assert.deepEqual(data.observations, { invalidated: [] });
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("applies set_element_dependency in one public call without leaking internal dryRun", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-dependency-commit-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let planRecordExistedDuringApproval = false;
		try {
			const options = {
				cwd: root,
				env: {
					ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
					ASCET_CONTRACTS_PATH: contractsRoot,
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					calls.push(request.args);
					if (request.args[1] === "get_tree") return completeTreeExecution(request);
					const dryRun = request.args.includes("--dry-run");
					const result =
						request.args[1] === "get_database_identity"
							? { database: { name: "DB", path: "C:/Repo/DB" } }
							: request.args[1] === "component_editable_check"
								? true
								: dryRun
									? {
											dryRun: true,
											beforeDependency: "independent",
											beforeFormula: "",
											mappings: [],
											payload: {
												target: "DEMO/Controller",
												kind: "component",
												identity: { componentOID: "C-1", elementOID: "" },
												definitionHash: "definition-1",
											},
										}
									: { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result,
							error: null,
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			};
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					intent: "apply",
					targetPath: "DEMO\\Controller",
					elementName: "P_Local",
					dependency: "dependent",
					dependencyFormula: "P_Input",
					dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
					variantPolicy: "default",
				},
				options,
				{
					hasUI: true,
					ui: {
						confirm: async () => {
							planRecordExistedDuringApproval = existsSync(join(root, "artifacts", "plans"));
							return true;
						},
					},
				},
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(planRecordExistedDuringApproval, false);
			assert.ok(result.details.mutationResult);
			assert.deepEqual(result.details.mutationResult.permission, {
				mode: "default",
				decision: "ask",
				risk: "high",
				reason: result.details.mutationResult.permission.reason,
				rule: undefined,
			});
			assert.equal(result.details.mutationResult.preflight.status, "passed");
			assert.equal(result.details.mutationResult.editability.status, "editable");
			assert.equal(result.details.mutationResult.mutation.status, "applied");
			assert.equal(result.details.mutationResult.verification.status, "passed");
			assert.deepEqual(result.details.mutationResult.bridge, {
				beforeBridge: true,
				bridgeEntered: true,
				backendResponseReceived: true,
			});
			assert.ok(result.details.mutationResult.audit?.approvedAt);
			assert.ok(result.details.mutationResult.audit?.revalidatedAt);
			assert.ok(result.details.mutationResult.audit?.preflightFingerprint);
			assert.deepEqual(
				calls.map((args) => args[1]),
				[
					"get_database_identity",
					"set_element_dependency",
					"get_tree",
					"component_editable_check",
					"get_database_identity",
					"set_element_dependency",
					"get_tree",
					"component_editable_check",
					"set_element_dependency",
				],
			);
			assert.equal(calls[1]?.includes("--dry-run"), true);
			assert.equal(calls[5]?.includes("--dry-run"), true);
			assert.equal(calls[8]?.includes("--dry-run"), false);
			const telemetry = readFileSync(join(root, "artifacts", "telemetry", "element-write.jsonl"), "utf8")
				.trim()
				.split("\n")
				.map((line) => JSON.parse(line) as Record<string, unknown>);
			assert.deepEqual(
				telemetry.map((event) => ({
					phase: event.phase,
					bridgeEntered: event.bridgeEntered,
					backendResponseReceived: event.backendResponseReceived,
					mutationStatus: event.mutationStatus,
					mutationStarted: event.mutationStarted,
					writesPerformed: event.writesPerformed,
				})),
				[
					{
						phase: "commit",
						bridgeEntered: true,
						backendResponseReceived: true,
						mutationStatus: "applied",
						mutationStarted: true,
						writesPerformed: true,
					},
				],
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("routes set_method_code through one target-bound confirmation and approval receipt", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-method-coordinator-"));
		let confirmations = 0;
		let mutationDispatches = 0;
		let confirmationMessage = "";
		try {
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO\\Project::Controller",
					methodName: "calc",
					code: "result = 1;",
					intent: "apply",
				},
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
						if (request.args[1] === "set_method_code") mutationDispatches++;
						return directMutationExecution(request);
					},
				},
				{
					hasUI: true,
					ui: {
						confirm: async (_title, message) => {
							confirmations++;
							confirmationMessage = message;
							return true;
						},
					},
				},
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(confirmations, 1);
			assert.equal(mutationDispatches, 1);
			assert.match(confirmationMessage, /Risk: high/u);
			assert.match(confirmationMessage, /Target: DEMO\\Project::Controller/u);
			assert.match(confirmationMessage, /Shared object: yes/u);
			assert.match(confirmationMessage, /Affected projects: DEMO\\Project/u);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("retries transient incomplete Tree evidence before failing closed", async () => {
		let treeReads = 0;
		const treeTimeouts: Array<number | undefined> = [];
		const result = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\Project::Controller",
				methodName: "stateProbe",
				methodKind: "action",
				intent: "preview",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "get_tree") {
						treeReads++;
						treeTimeouts.push(request.timeoutMs);
						return treeReads === 1 ? incompleteTreeExecution(request) : completeTreeExecution(request);
					}
					return directMutationExecution(request);
				},
			},
			{},
		);
		assert.equal(result.details.outcome.status, "preflight", JSON.stringify(result.details.outcome));
		assert.equal(treeReads, 2);
		assert.deepEqual(treeTimeouts, [300_000, 300_000]);
	});

	test("blocks when current-database Tree evidence remains incomplete after retry", async () => {
		let treeReads = 0;
		const result = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\Project::Controller",
				methodName: "stateProbe",
				methodKind: "action",
				intent: "preview",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "get_tree") {
						treeReads++;
						return incompleteTreeExecution(request);
					}
					return directMutationExecution(request);
				},
			},
			{},
		);
		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "shared_object_impact_unknown",
				message: "Complete current-database Tree evidence is required before previewing create_method.",
			},
		});
		assert.equal(treeReads, 2);
	});

	test("anchors top-level folder creation to the current database identity", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-root-folder-"));
		let mutationDispatches = 0;
		try {
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "TOP_LEVEL_FIXTURE", intent: "apply" },
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request) => {
						if (request.args[1] === "create_folder") mutationDispatches++;
						return directMutationExecution(request);
					},
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(mutationDispatches, 1);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("returns create_method capability failure before approval or mutation", async () => {
		let confirmations = 0;
		let writes = 0;
		const result = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "PI_LIVE_TEST_20260812_EDITStateMachineUnderTest",
				methodName: "stateProbe",
				methodKind: "action",
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "preflight_create_method") {
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: {
									diagramName: "Main",
									diagramRuntimeType: "LegacyDiagram",
									capability: {
										status: "unsupported",
										failureCode: "create_method_capability_not_supported",
										failureMessage: "Diagram 'Main' does not support creating 'Action'.",
									},
								},
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					}
					writes++;
					return directMutationExecution(request);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);
		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "create_method_capability_not_supported",
				message: "Diagram 'Main' does not support creating 'Action'.",
			},
		});
		assert.equal(confirmations, 0);
		assert.equal(writes, 0);
	});

	test("auto-applies safe create_folder headlessly after authoritative revalidation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-folder-auto-"));
		let writes = 0;
		try {
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMOAuto", intent: "apply" },
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request) => {
						if (request.args[1] === "create_folder") writes++;
						return directMutationExecution(request);
					},
				},
				{ hasUI: false, ascetPermission: { mode: "auto", rules: [] } },
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(writes, 1);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("runs one approved compound create_method call for editability acquisition and mutation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-method-compound-"));
		let confirmations = 0;
		let guardedWrites = 0;
		let approvalMessage = "";
		try {
			const result = await runAscetEdit(
				{
					action: "create_method",
					componentPath: "DEMO\\Project::Controller",
					methodName: "stateProbe",
					methodKind: "action",
					intent: "apply",
				},
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request) => {
						if (request.args[1] === "preflight_create_method") {
							const base = directMutationExecution(request);
							return {
								...base,
								stdout: JSON.stringify({
									ok: true,
									result: {
										databasePath: "C:/Repo/DB",
										componentPath: "DEMO\\Project::Controller",
										componentOid: "C-1",
										componentKind: "StateMachine",
										languageKind: "ESDL",
										diagramName: "Main",
										diagramExists: true,
										diagramRuntimeType: "AscetDiagram",
										requiredMethod: "AddAction",
										requiredMethodAvailable: true,
										editable: false,
										readbackAvailable: true,
										noOp: false,
										plannedEffects: [
											{ kind: "create_method", target: "DEMO\\Project::Controller::stateProbe" },
										],
										capability: { status: "supported" },
									},
									error: null,
								}),
							};
						}
						if (request.args[1] === "guarded_create_method") {
							guardedWrites++;
							assert.equal(request.args.includes("--acquire-editability"), true);
						}
						return directMutationExecution(request);
					},
				},
				{
					hasUI: true,
					ascetPermission: { mode: "acceptEdits", rules: [] },
					ui: {
						confirm: async (_title, message) => {
							confirmations++;
							approvalMessage = message;
							return true;
						},
					},
				},
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(confirmations, 1);
			assert.equal(guardedWrites, 1);
			assert.match(approvalMessage, /Request component editability/u);
			assert.equal(approvalMessage.includes("create_method: DEMO\\Project::Controller::stateProbe"), true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("re-runs database, Tree, and impact evidence before execution and re-prompts on material scope change", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-direct-revalidation-"));
		const confirmationMessages: string[] = [];
		let treeReads = 0;
		let mutationDispatches = 0;
		try {
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO\\Controller",
					methodName: "calc",
					code: "return;",
					intent: "apply",
				},
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request) => {
						const operation = request.args[1];
						if (operation === "component_editable_check") return directMutationExecution(request);
						if (operation === "get_database_identity") return directMutationExecution(request);
						if (operation === "get_tree") {
							treeReads++;
							const items = [{ path: "DEMO\\Controller", oid: "C-1", kind: "module" }];
							if (treeReads > 1) {
								items.push({ path: "DEMO\\Project::Controller", oid: "C-1", kind: "module" });
							}
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										items,
										coverage: {
											status: "complete_for_scope",
											completeness: "complete",
											collectorCompleted: true,
										},
										truncated: false,
										database: { name: "DB", path: "C:/Repo/DB" },
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						if (operation === "set_method_code") mutationDispatches++;
						return directMutationExecution(request);
					},
				},
				{
					hasUI: true,
					ascetPermission: { mode: "default", rules: [] },
					ui: {
						confirm: async (_title, message) => {
							confirmationMessages.push(message);
							return true;
						},
					},
				},
			);

			assert.equal(result.details.outcome.status, "ok");
			assert.equal(treeReads, 3);
			assert.equal(mutationDispatches, 1);
			assert.equal(confirmationMessages.length, 2);
			for (const message of confirmationMessages) {
				assert.equal(
					message,
					"Target: DEMO\\Controller\n\nChanges:\n- set_method_code: DEMO\\Controller\n\nVerification: Automatic readback",
				);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("quarantines an unknown direct method write and blocks a Package alias without confirmation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-method-quarantine-"));
		let confirmations = 0;
		let mutationDispatches = 0;
		const options = {
			cwd: root,
			env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
			executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
				if (
					request.args[1] === "get_tree" ||
					request.args[1] === "get_database_identity" ||
					request.args[1] === "component_editable_check"
				) {
					return directMutationExecution(request);
				}
				if (request.args[1] === "set_method_code") mutationDispatches++;
				return {
					exitCode: 1,
					stdout: JSON.stringify({
						ok: false,
						result: null,
						error: { code: "write_outcome_unknown", message: "unknown method write" },
					}),
					stderr: "",
					timedOut: false,
					request,
				};
			},
		};
		const context: AscetEditApprovalContext = {
			hasUI: true,
			ui: {
				confirm: async () => {
					confirmations++;
					return true;
				},
			},
		};
		try {
			const first = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "DEMO\\Project::Controller",
					methodName: "calc",
					code: "result = 1;",
					intent: "apply",
				},
				options,
				context,
			);
			assert.equal(first.details.outcome.status, "partial");

			const second = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "Package\\Shared\\Controller",
					methodName: "calc",
					code: "result = 2;",
					intent: "apply",
				},
				options,
				context,
			);
			assert.equal(second.details.outcome.status, "blocked");
			if (second.details.outcome.status === "blocked") {
				assert.equal(second.details.outcome.code, "mutation_target_quarantined");
			}
			assert.equal(confirmations, 1);
			assert.equal(mutationDispatches, 1);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("records Bridge-prevented approval failures as not_started", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-telemetry-blocked-"));
		try {
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					executeCli: async (request: AscetCliRequest) => directMutationExecution(request),
				},
				{},
			);
			assert.equal(result.details.outcome.status, "blocked");
			const telemetry = readFileSync(join(root, "artifacts", "telemetry", "element-write.jsonl"), "utf8")
				.trim()
				.split("\n")
				.map((line) => JSON.parse(line) as Record<string, unknown>);
			assert.equal(telemetry.length, 1);
			assert.deepEqual(
				{
					outcome: telemetry[0]?.outcome,
					mutationStatus: telemetry[0]?.mutationStatus,
					bridgeEntered: telemetry[0]?.bridgeEntered,
					mutationStarted: telemetry[0]?.mutationStarted,
					writesPerformed: telemetry[0]?.writesPerformed,
					cleanupRequired: telemetry[0]?.cleanupRequired,
				},
				{
					outcome: "blocked",
					mutationStatus: "not_started",
					bridgeEntered: false,
					mutationStarted: false,
					writesPerformed: false,
					cleanupRequired: false,
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("records outcome_unknown telemetry when an unexpected exception escapes after Bridge response", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-telemetry-error-"));
		const artifactRoot = join(root, "artifacts");
		try {
			const store = new AscetObservationStore({ root: artifactRoot, thresholdBytes: 1 });
			const stored = store.create({
				domain: "tree",
				target: { targetPathPrefix: "DEMO\\New" },
				sourceIdentity: {},
				items: [{ path: "DEMO\\New" }],
				coverage: { status: "complete_for_scope" },
				delivery: "stored",
			});
			assert.equal(stored.delivery, "stored");
			rmSync(stored.observation.dataPath);
			mkdirSync(stored.observation.dataPath);

			await assert.rejects(
				runAscetEdit(
					{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
					{
						cwd: root,
						env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot },
						executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> =>
							directMutationExecution(request),
					},
					approvingContext,
				),
			);
			const telemetry = readFileSync(join(artifactRoot, "telemetry", "element-write.jsonl"), "utf8")
				.trim()
				.split("\n")
				.map((line) => JSON.parse(line) as Record<string, unknown>);
			assert.equal(telemetry.length, 1);
			assert.deepEqual(
				{
					outcome: telemetry[0]?.outcome,
					mutationStatus: telemetry[0]?.mutationStatus,
					bridgeEntered: telemetry[0]?.bridgeEntered,
					backendResponseReceived: telemetry[0]?.backendResponseReceived,
					mutationStarted: telemetry[0]?.mutationStarted,
					cleanupRequired: telemetry[0]?.cleanupRequired,
				},
				{
					outcome: "outcome_unknown",
					mutationStatus: "unknown",
					bridgeEntered: true,
					backendResponseReceived: true,
					mutationStarted: true,
					cleanupRequired: true,
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("records runtime telemetry for a regular approved write", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-telemetry-"));
		try {
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
				{
					cwd: root,
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUN_ID: "run-1",
						PI_ASCET_PHASE_ID: "write-1",
						PI_ASCET_CASE_ID: "W-CREATE-FOLDER",
						PI_ASCET_ATTEMPT_ID: "attempt-1",
						PI_ASCET_WRITE_CLASS: "isolated_fixture",
					},
					executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> =>
						directMutationExecution(request),
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok");
			const telemetry = readFileSync(join(root, "artifacts", "telemetry", "element-write.jsonl"), "utf8")
				.trim()
				.split("\n")
				.map((line) => JSON.parse(line) as Record<string, unknown>);
			assert.equal(telemetry.length, 1);
			assert.deepEqual(
				{
					version: telemetry[0]?.version,
					operation: telemetry[0]?.operation,
					phase: telemetry[0]?.phase,
					writeClass: telemetry[0]?.writeClass,
					bridgeEntered: telemetry[0]?.bridgeEntered,
					backendResponseReceived: telemetry[0]?.backendResponseReceived,
					mutationStarted: telemetry[0]?.mutationStarted,
					writesPerformed: telemetry[0]?.writesPerformed,
				},
				{
					version: 2,
					operation: "create_folder",
					phase: "execute",
					writeClass: "isolated_fixture",
					bridgeEntered: true,
					backendResponseReceived: true,
					mutationStarted: true,
					writesPerformed: true,
				},
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

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

function canonicalMutationResult(overrides: Record<string, unknown> = {}): Record<string, unknown> {
	return {
		outcome: "succeeded",
		changed: true,
		mutationStatus: "applied",
		saveAttempted: true,
		saveSucceeded: true,
		saveState: "saved",
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_target_resolvable",
		sessionCount: 1,
		saveCount: 1,
		editableRetryCount: 0,
		nativeMutationAttemptCount: 1,
		initiallyEditable: true,
		finalEditable: true,
		...overrides,
	};
}
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
							? canonicalMutationResult({
									success: true,
									initiallyEditable: true,
									editabilityAcquired: false,
									primaryMutationStarted: true,
									method: { readbackVerified: true },
								})
							: canonicalMutationResult({
									writeSucceeded: true,
									verifyReadbackRequested: true,
									readbackVerified: true,
								});
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

	test("rejects preview, missing, and unknown intent for every mutation action before Bridge dispatch", async () => {
		const payloads: Array<Record<string, unknown>> = [
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
			{ action: "set_method_code", intent: "preview", componentPath: "DEMO/C", methodName: "calc", code: "return;" },
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
				action: "apply_element_spec",
				intent: "preview",
				componentPath: "DEMO/C",
				elementIntent: "patch",
				elements: [{ role: "standardPrimitive", name: "P" }],
			},
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
			for (const intent of ["preview", undefined, "unknown"] as const) {
				let bridgeCalls = 0;
				const result = await runAscetEdit(
					{ ...params, intent },
					{
						cwd: process.cwd(),
						executeCli: async (request) => {
							bridgeCalls += 1;
							return {
								exitCode: 0,
								stdout: JSON.stringify({ ok: true, result: { ok: true }, error: null }),
								stderr: "",
								timedOut: false,
								request,
							};
						},
					},
					{},
				);
				assert.equal(result.details.outcome.status, "error", String((params as { action: string }).action));
				assert.equal(result.details.error?.code, "ascet_edit_invalid_parameter");
				assert.equal(result.details.mutationResult?.mutationStatus, "not_started");
				assert.equal(bridgeCalls, 0);
			}
		}
	});

	test("rejects unknown apply_element_spec controls instead of forwarding them", async () => {
		for (const extra of ["dryRun", "backupDir"]) {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					elementIntent: "patch",
					elements: [{ role: "standardPrimitive", name: "P" }],
					intent: "apply",
					[extra]: extra === "dryRun" ? true : "backups",
				},
				{ cwd: process.cwd() },
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: { code: "ascet_edit_invalid_parameter", message: "Invalid parameters for ascet_edit action." },
			});
		}
	});

	test("rejects targetKind values not supported by the delegated TypeScript runner", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				intent: "apply",
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
				intent: "apply",
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

			assert.match(confirmationMessage, /Target: DEMO\\Controller/u);
			const outcome = result.details.outcome;
			assert.equal(outcome.status, "partial");
			assert.deepEqual(
				calls.map((args) => args[1]),
				["apply_element_spec"],
			);
			if (outcome.status === "partial") {
				const data = outcome.data as {
					verification: { status: string };
					observations: { invalidated: string[] };
				};
				assert.equal(data.verification.status, "unknown");
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
									: canonicalMutationResult({
											writeSucceeded: true,
											verifyReadbackRequested: true,
											readbackVerified: true,
										});
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
				risk: "medium",
				reason: result.details.mutationResult.permission.reason,
				rule: undefined,
				path: "DEMO\\Controller",
				databaseFingerprintKnown: false,
				databaseFingerprintSource: "unavailable",
				evidenceComplete: true,
				targetCount: 1,
				variantCount: 1,
				impactUnknown: false,
			});
			assert.equal(result.details.mutationResult.preflight.status, "not_run");
			assert.equal(result.details.mutationResult.editability.status, "editable");
			assert.equal(result.details.mutationResult.mutation.status, "applied");
			assert.equal(result.details.mutationResult.verification.status, "passed");
			assert.deepEqual(result.details.mutationResult.bridge, {
				beforeBridge: true,
				bridgeEntered: true,
				backendResponseReceived: true,
			});
			assert.deepEqual(
				calls.map((args) => args[1]),
				["set_element_dependency"],
			);
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
						phase: "execute",
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
					ascetPermission: {
						mode: "default",
						rules: [],
						databaseFingerprint: "database-fingerprint",
						databaseFingerprintSource: "session",
					},
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
			assert.match(confirmationMessage, /Target: DEMO\\Project::Controller/u);
			assert.equal(result.details.mutationResult?.permission.path, "DEMO\\Project::Controller");
			assert.equal(result.details.mutationResult?.permission.databaseFingerprintKnown, true);
			assert.equal(result.details.mutationResult?.permission.databaseFingerprintSource, "session");
			assert.equal(result.details.mutationResult?.audit?.databaseFingerprint, "database-fingerprint");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("reports repeated unknown direct writes without hidden alias discovery", async () => {
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
			assert.equal(second.details.outcome.status, "partial");
			assert.equal(confirmations, 2);
			assert.equal(mutationDispatches, 2);
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

	test("returns a structured failure when post-processing throws after a verified Bridge response", async () => {
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

			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot },
					executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> =>
						directMutationExecution(request),
				},
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "error");
			assert.equal(result.details.error?.code, "ascet_edit_post_processing_failed");
			assert.equal(result.details.mutationResult?.mutationStatus, "applied");
			assert.equal(result.details.mutationResult?.saveState, "saved");
			assert.equal(result.details.mutationResult?.verificationStatus, "passed");
			assert.equal(result.details.mutationResult?.recovery.required, false);
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
					outcome: "error",
					mutationStatus: "applied",
					bridgeEntered: true,
					backendResponseReceived: true,
					mutationStarted: true,
					cleanupRequired: false,
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

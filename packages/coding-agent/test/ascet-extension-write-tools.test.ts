import { existsSync } from "node:fs";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { ToolCall } from "../../ai/src/types.ts";
import { validateToolArguments } from "../../ai/src/utils/validation.ts";
import { buildApplyElementSpecArgs } from "../../ascet-extension/src/apply-element-spec.ts";
import { buildApplyProjectFormulaArgs } from "../../ascet-extension/src/apply-project-formula.ts";
import {
	buildBatchWriteArgs,
	createBatchWriteOutcome,
	createBatchWriteSummary,
	formatBatchWriteResult,
	runApprovedAscetBatchWrite,
} from "../../ascet-extension/src/batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../ascet-extension/src/cli.ts";
import { withInlineCodeFile } from "../../ascet-extension/src/core/temp-files.ts";
import {
	buildCreateComponentArgs,
	runApprovedAscetCreateComponent,
} from "../../ascet-extension/src/create-component.ts";
import { buildCreateFolderArgs, runApprovedAscetCreateFolder } from "../../ascet-extension/src/create-folder.ts";
import { buildCreateMethodArgs, runApprovedAscetCreateMethod } from "../../ascet-extension/src/create-method.ts";
import { buildDeleteComponentArgs } from "../../ascet-extension/src/delete-component.ts";
import { buildDeleteFolderArgs } from "../../ascet-extension/src/delete-folder.ts";
import { buildDeleteMethodArgs } from "../../ascet-extension/src/delete-method.ts";
import { requestAscetEditApproval } from "../../ascet-extension/src/edit/approval.ts";
import { runAscetEdit } from "../../ascet-extension/src/edit/service.ts";
import {
	buildSetElementDependencyArgs,
	runApprovedAscetSetElementDependency,
} from "../../ascet-extension/src/set-element-dependency.ts";
import { buildSetMethodCodeArgs, runApprovedAscetSetMethodCode } from "../../ascet-extension/src/set-method-code.ts";
import {
	buildSetMethodSignatureArgs,
	createMethodSignatureSpec,
	runApprovedAscetSetMethodSignature,
} from "../../ascet-extension/src/set-method-signature.ts";
import { buildSetModuleCodeArgs } from "../../ascet-extension/src/set-module-code.ts";
import { buildSetStateMachineCodeArgs } from "../../ascet-extension/src/set-state-machine-code.ts";
import { ascetBatchWriteTool } from "../../ascet-extension/src/tools/batch-write/index.ts";
import { ascetBatchWriteParameters } from "../../ascet-extension/src/tools/batch-write/schema.ts";
import { ascetEditTool } from "../../ascet-extension/src/tools/edit/index.ts";
import { ascetEditPrompt } from "../../ascet-extension/src/tools/edit/prompt.ts";
import { ascetEditParameters } from "../../ascet-extension/src/tools/edit/schema.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

function jsonExecutionResult(request: AscetCliRequest, result: unknown, exitCode = 0): AscetCliExecutionResult {
	return {
		exitCode,
		stdout: JSON.stringify({ ok: exitCode === 0, result, error: exitCode === 0 ? null : { code: "batch_partial" } }),
		stderr: "",
		timedOut: false,
		request,
	};
}

async function completeDirectMutationExecution(
	request: AscetCliRequest,
	mutationResult: unknown = { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true },
): Promise<AscetCliExecutionResult> {
	const operation = request.args[1];
	if (operation === "get_database_identity") {
		return jsonExecutionResult(request, { database: { name: "DB", path: "C:/Repo/DB" } });
	}
	if (operation === "get_tree") {
		return jsonExecutionResult(request, {
			items: [
				{ path: "DEMO", oid: "F-DEMO", kind: "folder" },
				{ path: "DEMO\\PID", oid: "C-PID", kind: "class" },
				{ path: "DEMO\\Enums\\EngineStallStatus", oid: "C-ENUM", kind: "enumeration" },
				{ path: "DEMO\\PiSmoke", oid: "C-SMOKE", kind: "class" },
				{ path: "DEMO\\Module", oid: "C-MODULE", kind: "module" },
				{ path: "DEMO\\SM", oid: "C-SM", kind: "statemachine" },
			],
			coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
			truncated: false,
			database: { name: "DB", path: "C:/Repo/DB" },
		});
	}
	if (operation === "preflight_create_folder") {
		return jsonExecutionResult(request, {
			folderPath: request.args[2],
			databasePath: "C:/Repo/DB",
			existing: ["DEMO"],
			willCreate: [request.args[2]],
			conflicts: [],
			capability: { status: "supported", saveAvailable: true, readbackAvailable: true },
			noOp: false,
		});
	}
	if (operation === "preflight_create_method") {
		return jsonExecutionResult(request, {
			databasePath: "C:/Repo/DB",
			componentPath: request.args[2],
			componentOid: "C-PID",
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
		});
	}
	if (operation === "component_editable_check") return jsonExecutionResult(request, true);
	if (operation === "set_element_dependency" && request.args.includes("--dry-run")) {
		return jsonExecutionResult(request, {
			dryRun: true,
			beforeDependency: "independent",
			beforeFormula: "",
			mappings: [],
			payload: {
				target: request.args[2],
				kind: "component",
				identity: { componentOID: "C-PID", elementOID: "" },
				definitionHash: "definition-1",
			},
		});
	}
	if (operation === "guarded_create_method") {
		return jsonExecutionResult(request, {
			success: true,
			initiallyEditable: true,
			editabilityAcquired: false,
			primaryMutationStarted: true,
			mutationStatus: "applied",
			verificationStatus: "passed",
			method: { readbackVerified: true },
		});
	}
	return jsonExecutionResult(request, mutationResult);
}

async function batchWriteExecution(
	request: AscetCliRequest,
	batchResult: unknown = { results: [{ id: "req-1", ok: true }] },
	batchExitCode = 0,
): Promise<AscetCliExecutionResult> {
	if (request.args[1] === "get_database_identity") {
		return jsonExecutionResult(request, { database: { name: "DB", path: "C:/Repo/DB" } });
	}
	if (request.args[1] === "get_tree") {
		return jsonExecutionResult(request, {
			items: [
				{ path: "DEMO", oid: "F-DEMO", kind: "folder" },
				{ path: "DEMO\\BatchClass", oid: "C-BATCH-CLASS", kind: "class" },
				{ path: "DEMO\\BatchModule", oid: "C-BATCH-MODULE", kind: "module" },
				{ path: "DEMO\\BatchState", oid: "C-BATCH-STATE", kind: "statemachine" },
			],
			coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
			truncated: false,
			database: { name: "DB", path: "C:/Repo/DB" },
		});
	}
	if (request.args[1] === "component_editable_check") return jsonExecutionResult(request, true);
	return jsonExecutionResult(request, batchResult, batchExitCode);
}

describe("ASCET guarded write PI tools", () => {
	it("builds JSON structural write invocations with readback verification", () => {
		expect(buildCreateFolderArgs({ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true })).toEqual([
			"exec",
			"create_folder",
			"DEMO\\__pi_write_smoke__",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildCreateComponentArgs({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				kind: "class",
				language: "ESDL",
				ifExists: "return-existing",
				verifyReadback: true,
				rollbackOnFailure: true,
			}),
		).toEqual([
			"exec",
			"create_component",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"--kind",
			"class",
			"--language",
			"ESDL",
			"--if-exists",
			"return-existing",
			"--verify-readback",
			"--rollback-on-failure",
			"--json",
		]);
		expect(
			buildCreateMethodArgs({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				methodKind: "abstract",
				ifExists: "return-existing",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"create_method",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"calc",
			"--method-kind",
			"abstract",
			"--if-exists",
			"return-existing",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildSetMethodSignatureArgs({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				returnType: "cont",
				ifReturnExists: "replace",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"set_method_signature",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"calc",
			"--return-type",
			"cont",
			"--if-return-exists",
			"replace",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildSetMethodSignatureArgs(
				{
					componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
					methodName: "calc",
					arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
					verifyReadback: true,
				},
				"E:\\tmp\\signature.json",
			),
		).toEqual([
			"exec",
			"set_method_signature",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"calc",
			"--signature-json",
			"E:\\tmp\\signature.json",
			"--verify-readback",
			"--json",
		]);
		expect(
			createMethodSignatureSpec({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				returnType: "log",
				ifReturnExists: "replace",
				arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
			}),
		).toEqual({
			returnType: "log",
			ifReturnExists: "replace",
			arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
		});
	});

	it("builds JSON delete, generic set-code, and apply-spec write invocations", () => {
		expect(
			buildDeleteComponentArgs({ componentPath: "DEMO/PID", ifMissing: "ignore", verifyReadback: true }),
		).toEqual(["exec", "delete_component", "DEMO\\PID", "--if-missing", "ignore", "--verify-readback", "--json"]);
		expect(
			buildDeleteMethodArgs({
				componentPath: "DEMO/PID",
				methodName: "calc",
				ifMissing: "ignore",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"delete_method",
			"DEMO\\PID",
			"calc",
			"--if-missing",
			"ignore",
			"--verify-readback",
			"--json",
		]);
		expect(buildDeleteFolderArgs({ folderPath: "DEMO/tmp", ifMissing: "ignore", verifyReadback: true })).toEqual([
			"exec",
			"delete_folder",
			"DEMO\\tmp",
			"--if-missing",
			"ignore",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildSetMethodCodeArgs({
				componentPath: "DEMO/PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
			}),
		).toEqual(["exec", "set_method_code", "DEMO\\PID", "calc", "E:\\tmp\\calc.c", "--verify-readback", "--json"]);
		expect(
			buildSetModuleCodeArgs({
				modulePath: "DEMO/Module",
				operation: "set-method",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"set_module_code",
			"DEMO\\Module",
			"set-method",
			"calc",
			"E:\\tmp\\calc.c",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildSetStateMachineCodeArgs({
				stateMachinePath: "DEMO/SM",
				operation: "set-transition-action-esdl",
				stateName: "Run",
				sourceState: "Idle",
				targetState: "Run",
				priority: 1,
				methodName: "act",
				codeFile: "E:\\tmp\\act.esdl",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"set_state_machine_code",
			"DEMO\\SM",
			"set-transition-action-esdl",
			"Run",
			"Idle",
			"Run",
			"1",
			"act",
			"E:\\tmp\\act.esdl",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildApplyElementSpecArgs({
				componentPath: "DEMO/PID",
				specFile: "E:\\tmp\\element-spec.json",
				projectPath: "DEMO/Project",
				mode: "restore",
				deleteMissing: true,
				recreateIncompatible: true,
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"apply_element_spec",
			"DEMO\\PID",
			"E:\\tmp\\element-spec.json",
			"--project-path",
			"DEMO\\Project",
			"--mode",
			"restore",
			"--delete-missing",
			"--recreate-incompatible",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildApplyProjectFormulaArgs({
				projectPath: "DEMO/Project",
				specFile: "E:\\tmp\\formula-spec.json",
				mode: "restore",
				deleteMissing: true,
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"apply_project_formula",
			"DEMO\\Project",
			"E:\\tmp\\formula-spec.json",
			"--mode",
			"restore",
			"--delete-missing",
			"--verify-readback",
			"--json",
		]);
	});

	it("builds JSON set_element_dependency invocation with readback verification", () => {
		expect(
			buildSetElementDependencyArgs({
				targetPath: "DEMO/DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				dependencyFormula: "K_Factor",
				dependencyMappings: { K_Factor: "K_Factor" },
				targetKind: "component",
				match: "exact",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"set_element_dependency",
			"DEMO\\DiscreteRiccatiSolver",
			"B01",
			"dependent",
			"--formula",
			"K_Factor",
			"--mapping",
			"K_Factor=K_Factor",
			"--target-kind",
			"component",
			"--match",
			"exact",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildSetElementDependencyArgs({
				targetPath: "DEMO/Folder",
				elementName: "B01",
				dependency: "independent",
				targetKind: "folder",
				match: "all",
				dryRun: true,
				backupDir: "E:\\tmp\\dependency-backup",
			}),
		).toEqual([
			"exec",
			"set_element_dependency",
			"DEMO\\Folder",
			"B01",
			"independent",
			"--clear-formula",
			"--target-kind",
			"folder",
			"--match",
			"all",
			"--dry-run",
			"--backup-dir",
			"E:\\tmp\\dependency-backup",
			"--json",
		]);
	});

	it("guards set_element_dependency with preflight, confirmation, and folder match-all validation", async () => {
		const preflight = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const invalidFolder = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO\\Folder",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "folder",
				match: "exact",
				intent: "apply",
			},
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const rejected = await runApprovedAscetSetElementDependency(
			{
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "component",
				verifyReadback: true,
				intent: "apply",
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => false } },
		);

		expect(preflight.details.outcome.status).toBe("preflight");
		expect(preflight.details.error).toBeUndefined();
		expect(JSON.stringify(preflight.details.outcome)).toContain('"action":"set_element_dependency"');
		expect(invalidFolder.details.outcome.status).toBe("error");
		expect(invalidFolder.details.error?.code).toBe("ascet_edit_invalid_scope");
		expect(invalidFolder.details.error?.message).toContain('match="all"');
		expect(rejected.ok).toBe(false);
		expect(rejected.error?.code).toBe("ascet_edit_confirmation_not_granted");
	});

	it("returns a structured set_element_dependency validation error when target path is missing", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				elementName: "aw_gain",
				dependency: "dependent",
				intent: "apply",
			},
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome).toEqual({
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "set_element_dependency requires targetPath or componentPath.",
			},
		});
	});

	it("uses componentPath as the set_element_dependency targetPath compatibility alias", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				componentPath: "DEMO/PID",
				elementName: "aw_gain",
				dependency: "dependent",
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{},
		);

		expect(result.details.outcome.status).toBe("preflight");
		if (result.details.outcome.status !== "preflight") {
			throw new Error("expected preflight outcome");
		}
		expect(result.details.outcome.plan.params).toMatchObject({
			action: "set_element_dependency",
			targetPath: "DEMO/PID",
			componentPath: "DEMO/PID",
			elementName: "aw_gain",
			dependency: "dependent",
		});
	});

	it("runs set_element_dependency only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetSetElementDependency(
			{
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				dependencyFormula: "K_Factor",
				dependencyMappings: { K_Factor: "K_Factor" },
				targetKind: "component",
				match: "exact",
				verifyReadback: true,
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								operationName: "set_element_dependency",
								payload: { dependency: { after: "dependent" } },
								verification: { requested: true, attempted: true, succeeded: true },
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalls++;
						return true;
					},
				},
			},
		);

		expect(confirmCalls).toBe(1);
		expect(executeCalls).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.request.args).toEqual([
			"exec",
			"set_element_dependency",
			"DEMO\\DiscreteRiccatiSolver",
			"B01",
			"dependent",
			"--formula",
			"K_Factor",
			"--mapping",
			"K_Factor=K_Factor",
			"--target-kind",
			"component",
			"--match",
			"exact",
			"--verify-readback",
			"--json",
		]);
	});

	it("represents canonical ascet_edit preflight as a non-error outcome", async () => {
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO\\X", intent: "preview" },
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome.status).toBe("preflight");
		expect(result.details.error).toBeUndefined();
	});

	it("rejects create_method method kinds that are incompatible with the component kind before execution", async () => {
		expect(
			Value.Check(ascetEditParameters, {
				action: "create_method",
				componentPath: "DEMO\\PID",
				componentKind: "class",
				methodName: "calc2",
				methodKind: "abstract",
				intent: "preview",
			}),
		).toBe(true);

		const invalidClassMethod = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\PID",
				componentKind: "class",
				methodName: "calc2",
				methodKind: "process",
				intent: "apply",
			} as never,
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const invalidModuleMethod = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\Module_Block_Diagram",
				componentKind: "module",
				methodName: "onRun",
				methodKind: "abstract",
				intent: "apply",
			} as never,
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const missingKindForExecution = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\PID",
				methodName: "calc2",
				methodKind: "process",
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) =>
					request.args[1] === "preflight_create_method"
						? jsonExecutionResult(request, {
								capability: { status: "unsupported" },
								diagramName: "Main",
							})
						: completeDirectMutationExecution(request),
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(invalidClassMethod.details.outcome.status).toBe("error");
		expect(invalidClassMethod.details.error?.code).toBe("ascet_edit_incompatible_method_kind");
		expect(invalidClassMethod.details.error?.message).toContain("Class method creation supports only abstract");
		expect(invalidModuleMethod.details.outcome.status).toBe("error");
		expect(invalidModuleMethod.details.error?.code).toBe("ascet_edit_incompatible_method_kind");
		expect(invalidModuleMethod.details.error?.message).toContain("Module method creation supports only process");
		expect(missingKindForExecution.details.outcome.status).toBe("error");
		expect(missingKindForExecution.details.error?.code).toBe("create_method_capability_not_supported");
		expect(missingKindForExecution.details.error?.message).toContain("does not support creating 'process'");
	});

	it("defaults create_method methodKind from componentKind before execution when unambiguous", async () => {
		let observedArgs: string[] | undefined;
		const result = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\PID",
				componentKind: "class",
				methodName: "calc2",
				methodKind: "abstract",
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					if (request.args[1] === "guarded_create_method") observedArgs = request.args;
					return completeDirectMutationExecution(request);
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome.status).toBe("ok");
		expect(observedArgs).toEqual(
			expect.arrayContaining(["exec", "guarded_create_method", "--method-kind", "abstract", "--json"]),
		);
	});

	it("accepts and dispatches enumeration writes through ascet_edit", async () => {
		const tempRoot = await mkdtemp(join(tmpdir(), "pi-ascet-enumerators-"));
		const enumerators = ["EngineStallStatus_NO_RISK", "EngineStallStatus_WARNING", "EngineStallStatus_IMMINENT"];
		let observedArgs: string[] | undefined;

		expect(
			Value.Check(ascetEditParameters, {
				action: "set_enumerators",
				componentPath: "DEMO\\Enums\\EngineStallStatus",
				enumerators,
				intent: "apply",
			}),
		).toBe(true);

		const result = await runAscetEdit(
			{
				action: "set_enumerators",
				componentPath: "DEMO\\Enums\\EngineStallStatus",
				enumerators,
				intent: "apply",
			},
			{
				cwd: repoRoot,
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(tempRoot, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(tempRoot, "runtime"),
				},
				executeCli: async (request) => {
					if (request.args[1] === "set_enumerators") observedArgs = request.args;
					return completeDirectMutationExecution(request, {
						componentPath: "DEMO\\Enums\\EngineStallStatus",
						enumerators,
						writeSucceeded: true,
						verifyReadbackRequested: true,
						readbackVerified: true,
					});
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome.status).toBe("ok");
		expect(observedArgs).toEqual([
			"exec",
			"set_enumerators",
			"DEMO\\Enums\\EngineStallStatus",
			"--items",
			"EngineStallStatus_NO_RISK,EngineStallStatus_WARNING,EngineStallStatus_IMMINENT",
			"--verify-readback",
			"--json",
		]);
		await rm(tempRoot, { recursive: true, force: true });
	});

	it("preserves create_component expected default scaffold as an unverified hint", async () => {
		const result = await runAscetEdit(
			{
				action: "create_component",
				componentPath: "DEMO\\ScaffoldProbe",
				kind: "class",
				language: "ESDL",
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) =>
					completeDirectMutationExecution(request, {
						writeSucceeded: true,
						verifyReadbackRequested: true,
						readbackVerified: true,
						payload: {
							expectedDefaultScaffold: {
								verified: false,
								generatedItems: [{ kind: "method", name: "calc" }],
								defaultEntryMethod: "calc",
							},
						},
					}),
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome).toMatchObject({
			status: "ok",
			data: {
				changed: {
					payload: {
						expectedDefaultScaffold: {
							verified: false,
							generatedItems: [{ kind: "method", name: "calc" }],
							defaultEntryMethod: "calc",
						},
					},
				},
			},
		});
		const promptGuidelinesText = ascetEditPrompt.promptGuidelines.join("\n");
		expect(promptGuidelinesText).toContain("ascet_edit.create_component");
		expect(promptGuidelinesText).toContain('kind:"class"');
		expect(promptGuidelinesText).toContain("ascet_edit.apply_element_spec");
		expect(promptGuidelinesText).toContain('elementIntent:"create"');
		expect(promptGuidelinesText).not.toContain("ascet_edit.set_element_dependency");
		expect(promptGuidelinesText).toContain("ascet_edit.create_dependent_chain");
		expect(promptGuidelinesText).not.toContain('intent:"create"');
	});

	it("returns friendly validation for missing module/state-machine write selectors", async () => {
		const missingModuleSection = await runAscetEdit(
			{
				action: "set_module_code",
				modulePath: "DEMO\\Module",
				code: "x = 1;",
				intent: "apply",
			},
			{ cwd: repoRoot },
			{},
		);
		const missingStateMachineOperation = await runAscetEdit(
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: undefined as never,
				code: "x = 1;",
				intent: "apply",
			},
			{ cwd: repoRoot },
			{},
		);
		const invalidStateMachineOperation = await runAscetEdit(
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: "add_state" as never,
				code: "x = 1;",
				intent: "preview",
			},
			{ cwd: repoRoot },
			{},
		);
		const moduleSectionAlias = await runAscetEdit(
			{
				action: "set_module_code",
				modulePath: "DEMO\\Module",
				section: "set-header",
				code: "/* header */",
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: completeDirectMutationExecution },
			{},
		);

		expect(missingModuleSection.details.error?.message).toBe("section parameter is required for set_module_code");
		expect(missingStateMachineOperation.details.error?.code).toBe("ascet_edit_invalid_parameter");
		expect(missingStateMachineOperation.details.error?.message).toContain("Invalid parameters for ascet_edit");
		expect(invalidStateMachineOperation.details.outcome.status).toBe("error");
		expect(invalidStateMachineOperation.details.error?.code).toBe("ascet_edit_invalid_parameter");
		expect(invalidStateMachineOperation.details.error?.message).toContain("Invalid parameters for ascet_edit");
		expect(moduleSectionAlias.details.outcome.status).toBe("preflight");
		expect(JSON.stringify(moduleSectionAlias.details.outcome)).toContain('"operation":"set-header"');
	});

	it("lists valid state-machine operations when schema validation rejects an invalid operation", () => {
		const toolCall: ToolCall = {
			type: "toolCall",
			id: "tool-1",
			name: "ascet_edit",
			arguments: {
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: "add_state",
				code: "x = 1;",
				intent: "preview",
			},
		};

		expect(() => ascetEditTool.prepareArguments?.(toolCall.arguments)).toThrow(
			"Invalid operation for set_state_machine_code: 'add_state'. Valid values: set-method, set-state-entry-esdl",
		);
		expect(() => validateToolArguments(ascetEditTool, toolCall)).toThrow('Validation failed for tool "ascet_edit"');
	});

	it("cleans up inline code temp files on success and failure", async () => {
		const tempRoot = await mkdtemp(join(tmpdir(), "pi-ascet-inline-"));
		let successPath = "";
		let failurePath = "";

		const success = await withInlineCodeFile({ code: "x = 1;", prefix: "calc", tempRoot }, async (codeFile) => {
			successPath = codeFile;
			expect(await readFile(codeFile, "utf8")).toBe("x = 1;");
			return "ok";
		});

		await expect(
			withInlineCodeFile({ code: "x = 2;", prefix: "calc", tempRoot }, async (codeFile) => {
				failurePath = codeFile;
				throw new Error("boom");
			}),
		).rejects.toThrow("boom");

		expect(success).toBe("ok");
		expect(successPath).not.toBe("");
		expect(failurePath).not.toBe("");
		expect(existsSync(successPath)).toBe(false);
		expect(existsSync(failurePath)).toBe(false);
	});

	it("builds batch write invocation and stdin payload", async () => {
		expect(
			buildBatchWriteArgs({
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore" }],
			}),
		).toEqual(["batch", "create_folder"]);

		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore" }],
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.ok).toBe(true);
		expect(result.error).toBeUndefined();
		expect(result.mutationResult).toMatchObject({
			status: "ok",
			mutation: { status: "not_started" },
			verification: { status: "not_applicable" },
		});
		expect(result.request.args).toEqual(["batch", "create_folder"]);
		expect(JSON.parse(result.request.stdin ?? "{}")).toEqual({
			requests: [
				{
					id: "req-1",
					operation: "create_folder",
					args: { folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true },
				},
			],
		});
	});

	it("normalizes batch create defaults before producing the CLI payload", async () => {
		const componentResult = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_component",
				requests: [
					{ componentPath: "DEMO\\BatchClass", kind: "class" },
					{ componentPath: "DEMO\\BatchState", kind: "statemachine" },
				],
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const methodResult = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_method",
				requests: [
					{ componentPath: "DEMO\\BatchClass", componentKind: "class", methodName: "calc2" },
					{ componentPath: "DEMO\\BatchModule", componentKind: "module", methodName: "process2" },
				],
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(JSON.parse(componentResult.request.stdin ?? "{}")).toMatchObject({
			requests: [
				{ operation: "create_component", args: { componentPath: "DEMO\\BatchClass", language: "ESDL" } },
				{ operation: "create_component", args: { componentPath: "DEMO\\BatchState" } },
			],
		});
		expect(JSON.parse(methodResult.request.stdin ?? "{}")).toMatchObject({
			requests: [
				{ operation: "create_method", args: { componentKind: "class", methodKind: "abstract" } },
				{ operation: "create_method", args: { componentKind: "module", methodKind: "process" } },
			],
		});
		expect(
			createBatchWriteSummary({
				operation: "batch_create_component",
				requests: [{ componentPath: "D\\C", kind: "class" }],
			}),
		).toContain('"language":"ESDL"');
	});

	it("rejects ambiguous batch create_method defaults before CLI execution", async () => {
		await expect(
			runApprovedAscetBatchWrite(
				{
					operation: "batch_create_method",
					requests: [{ componentPath: "DEMO\\BatchState", componentKind: "statemachine", methodName: "entry" }],
					intent: "preview",
				},
				{ cwd: repoRoot },
				{ hasUI: true, ui: { confirm: async () => true } },
			),
		).rejects.toThrow("requires methodKind for statemachine targets");
	});

	it("uses OpenAI-compatible object schema for batch writes", () => {
		expect(ascetBatchWriteParameters.type).toBe("object");
		expect(
			Value.Check(ascetBatchWriteParameters, {
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\Batch", ifExists: "ignore" }],
				intent: "preview",
			}),
		).toBe(true);
	});

	it("accepts method signature argument patches in ascet_edit schema", async () => {
		expect(
			Value.Check(ascetEditParameters, {
				action: "set_method_signature",
				componentPath: "DEMO\\PiSmoke",
				methodName: "calc",
				arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
				intent: "preview",
			}),
		).toBe(true);

		const result = await runAscetEdit(
			{
				action: "set_method_signature",
				componentPath: "DEMO\\PiSmoke",
				methodName: "calc",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		expect(result.details.outcome.status).toBe("error");
		expect(result.details.error?.code).toBe("ascet_edit_invalid_parameter");
	});

	it("represents canonical ascet_batch_write preflight as a non-error outcome", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\Batch", ifExists: "ignore" }],
				intent: "preview",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const outcome = createBatchWriteOutcome(result);

		expect(outcome.status).toBe("preflight");
		expect(outcome).toMatchObject({
			status: "preflight",
			plan: {
				operation: "batch_create_folder",
				preflightOnly: true,
			},
		});
		expect(formatBatchWriteResult(result)).toContain('"preflightOnly": true');
		expect(formatBatchWriteResult(result)).not.toContain("preflight_required");
	});

	it("reports only operation-specific request validation errors for batch writes", async () => {
		expect(() =>
			ascetBatchWriteTool.prepareArguments?.({
				operation: "batch_set_method_code",
				requests: [
					{
						componentPath: "ETAS_SystemLib\\Bitoperations\\and",
						methodName: "and",
						codeFile: "",
					},
				],
				intent: "preview",
			}),
		).toThrow(/requests\.0\.codeFile: must not have fewer than 1 characters/);
		expect(() =>
			ascetBatchWriteTool.prepareArguments?.({
				operation: "batch_set_method_code",
				requests: [
					{
						componentPath: "ETAS_SystemLib\\Bitoperations\\and",
						methodName: "and",
						codeFile: "",
					},
				],
				intent: "preview",
			}),
		).not.toThrow(/specFile|kind|projectPath/);
	});

	it("represents partial batch completion as a first-class outcome", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore" }],
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) =>
					request.args[0] === "batch"
						? {
								exitCode: 2,
								stdout: JSON.stringify({
									ok: false,
									results: [
										{ id: "req-1", ok: true },
										{ id: "req-2", ok: false, error: { code: "target_not_found" } },
									],
								}),
								stderr: "",
								timedOut: false,
								request,
							}
						: batchWriteExecution(request),
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);
		const outcome = createBatchWriteOutcome(result);

		expect(result.ok).toBe(true);
		expect(outcome.status).toBe("partial");
		expect(outcome).toMatchObject({ failures: [{ id: "req-2", ok: false }] });
	});

	it("keeps preview/apply classification outside the approval adapter", async () => {
		let confirmations = 0;
		const approval = await requestAscetEditApproval(
			{
				title: "Confirm ASCET write",
				message: "write",
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

		expect(confirmations).toBe(1);
		expect(approval).toMatchObject({ approved: true });
	});

	it("blocks writes when no interactive confirmation UI is available", async () => {
		const setCodeResult = await runApprovedAscetSetMethodCode(
			{
				componentPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
				intent: "apply",
			},
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const createFolderResult = await runApprovedAscetCreateFolder(
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, intent: "apply" },
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const batchWriteResult = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__" }],
				intent: "apply",
			},
			{ cwd: repoRoot, executeCli: batchWriteExecution },
			{ hasUI: false },
		);

		expect(setCodeResult.ok).toBe(false);
		expect(setCodeResult.error?.code).toBe("ascet_edit_approval_required");
		expect(setCodeResult.request.args).toContain("--verify-readback");
		expect(createFolderResult.ok).toBe(false);
		expect(createFolderResult.error?.code).toBe("ascet_edit_approval_required");
		expect(batchWriteResult.ok).toBe(false);
		expect(batchWriteResult.error?.code).toBe("ascet_batch_write_approval_required");
	});

	it("runs the write command only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetSetMethodCode(
			{
				componentPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { readbackVerified: true } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalls++;
						return true;
					},
				},
			},
		);

		expect(confirmCalls).toBe(1);
		expect(executeCalls).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.data).toMatchObject({ ok: true, result: { readbackVerified: true } });
	});

	it("runs structural writes only after interactive confirmation", async () => {
		const executedArgs: string[][] = [];
		const options = {
			cwd: repoRoot,
			executeCli: async (request: AscetCliRequest) => {
				executedArgs.push(request.args);
				return {
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { applied: true } }),
					stderr: "",
					timedOut: false,
					request,
				};
			},
		};
		const ctx = {
			hasUI: true,
			ui: {
				confirm: async () => true,
			},
		};

		await runApprovedAscetCreateFolder(
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, intent: "apply" },
			options,
			ctx,
		);
		await runApprovedAscetCreateComponent(
			{
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				kind: "class",
				language: "ESDL",
				ifExists: "return-existing",
				verifyReadback: true,
				intent: "apply",
			},
			options,
			ctx,
		);
		await runApprovedAscetCreateMethod(
			{
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				methodKind: "abstract",
				ifExists: "return-existing",
				verifyReadback: true,
				intent: "apply",
			},
			options,
			ctx,
		);
		await runApprovedAscetSetMethodSignature(
			{
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				returnType: "cont",
				ifReturnExists: "keep",
				verifyReadback: true,
				intent: "apply",
			},
			options,
			ctx,
		);

		expect(executedArgs).toEqual([
			["exec", "create_folder", "DEMO\\__pi_write_smoke__", "--verify-readback", "--json"],
			[
				"exec",
				"create_component",
				"DEMO\\__pi_write_smoke__\\PiSmoke",
				"--kind",
				"class",
				"--language",
				"ESDL",
				"--if-exists",
				"return-existing",
				"--verify-readback",
				"--json",
			],
			[
				"exec",
				"create_method",
				"DEMO\\__pi_write_smoke__\\PiSmoke",
				"calc",
				"--method-kind",
				"abstract",
				"--if-exists",
				"return-existing",
				"--verify-readback",
				"--json",
			],
			[
				"exec",
				"set_method_signature",
				"DEMO\\__pi_write_smoke__\\PiSmoke",
				"calc",
				"--return-type",
				"cont",
				"--if-return-exists",
				"keep",
				"--verify-readback",
				"--json",
			],
		]);
	});

	it("runs batch write only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore" }],
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					if (request.args[0] === "batch") {
						executeCalls++;
						return batchWriteExecution(request);
					}
					return batchWriteExecution(request);
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalls++;
						return true;
					},
				},
			},
		);

		expect(confirmCalls).toBe(1);
		expect(executeCalls).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.request.args).toEqual(["batch", "create_folder"]);
		expect(result.request.stdin).toContain('"operation":"create_folder"');
	});

	it("classifies batch write invalid JSON output as an unknown write outcome", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore" }],
				intent: "apply",
			},
			{
				cwd: repoRoot,
				executeCli: async (request) =>
					request.args[0] === "batch"
						? { exitCode: 0, stdout: "not json", stderr: "", timedOut: false, request }
						: batchWriteExecution(request),
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("write_outcome_unknown");
		expect(result.data).toBeNull();
	});

	it("registers ascet_edit and keeps batch write hidden by default", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.tools.get("ascet_edit")?.definition).toMatchObject({
			name: "ascet_edit",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_batch_write")?.definition).toBeUndefined();
		expect(ascetBatchWriteTool).toMatchObject({
			name: "ascet_batch_write",
			executionMode: "sequential",
		});
	});
});

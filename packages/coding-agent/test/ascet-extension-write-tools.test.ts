import { existsSync } from "node:fs";
import { mkdtemp, readFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import type { ToolCall } from "../../ai/src/types.ts";
import { validateToolArguments } from "../../ai/src/utils/validation.ts";
import { buildApplyElementSpecArgs } from "../../ascet-extension/src/apply-element-spec.ts";
import { buildApplyProjectFormulaArgs } from "../../ascet-extension/src/apply-project-formula.ts";
import {
	ascetBatchWriteParameters,
	buildBatchWriteArgs,
	createBatchWriteOutcome,
	runApprovedAscetBatchWrite,
} from "../../ascet-extension/src/batch-write.ts";
import type { AscetCliRequest } from "../../ascet-extension/src/cli.ts";
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
import { ascetWriteTool } from "../../ascet-extension/src/tools/write/index.ts";
import { ascetWritePrompt } from "../../ascet-extension/src/tools/write/prompt.ts";
import { ascetWriteParameters, runAscetWrite } from "../../ascet-extension/src/tools/write.ts";
import { requestAscetWriteApproval } from "../../ascet-extension/src/write-policy.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

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
		const preflight = await runAscetWrite(
			{
				action: "set_element_dependency",
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const invalidFolder = await runAscetWrite(
			{
				action: "set_element_dependency",
				targetPath: "DEMO\\Folder",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "folder",
				match: "exact",
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const rejected = await runApprovedAscetSetElementDependency(
			{
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "component",
				verifyReadback: true,
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => false } },
		);

		expect(preflight.details.outcome.status).toBe("preflight");
		expect(preflight.details.error).toBeUndefined();
		expect(JSON.stringify(preflight.details.outcome)).toContain('"action":"set_element_dependency"');
		expect(invalidFolder.details.outcome.status).toBe("error");
		expect(invalidFolder.details.error?.code).toBe("ascet_write_invalid_scope");
		expect(invalidFolder.details.error?.message).toContain('match="all"');
		expect(rejected.ok).toBe(false);
		expect(rejected.error?.code).toBe("ascet_write_rejected");
	});

	it("runs set_element_dependency only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetSetElementDependency(
			{
				targetPath: "DEMO\\DiscreteRiccatiSolver",
				elementName: "B01",
				dependency: "dependent",
				targetKind: "component",
				match: "exact",
				verifyReadback: true,
				executeWrite: true,
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
			"--target-kind",
			"component",
			"--match",
			"exact",
			"--verify-readback",
			"--json",
		]);
	});

	it("represents canonical ascet_write preflight as a non-error outcome", async () => {
		const result = await runAscetWrite(
			{ action: "create_folder", folderPath: "DEMO\\X", executeWrite: false },
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome.status).toBe("preflight");
		expect(result.details.error).toBeUndefined();
	});

	it("rejects create_method method kinds that are incompatible with the component kind before execution", async () => {
		expect(
			Value.Check(ascetWriteParameters, {
				action: "create_method",
				componentPath: "DEMO\\PID",
				componentKind: "class",
				methodName: "calc2",
				methodKind: "abstract",
				verifyReadback: true,
			}),
		).toBe(true);

		const invalidClassMethod = await runAscetWrite(
			{
				action: "create_method",
				componentPath: "DEMO\\PID",
				componentKind: "class",
				methodName: "calc2",
				methodKind: "process",
				executeWrite: true,
			} as never,
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const invalidModuleMethod = await runAscetWrite(
			{
				action: "create_method",
				componentPath: "DEMO\\Module_Block_Diagram",
				componentKind: "module",
				methodName: "onRun",
				methodKind: "abstract",
				executeWrite: true,
			} as never,
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		const missingKindForExecution = await runAscetWrite(
			{
				action: "create_method",
				componentPath: "DEMO\\PID",
				methodName: "calc2",
				methodKind: "process",
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(invalidClassMethod.details.outcome.status).toBe("error");
		expect(invalidClassMethod.details.error?.code).toBe("ascet_write_incompatible_method_kind");
		expect(invalidClassMethod.details.error?.message).toContain("Class method creation supports only abstract");
		expect(invalidModuleMethod.details.outcome.status).toBe("error");
		expect(invalidModuleMethod.details.error?.code).toBe("ascet_write_incompatible_method_kind");
		expect(invalidModuleMethod.details.error?.message).toContain("Module method creation supports only process");
		expect(missingKindForExecution.details.outcome.status).toBe("error");
		expect(missingKindForExecution.details.error?.code).toBe("ascet_write_missing_component_kind");
		expect(missingKindForExecution.details.error?.message).toContain("inspect the target");
	});

	it("preserves create_component expected default scaffold as an unverified hint", async () => {
		const result = await runAscetWrite(
			{
				action: "create_component",
				componentPath: "DEMO\\ScaffoldProbe",
				kind: "class",
				language: "ESDL",
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							payload: {
								expectedDefaultScaffold: {
									verified: false,
									generatedItems: [{ kind: "method", name: "calc" }],
									defaultEntryMethod: "calc",
								},
							},
						},
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.details.outcome).toMatchObject({
			status: "ok",
			data: {
				result: {
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
		expect(ascetWritePrompt.promptGuidelines).toContain(
			"After create_component, inspect expectedDefaultScaffold.defaultEntryMethod as an unverified hint for the likely initial method.",
		);
		expect(ascetWritePrompt.promptGuidelines).toEqual(
			expect.arrayContaining([
				expect.stringContaining('{"elements"'),
				expect.stringContaining('"modelType":"cont"'),
				expect.stringContaining('"scope":"exported"'),
				expect.stringContaining('"min":0'),
				expect.stringContaining('"max":8000'),
				expect.stringContaining('"impl":{"formula":"ident"'),
				expect.stringContaining('"limitAssignments":true'),
				expect.stringContaining("Calibration is not an apply_element_spec field"),
				expect.stringContaining("Dependency is not part of apply_element_spec"),
				expect.stringContaining('apply_element_spec:preflight spec->ascet_write({action:"apply_element_spec"'),
			]),
		);
	});

	it("returns friendly validation for missing module/state-machine write selectors", async () => {
		const missingModuleSection = await runAscetWrite(
			{
				action: "set_module_code",
				modulePath: "DEMO\\Module",
				code: "x = 1;",
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{},
		);
		const missingStateMachineOperation = await runAscetWrite(
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: undefined as never,
				code: "x = 1;",
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{},
		);
		const invalidStateMachineOperation = await runAscetWrite(
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: "add_state" as never,
				code: "x = 1;",
				executeWrite: false,
			},
			{ cwd: repoRoot },
			{},
		);
		const moduleSectionAlias = await runAscetWrite(
			{
				action: "set_module_code",
				modulePath: "DEMO\\Module",
				section: "set-header",
				code: "/* header */",
				executeWrite: false,
			},
			{ cwd: repoRoot },
			{},
		);

		expect(missingModuleSection.details.error?.message).toBe("section parameter is required for set_module_code");
		expect(missingStateMachineOperation.details.error?.message).toContain(
			"Valid values: set-method, set-state-entry-esdl",
		);
		expect(invalidStateMachineOperation.details.outcome.status).toBe("error");
		expect(invalidStateMachineOperation.details.error?.code).toBe("ascet_write_invalid_operation");
		expect(invalidStateMachineOperation.details.error?.message).toContain(
			"Unknown state-machine write operation 'add_state'",
		);
		expect(moduleSectionAlias.details.outcome.status).toBe("preflight");
		expect(JSON.stringify(moduleSectionAlias.details.outcome)).toContain('"operation":"set-header"');
	});

	it("lists valid state-machine operations when schema validation rejects an invalid operation", () => {
		const toolCall: ToolCall = {
			type: "toolCall",
			id: "tool-1",
			name: "ascet_write",
			arguments: {
				action: "set_state_machine_code",
				stateMachinePath: "DEMO\\SM",
				operation: "add_state",
				code: "x = 1;",
				executeWrite: false,
			},
		};

		expect(() => ascetWriteTool.prepareArguments?.(toolCall.arguments)).toThrow(
			"Invalid operation for set_state_machine_code: 'add_state'. Valid values: set-method, set-state-entry-esdl",
		);
		expect(() => validateToolArguments(ascetWriteTool, toolCall)).toThrow(
			"operation: must be one of: set-method, set-header, set-external-c-code, set-state-entry-esdl",
		);
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
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
			}),
		).toEqual(["batch", "create_folder"]);

		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: false,
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("ascet_write_preflight_required");
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

	it("uses OpenAI-compatible object schema for batch writes", () => {
		expect(ascetBatchWriteParameters.type).toBe("object");
		expect(
			Value.Check(ascetBatchWriteParameters, {
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\Batch", ifExists: "ignore", verifyReadback: true }],
			}),
		).toBe(true);
	});

	it("accepts method signature argument patches in ascet_write schema", async () => {
		expect(
			Value.Check(ascetWriteParameters, {
				action: "set_method_signature",
				componentPath: "DEMO\\PiSmoke",
				methodName: "calc",
				arguments: [{ name: "p_CmpF_MC1", type: "cont", ifExists: "keep" }],
				verifyReadback: true,
			}),
		).toBe(true);

		const result = await runAscetWrite(
			{
				action: "set_method_signature",
				componentPath: "DEMO\\PiSmoke",
				methodName: "calc",
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);
		expect(result.details.outcome.status).toBe("error");
		expect(result.details.error?.code).toBe("ascet_write_missing_parameter");
	});

	it("represents canonical ascet_batch_write preflight as a non-error outcome", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_batch_write")?.definition;
		const result = (await tool?.execute?.(
			"tool-call",
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\Batch", ifExists: "ignore", verifyReadback: true }],
				executeWrite: false,
			},
			new AbortController().signal,
			undefined,
			{ cwd: repoRoot, hasUI: true, ui: { confirm: async () => true } } as never,
		)) as {
			content: Array<{ type: "text"; text: string }>;
			details: { outcome: { status: string }; rawContent: string };
		};
		const content = JSON.parse(result.content[0]?.text ?? "{}");

		expect(result.details.outcome.status).toBe("preflight");
		expect(content).toMatchObject({
			status: "preflight",
			plan: {
				operation: "batch_create_folder",
				preflightOnly: true,
			},
		});
		expect(result.details.rawContent).toContain("ASCET batch_write failed: ascet_write_preflight_required");
	});

	it("reports only operation-specific request validation errors for batch writes", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_batch_write")?.definition;

		expect(() =>
			tool?.prepareArguments?.({
				operation: "batch_set_method_code",
				requests: [
					{
						componentPath: "ETAS_SystemLib\\Bitoperations\\and",
						methodName: "and",
						codeFile: "",
						verifyReadback: false,
					},
				],
			}),
		).toThrow(/requests\.0\.codeFile: must not have fewer than 1 characters/);
		expect(() =>
			tool?.prepareArguments?.({
				operation: "batch_set_method_code",
				requests: [
					{
						componentPath: "ETAS_SystemLib\\Bitoperations\\and",
						methodName: "and",
						codeFile: "",
						verifyReadback: false,
					},
				],
			}),
		).not.toThrow(/specFile|kind|projectPath/);
	});

	it("represents partial batch completion as a first-class outcome", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
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
				}),
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

	it("requires executeWrite before asking for interactive confirmation", async () => {
		const approval = await requestAscetWriteApproval(
			{
				executeWrite: false,
				title: "Confirm ASCET write",
				message: "write",
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);

		expect(approval).toMatchObject({
			approved: false,
			code: "ascet_write_preflight_required",
		});
	});

	it("blocks writes when no interactive confirmation UI is available", async () => {
		const setCodeResult = await runApprovedAscetSetMethodCode(
			{
				componentPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const createFolderResult = await runApprovedAscetCreateFolder(
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, executeWrite: true },
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const batchWriteResult = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true }],
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: false },
		);

		expect(setCodeResult.ok).toBe(false);
		expect(setCodeResult.error?.code).toBe("ascet_write_ui_required");
		expect(setCodeResult.request.args).toContain("--verify-readback");
		expect(createFolderResult.ok).toBe(false);
		expect(createFolderResult.error?.code).toBe("ascet_write_ui_required");
		expect(batchWriteResult.ok).toBe(false);
		expect(batchWriteResult.error?.code).toBe("ascet_write_ui_required");
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
				executeWrite: true,
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
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, executeWrite: true },
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
				executeWrite: true,
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
				executeWrite: true,
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
				executeWrite: true,
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
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { results: [{ ok: true }] } }),
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
		expect(result.request.args).toEqual(["batch", "create_folder"]);
		expect(result.request.stdin).toContain('"operation":"create_folder"');
	});

	it("classifies batch write invalid JSON output as a tool failure", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: "not json",
					stderr: "",
					timedOut: false,
					request,
				}),
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("ascet_cli_invalid_json");
		expect(result.data).toBeNull();
	});

	it("registers the write tool as sequential", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.tools.get("ascet_write")?.definition).toMatchObject({
			name: "ascet_write",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_batch_write")?.definition).toMatchObject({
			name: "ascet_batch_write",
			executionMode: "sequential",
		});
	});
});

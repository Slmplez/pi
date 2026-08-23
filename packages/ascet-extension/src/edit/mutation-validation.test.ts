import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { buildSetStateMachineCodeArgs } from "../set-state-machine-code.ts";
import {
	getAscetMutationPermissionEvidence,
	normalizeAscetMutationParams,
	validateAscetMutationParams,
} from "./mutation-validation.ts";
import type { AscetMutationParams } from "./service.ts";

function validate(params: AscetMutationParams, cwd = process.cwd()) {
	return validateAscetMutationParams(normalizeAscetMutationParams(params), { cwd });
}

describe("ASCET mutation validation", () => {
	test("normalizes the same path used by permission and dispatch", () => {
		const normalized = normalizeAscetMutationParams({
			action: "set_method_code",
			componentPath: "  \\DEMO//Controller\\  ",
			methodName: "run",
			code: "return;",
			intent: "apply",
		});
		assert.equal(normalized.action, "set_method_code");
		if (normalized.action !== "set_method_code") throw new Error("Expected set_method_code.");
		assert.equal(normalized.componentPath, "DEMO\\Controller");
	});

	test("rejects target paths that become empty after normalization", () => {
		const invalidPaths: AscetMutationParams[] = [
			{ action: "create_folder", folderPath: "  ", intent: "apply" },
			{ action: "create_component", componentPath: " // ", kind: "class", intent: "apply" },
			{
				action: "create_method",
				componentPath: " \\ ",
				methodName: "run",
				methodKind: "process",
				intent: "apply",
			},
		];
		for (const params of invalidPaths) {
			assert.equal(validate(params)?.code, "ascet_edit_missing_parameter", params.action);
		}
	});

	test("validates component language and method-kind compatibility", () => {
		const normalized = normalizeAscetMutationParams({
			action: "create_component",
			componentPath: "D/C",
			kind: "class",
			intent: "apply",
		});
		assert.equal(normalized.action, "create_component");
		if (normalized.action !== "create_component") throw new Error("Expected create_component.");
		assert.equal(normalized.language, "ESDL");
		assert.match(
			validate({
				action: "create_component",
				componentPath: "D/E",
				kind: "enumeration",
				language: "ESDL",
				intent: "apply",
			})?.message ?? "",
			/does not accept language/u,
		);
		assert.match(
			validate({
				action: "create_component",
				componentPath: "D/S",
				kind: "statemachine",
				language: "C",
				intent: "apply",
			})?.message ?? "",
			/does not support language=C/u,
		);
		assert.equal(
			validate({
				action: "create_method",
				componentPath: "D/C",
				componentKind: "class",
				methodName: "run",
				methodKind: "process",
				intent: "apply",
			})?.code,
			"ascet_edit_incompatible_method_kind",
		);
	});

	test("requires exactly one code source", () => {
		for (const params of [
			{ action: "set_method_code", componentPath: "D/C", methodName: "run", intent: "apply" },
			{
				action: "set_method_code",
				componentPath: "D/C",
				methodName: "run",
				code: "return;",
				codeFile: "run.esdl",
				intent: "apply",
			},
		] as const) {
			assert.match(validate(params as AscetMutationParams)?.message ?? "", /exactly one/u);
		}
	});

	test("validates module operation fields", () => {
		assert.match(
			validate({ action: "set_module_code", modulePath: "D/M", operation: "set-method", code: "x", intent: "apply" })
				?.message ?? "",
			/requires methodName/u,
		);
		assert.match(
			validate({
				action: "set_module_code",
				modulePath: "D/M",
				operation: "set-header",
				methodName: "run",
				code: "x",
				intent: "apply",
			})?.message ?? "",
			/only valid/u,
		);
	});

	test("validates all state-machine operation families", () => {
		const invalid: AscetMutationParams[] = [
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "set-method",
				code: "x",
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "set-state-entry-esdl",
				code: "x",
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "bind-state-exit-method",
				stateName: "Idle",
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "set-transition-condition-esdl",
				sourceState: "A",
				targetState: "B",
				code: "x",
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "bind-transition-action-method",
				sourceState: "A",
				targetState: "B",
				priority: 1,
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "set-start-state",
				stateName: "Idle",
				methodName: "run",
				intent: "apply",
			},
		];
		for (const params of invalid) {
			assert.equal(params.action, "set_state_machine_code");
			assert.ok(validate(params), params.operation);
		}
	});

	test("rejects empty signatures and invalid enumerator transport values", () => {
		assert.equal(
			validate({ action: "set_method_signature", componentPath: "D/C", methodName: "run", intent: "apply" })?.code,
			"ascet_edit_missing_parameter",
		);
		assert.match(
			validate({ action: "set_enumerators", componentPath: "D/E", enumerators: ["A", "A"], intent: "apply" })
				?.message ?? "",
			/unique/u,
		);
		assert.match(
			validate({ action: "set_enumerators", componentPath: "D/E", enumerators: ["A,B"], intent: "apply" })
				?.message ?? "",
			/delimiter/u,
		);
	});

	test("requires readable project formula specs before dispatch", () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-formula-validation-"));
		try {
			assert.equal(
				validate(
					{ action: "apply_project_formula", projectPath: "D/P", specFile: "missing.json", intent: "apply" },
					root,
				)?.code,
				"ascet_edit_spec_file_unreadable",
			);
			writeFileSync(join(root, "formula.json"), "{}", "utf8");
			assert.equal(
				validate(
					{ action: "apply_project_formula", projectPath: "D/P", specFile: "formula.json", intent: "apply" },
					root,
				),
				undefined,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("validates dependency variants, mappings, restoration, and folder scope", () => {
		const base = {
			action: "set_element_dependency",
			targetPath: "D/C",
			elementName: "C_Value",
			dependency: "dependent",
			dependencyFormula: "x",
			dependencyMappings: { x: "P_Value" },
			variantPolicy: "default",
			intent: "apply",
		} as const;
		assert.equal(validate(base), undefined);
		assert.equal(validate({ ...base, dependencyMappings: { y: "P_Value" } })?.code, "dependency_mapping_mismatch");
		assert.equal(
			validate({ ...base, variantPolicy: "selected", variants: undefined })?.code,
			"data_variant_selection_required",
		);
		assert.equal(validate({ ...base, targetKind: "folder", match: "exact" })?.code, "ascet_edit_invalid_scope");
		assert.equal(
			validate({
				...base,
				dependency: "independent",
				dependencyFormula: undefined,
				dependencyMappings: undefined,
				valueRestoration: undefined,
			})?.code,
			"independent_value_restoration_required",
		);
	});

	test("reports conservative permission impact", () => {
		assert.deepEqual(
			getAscetMutationPermissionEvidence({
				action: "set_element_dependency",
				targetPath: "D",
				elementName: "C_Value",
				dependency: "dependent",
				dependencyFormula: "x",
				dependencyMappings: { x: "P_Value" },
				variantPolicy: "all",
				targetKind: "folder",
				match: "all",
				intent: "apply",
			}),
			{ targetCount: undefined, variantCount: undefined, evidenceComplete: false, impactUnknown: true },
		);
	});
	test("validates signature conditionals and unique argument names", () => {
		assert.match(
			validate({
				action: "set_method_signature",
				componentPath: "D/C",
				methodName: "run",
				arguments: [{ name: "x", type: "cont" }],
				ifReturnExists: "replace",
				intent: "apply",
			})?.message ?? "",
			/only valid when returnType/u,
		);
		assert.match(
			validate({
				action: "set_method_signature",
				componentPath: "D/C",
				methodName: "run",
				arguments: [
					{ name: "x", type: "cont" },
					{ name: " x ", type: "sdisc" },
				],
				intent: "apply",
			})?.message ?? "",
			/unique/u,
		);
	});

	test("rejects incomplete dependency formula and scope contracts", () => {
		const base = {
			action: "set_element_dependency",
			targetPath: "D/C",
			elementName: "C_Value",
			dependency: "dependent",
			variantPolicy: "default",
			intent: "apply",
		} as const;
		assert.equal(validate(base)?.code, "dependency_formula_required");
		assert.equal(
			validate({ ...base, dependencyFormula: "x", dependencyMappings: {} })?.code,
			"dependency_mappings_required",
		);
		assert.equal(
			validate({
				...base,
				dependencyFormula: "x",
				dependencyMappings: { x: "P_Value" },
				variantPolicy: "selected",
				variants: ["Nominal", " Nominal "],
			})?.code,
			"data_variant_selection_required",
		);
		assert.equal(
			validate({
				...base,
				dependencyFormula: "x",
				dependencyMappings: { x: "P_Value" },
				targetKind: "component",
				match: "all",
			})?.code,
			"ascet_edit_invalid_scope",
		);
	});

	test("marks unbounded mutation impact as incomplete permission evidence", () => {
		assert.deepEqual(
			getAscetMutationPermissionEvidence({
				action: "delete_folder",
				folderPath: "D/F",
				intent: "apply",
			}),
			{ targetCount: undefined, variantCount: 1, evidenceComplete: false, impactUnknown: true },
		);
		assert.deepEqual(
			getAscetMutationPermissionEvidence({
				action: "apply_element_spec",
				componentPath: "D/C",
				elementIntent: "patch",
				elements: [{ name: "P", comment: "updated" }],
				deleteMissing: true,
				intent: "apply",
			}),
			{ targetCount: undefined, variantCount: 1, evidenceComplete: false, impactUnknown: true },
		);
	});

	test("rejects fractional state-machine priorities", () => {
		assert.match(
			validate({
				action: "set_state_machine_code",
				stateMachinePath: "D/S",
				operation: "set-transition-action-esdl",
				sourceState: "Idle",
				targetState: "Run",
				priority: 1.5,
				code: "x",
				intent: "apply",
			})?.message ?? "",
			/integer/u,
		);
	});

	test("builds operation-specific state-machine positional arguments without shifting fields", () => {
		const cases = [
			{
				operation: "set-method",
				fields: { methodName: "run", codeFile: "body.esdl" },
				expected: ["run", "body.esdl"],
			},
			{
				operation: "set-state-entry-esdl",
				fields: { stateName: "Idle", codeFile: "body.esdl" },
				expected: ["Idle", "body.esdl"],
			},
			{
				operation: "set-state-exit-esdl",
				fields: { stateName: "Idle", codeFile: "body.esdl" },
				expected: ["Idle", "body.esdl"],
			},
			{
				operation: "set-state-static-esdl",
				fields: { stateName: "Idle", codeFile: "body.esdl" },
				expected: ["Idle", "body.esdl"],
			},
			{
				operation: "bind-state-entry-method",
				fields: { stateName: "Idle", methodName: "enter" },
				expected: ["Idle", "enter"],
			},
			{
				operation: "bind-state-exit-method",
				fields: { stateName: "Idle", methodName: "exit" },
				expected: ["Idle", "exit"],
			},
			{
				operation: "bind-state-static-method",
				fields: { stateName: "Idle", methodName: "tick" },
				expected: ["Idle", "tick"],
			},
			{
				operation: "set-transition-condition-esdl",
				fields: { sourceState: "Idle", targetState: "Run", priority: 1, codeFile: "body.esdl" },
				expected: ["Idle", "Run", "1", "body.esdl"],
			},
			{
				operation: "set-transition-action-esdl",
				fields: { sourceState: "Idle", targetState: "Run", priority: 1, codeFile: "body.esdl" },
				expected: ["Idle", "Run", "1", "body.esdl"],
			},
			{
				operation: "bind-transition-condition-method",
				fields: { sourceState: "Idle", targetState: "Run", priority: 1, methodName: "canRun" },
				expected: ["Idle", "Run", "1", "canRun"],
			},
			{
				operation: "bind-transition-action-method",
				fields: { sourceState: "Idle", targetState: "Run", priority: 1, methodName: "onRun" },
				expected: ["Idle", "Run", "1", "onRun"],
			},
			{ operation: "set-start-state", fields: { stateName: "Idle" }, expected: ["Idle"] },
		] as const;
		for (const scenario of cases) {
			const args = buildSetStateMachineCodeArgs({
				stateMachinePath: "D/S",
				operation: scenario.operation,
				...scenario.fields,
			});
			assert.deepEqual(args.slice(4, -1), scenario.expected, scenario.operation);
		}
	});
});

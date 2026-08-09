import assert from "node:assert/strict";
import { test } from "node:test";
import { Value } from "typebox/value";
import { ascetApplyElementSpecParameters } from "./apply-element-spec.ts";
import {
	ascetElementRoleValues,
	ascetElementWriteContractMetadata,
	normalizeAscetElementSpec,
} from "./element-spec-contract.ts";
import { ascetSetElementDependencyParameters, buildSetElementDependencyArgs } from "./set-element-dependency.ts";

function providerElement() {
	return {
		role: "providerExportedParameter" as const,
		name: "P_Provider",
		modelType: "cont",
		unit: "",
		comment: "Provider output",
		calibration: false,
		range: { mode: "none" as const },
		data: { mode: "ascetDefault" as const },
		implementation: { mode: "ascetDefault" as const },
	};
}

function localDependentElement() {
	return {
		role: "localDependentParameter" as const,
		name: "P_Dependent",
		modelType: "cont",
		unit: "",
		comment: "Dependent local",
		calibration: false,
		range: { mode: "none" as const },
		implementation: { mode: "ascetDefault" as const },
	};
}

test("apply_element_spec standalone schema rejects unsupported write-control fields", () => {
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			componentPath: "DEMO/PID",
			intent: "create",
			elements: [],
			dryRun: true,
		}),
		false,
	);
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			componentPath: "DEMO/PID",
			intent: "create",
			elements: [],
			verifyReadback: true,
		}),
		false,
	);
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			componentPath: "DEMO/PID",
			intent: "create",
			elements: [],
			backupDir: "backup",
		}),
		false,
	);
});

test("set_element_dependency standalone schema rejects unknown fields and unsupported project targets", () => {
	assert.equal(
		Value.Check(ascetSetElementDependencyParameters, {
			targetPath: "DEMO/PID",
			elementName: "P_Effective",
			dependency: "dependent",
			unknownOption: true,
		}),
		false,
	);
	assert.equal(
		Value.Check(ascetSetElementDependencyParameters, {
			targetPath: "DEMO/PID",
			elementName: "P_Effective",
			dependency: "dependent",
			targetKind: "project",
		}),
		false,
	);
});

test("standalone write schemas continue accepting supported requests", () => {
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			componentPath: "DEMO/PID",
			intent: "create",
			elements: [{ role: "standardPrimitive", name: "P", kind: "parameter", modelType: "cont", scope: "local" }],
		}),
		true,
	);
	assert.equal(
		Value.Check(ascetSetElementDependencyParameters, {
			targetPath: "DEMO/PID",
			elementName: "P_Effective",
			dependency: "dependent",
			dependencyFormula: "P_Input",
			dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
			variantPolicy: "default",
			targetKind: "component",
		}),
		true,
	);
});

test("apply_element_spec uses strict role-discriminated element schemas", () => {
	const validRoles = [
		{ role: "standardPrimitive", name: "P", kind: "parameter", modelType: "cont", scope: "local" },
		providerElement(),
		{ role: "consumerImportedParameter", name: "P_Imported", modelType: "cont" },
		localDependentElement(),
		{ role: "array", name: "A", kind: "array" },
		{ role: "enumeration", name: "E", kind: "enumeration", enumerationPath: "Types/State" },
		{ role: "table", name: "T", kind: "table", tableDimension: "1d" },
		{ role: "componentReference", name: "C", kind: "component", referencedComponentPath: "Provider" },
	];
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			componentPath: "DEMO/PID",
			intent: "create",
			elements: validRoles,
		}),
		true,
	);
	for (const invalidElement of [
		{ role: "providerExportedParameter", name: "P", modelType: "cont" },
		{ role: "localDependentParameter", name: "P", modelType: "cont" },
		{ role: "consumerImportedParameter", name: "P", modelType: "cont", data: { value: 1 } },
		{ role: "consumerImportedParameter", name: "P", modelType: "cont", impl: { valueType: "sint16" } },
		{ role: "consumerImportedParameter", name: "P", modelType: "cont", physicalRange: { min: 0, max: 1 } },
		{ role: "consumerImportedParameter", name: "P", modelType: "cont", calibration: true },
		{ role: "consumerImportedParameter", name: "P", modelType: "cont", dependency: { formula: "P" } },
		{ role: "localDependentParameter", name: "P", modelType: "cont", data: { value: 1 } },
	]) {
		assert.equal(
			Value.Check(ascetApplyElementSpecParameters, {
				action: "apply_element_spec",
				componentPath: "DEMO/PID",
				intent: "create",
				elements: [invalidElement],
			}),
			false,
		);
	}
});

test("normalizes explicit Provider and Local parameter decisions to the backend contract", () => {
	const normalized = normalizeAscetElementSpec(
		"create",
		[
			{
				...providerElement(),
				range: { mode: "physical", min: 0, max: 100 },
				data: { mode: "explicit", value: 1 },
				implementation: {
					mode: "explicit",
					valueType: "real64",
					memoryLocation: "Default",
					formula: "",
					limitAssignments: null,
				},
			},
			localDependentElement(),
		],
		[],
	);
	assert.deepEqual(normalized.spec.elements[0], {
		name: "P_Provider",
		kind: "parameter",
		modelType: "cont",
		scope: "exported",
		unit: "",
		comment: "Provider output",
		calibration: false,
		physicalRange: { min: 0, max: 100 },
		data: { value: 1 },
		impl: { valueType: "real64", memoryLocation: "Default" },
	});
	assert.deepEqual(normalized.spec.elements[1], {
		name: "P_Dependent",
		kind: "parameter",
		modelType: "cont",
		scope: "local",
		unit: "",
		comment: "Dependent local",
		calibration: false,
	});
	assert.ok(normalized.warnings.some((warning) => warning.includes("implementation.mode=ascetDefault")));
});

test("apply_element_spec commit is planId-only and patch accepts partial fields", () => {
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			phase: "commit",
			planId: "plan-1",
		}),
		true,
	);
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			componentPath: "DEMO/PID",
			intent: "create",
			elements: [],
			dataTarget: { mode: "named", name: "NotSupported" },
		}),
		false,
	);
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			intent: "patch",
			componentPath: "DEMO/PID",
			elements: [{ name: "P", comment: "Updated" }],
		}),
		true,
	);
	assert.equal(
		Value.Check(ascetApplyElementSpecParameters, {
			action: "apply_element_spec",
			intent: "patch",
			componentPath: "DEMO/PID",
			elements: [{ role: "consumerImportedParameter", name: "P", data: { value: 1 } }],
		}),
		false,
	);
});

test("normalization aggregates semantic blockers across multiple elements", () => {
	assert.throws(
		() =>
			normalizeAscetElementSpec(
				"patch",
				[
					{ name: "Imported", data: { value: 1 } },
					{ name: "Missing", comment: "not present" },
				],
				[{ name: "Imported", kind: "parameter", modelType: "cont", scope: "imported" }],
			),
		(error: Error) =>
			error.message.includes("Imported: consumerImportedParameter forbids 'data'.") &&
			error.message.includes("Element 'Missing' does not exist; patch is not allowed."),
	);
});

test("set_element_dependency encodes explicit per-DataVariant mappings", () => {
	const args = buildSetElementDependencyArgs({
		targetPath: "DEMO/PID",
		elementName: "P_Effective",
		dependency: "dependent",
		dependencyFormula: "Gain",
		variantPolicy: "selected",
		variants: ["Nominal", "Sport"],
		variantMappings: {
			Nominal: { Gain: { kind: "constant", name: "C_Gain_Nominal" } },
			Sport: { Gain: { kind: "systemConstant", name: "SC_Gain_Sport" } },
		},
	});
	assert.equal(args.includes("Nominal:Gain=constant:C_Gain_Nominal"), true);
	assert.equal(args.includes("Sport:Gain=systemConstant:SC_Gain_Sport"), true);
});

test("set_element_dependency supports deterministic autoExactName with explicit formals", () => {
	const params = {
		targetPath: "DEMO/PID",
		elementName: "P_Effective",
		dependency: "dependent" as const,
		dependencyFormula: "max(A,B) * 1e-3",
		dependencyFormals: ["A", "B"],
		bindingPolicy: "autoExactName" as const,
		variantPolicy: "default" as const,
	};
	assert.equal(Value.Check(ascetSetElementDependencyParameters, params), true);
	const args = buildSetElementDependencyArgs(params);
	assert.ok(args.includes("A=A"));
	assert.ok(args.includes("B=B"));
	assert.equal(
		args.some((arg) => arg.includes("max=max") || arg.includes("e=e")),
		false,
	);
});
test("generated Element contract metadata is the runtime source for roles and normalized fields", () => {
	assert.deepEqual(
		ascetElementWriteContractMetadata.roles,
		Object.fromEntries(ascetElementRoleValues.map((role) => [role, ascetElementWriteContractMetadata.roles[role]])),
	);
	assert.equal(
		(ascetElementWriteContractMetadata.fields.normalizedElement as readonly string[]).includes(
			"configurationProvenance",
		),
		false,
	);
	assert.ok(ascetElementWriteContractMetadata.fields.element.includes("configurationProvenance"));
});

test("dependency overlay specs are internal-only and encoded for composite preflight", () => {
	const params = {
		targetPath: "DEMO/Consumer",
		elementName: "P_Result",
		dependency: "dependent" as const,
		dependencyFormula: "P_Input",
		dependencyMappings: { P_Input: { kind: "parameter" as const, name: "P_Input" } },
		variantPolicy: "default" as const,
		dryRun: true,
		overlaySpecFiles: ["consumer.json", "local.json"],
	};
	assert.equal(Value.Check(ascetSetElementDependencyParameters, params), false);
	const args = buildSetElementDependencyArgs(params);
	assert.deepEqual(
		args.filter((_arg, index) => args[index - 1] === "--overlay-spec"),
		["consumer.json", "local.json"],
	);
});

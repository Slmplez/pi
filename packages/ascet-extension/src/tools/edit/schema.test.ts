import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { ascetEditParameters } from "./schema.ts";

describe("ascet_edit schema", () => {
	test("uses action-specific schemas so unrelated parameters are not exposed", () => {
		const schemas = getActionSchemas();

		assert.ok(schemaFor(schemas, "set_method_code")?.properties?.componentPath);
		assert.ok(schemaFor(schemas, "set_method_code")?.properties?.methodName);
		assert.ok(schemaFor(schemas, "set_method_code")?.properties?.code);
		assert.equal(schemaFor(schemas, "set_method_code")?.properties?.folderPath, undefined);
		assert.equal(schemaFor(schemas, "set_method_code")?.properties?.enumerators, undefined);
		assert.equal(schemaFor(schemas, "set_method_code")?.properties?.specFile, undefined);

		assert.ok(schemaFor(schemas, "create_folder")?.properties?.folderPath);
		assert.equal(schemaFor(schemas, "create_folder")?.properties?.componentPath, undefined);
		assert.equal(schemaFor(schemas, "create_folder")?.properties?.methodName, undefined);

		assert.equal(schemaFor(schemas, "set_element_dependency"), undefined);
		assert.equal(schemaFor(schemas, "set_dependent_chain"), undefined);
		assert.ok(schemaFor(schemas, "create_dependent_chain")?.properties?.provider);
		assert.ok(schemaFor(schemas, "create_dependent_chain")?.properties?.consumer);
		assert.ok(schemaFor(schemas, "create_dependent_chain")?.properties?.binding);
		assert.ok(schemaFor(schemas, "create_dependent_chain")?.properties?.intent);
	});
});

function getActionSchemas(): Array<{ properties?: Record<string, unknown> }> {
	return (ascetEditParameters as { anyOf?: Array<{ properties?: Record<string, unknown> }> }).anyOf ?? [];
}

function schemaFor(
	schemas: Array<{ properties?: Record<string, unknown> }>,
	action: string,
): { properties?: Record<string, unknown> } | undefined {
	return schemas.find((entry) => actionName(entry.properties?.action) === action);
}

function actionName(schema: unknown): string | undefined {
	if (schema === null || typeof schema !== "object") {
		return undefined;
	}
	const action = schema as { const?: string; enum?: unknown[] };
	if (typeof action.const === "string") {
		return action.const;
	}
	return Array.isArray(action.enum) && typeof action.enum[0] === "string" ? action.enum[0] : undefined;
}

test("does not expose the internal set_element_dependency backend", () => {
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "set_element_dependency",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_K",
			dependency: "dependent",
			intent: "apply",
		}),
		false,
	);
});

test("requires one-call apply_element_spec intent and rejects plan/commit controls", () => {
	for (const elementIntent of ["create", "patch", "upsert", "restore"] as const) {
		assert.equal(
			Value.Check(ascetEditParameters, {
				action: "apply_element_spec",
				componentPath: "FeatureA\\Consumer",
				elementIntent,
				elements: [],
				intent: "preview",
			}),
			true,
		);
	}
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "apply_element_spec",
			phase: "commit",
			planId: "plan-1",
			intent: "apply",
		}),
		false,
	);
});
test("accepts create_dependent_chain and rejects retired or incomplete requests", () => {
	const params = {
		action: "create_dependent_chain",
		provider: {
			componentPath: "FeatureA\\Provider",
			element: {
				name: "P_Threshold",
				modelType: "cont",
				unit: "",
				comment: "",
				calibration: false,
				range: { mode: "none" },
				data: { mode: "ascetDefault" },
				implementation: { mode: "ascetDefault" },
			},
		},
		consumer: {
			componentPath: "FeatureA\\Consumer",
			importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
			localElement: {
				name: "C_Threshold",
				modelType: "cont",
				unit: "",
				comment: "",
				calibration: false,
				range: { mode: "none" },
				implementation: { mode: "ascetDefault" },
			},
		},
		binding: { formula: "P_Threshold", formal: "P_Threshold", variantPolicy: "default" },
		intent: "preview",
	} as const;
	assert.equal(Value.Check(ascetEditParameters, params), true);
	assert.equal(Value.Check(ascetEditParameters, { ...params, formals: ["P_Threshold"] }), false);
	assert.equal(Value.Check(ascetEditParameters, { ...params, intent: "commit" }), false);
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "set_dependent_chain",
			componentPath: "FeatureA\\Consumer",
			dependentElement: "C_Threshold",
			intent: "preview",
		}),
		false,
	);
});

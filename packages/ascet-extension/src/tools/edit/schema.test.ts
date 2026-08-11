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

		assert.ok(schemaFor(schemas, "set_element_dependency")?.properties?.elementName);
		assert.ok(schemaFor(schemas, "set_element_dependency")?.properties?.dependency);
		assert.ok(schemaFor(schemas, "set_element_dependency")?.properties?.executeWrite);
		assert.equal(schemaFor(schemas, "set_element_dependency")?.properties?.code, undefined);
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

test("accepts public set_element_dependency plan and commit controls", () => {
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "set_element_dependency",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_K",
			dependency: "dependent",
			executeWrite: false,
		}),
		true,
	);
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "set_element_dependency",
			phase: "plan",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_K",
			dependency: "dependent",
			executeWrite: false,
		}),
		true,
	);
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "set_element_dependency",
			phase: "commit",
			planId: "plan-1",
			executeWrite: true,
		}),
		true,
	);
});

test("accepts public apply_element_spec plan and commit controls", () => {
	for (const intent of ["create", "patch", "upsert", "restore"] as const) {
		assert.equal(
			Value.Check(ascetEditParameters, {
				action: "apply_element_spec",
				phase: "plan",
				componentPath: "FeatureA\\Consumer",
				intent,
				elements: [],
				executeWrite: false,
			}),
			true,
		);
	}
	assert.equal(
		Value.Check(ascetEditParameters, {
			action: "apply_element_spec",
			phase: "commit",
			planId: "plan-1",
			executeWrite: true,
		}),
		true,
	);
});

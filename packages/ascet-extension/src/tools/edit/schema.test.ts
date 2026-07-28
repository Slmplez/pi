import assert from "node:assert/strict";
import { describe, test } from "node:test";
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

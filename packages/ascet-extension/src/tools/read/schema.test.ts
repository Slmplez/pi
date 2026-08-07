import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type AscetReadParams, ascetReadParameters } from "./schema.ts";

describe("ascet_read schema", () => {
	test("does not expose generic discovery actions", () => {
		const actions = getActionLiterals();

		assert.ok(!actions.includes("read"));
		assert.ok(actions.includes("read_code"));
		assert.ok(!actions.includes("tree"));
		assert.ok(!actions.includes("elements"));
	});

	test("read_code supports practical detail levels", () => {
		const readCodeSchema = getActionSchema("read_code") as { properties?: Record<string, unknown> } | undefined;
		const properties = readCodeSchema?.properties ?? {};

		assert.ok(Object.hasOwn(properties, "detailLevel"));
		assert.ok(Object.hasOwn(properties, "componentPath"));
		assert.ok(Object.hasOwn(properties, "methodName"));

		const request: AscetReadParams = {
			action: "read_code",
			componentPath: "DEMO\\PID",
			methodName: "calc",
			section: "body",
			detailLevel: "full",
		};
		assert.equal(request.detailLevel, "full");
	});

	test("read_block_diagram is semantic-only and does not expose detailLevel", () => {
		const readBlockDiagramSchema = getActionSchema("read_block_diagram") as
			| { properties?: Record<string, unknown> }
			| undefined;
		const properties = readBlockDiagramSchema?.properties ?? {};

		assert.ok(Object.hasOwn(properties, "action"));
		assert.ok(Object.hasOwn(properties, "componentPath"));
		assert.ok(Object.hasOwn(properties, "diagramName"));
		assert.ok(Object.hasOwn(properties, "timeoutMs"));
		assert.ok(!Object.hasOwn(properties, "detailLevel"));

		const request: AscetReadParams = {
			action: "read_block_diagram",
			componentPath: "ETAS_SystemLib\\Memory\\AccumulatorEnabled",
			diagramName: "Main",
		};
		assert.equal(request.action, "read_block_diagram");
	});

	test("read_dependent_chain exposes only exact live-read targets", () => {
		const schema = getActionSchema("read_dependent_chain") as { properties?: Record<string, unknown> } | undefined;
		const properties = schema?.properties ?? {};

		assert.ok(Object.hasOwn(properties, "componentPath"));
		assert.ok(Object.hasOwn(properties, "dependentElement"));
		assert.ok(Object.hasOwn(properties, "exporterComponentPath"));
		assert.ok(!Object.hasOwn(properties, "providerScopePath"));
		assert.ok(!Object.hasOwn(properties, "maxCandidates"));
		assert.ok(!Object.hasOwn(properties, "fallback"));

		const request: AscetReadParams = {
			action: "read_dependent_chain",
			componentPath: "FeatureA\\Consumer",
			dependentElement: "C_K_Effective",
			exporterComponentPath: "FeatureA\\Provider",
		};
		assert.equal(request.action, "read_dependent_chain");
	});

	test("accepts read_element_dependency as a read action", () => {
		const actions = getActionLiterals();

		assert.ok(actions.includes("read_element_dependency"));
		const readElementDependencySchema = getActionSchema("read_element_dependency") as
			| { properties?: Record<string, unknown> }
			| undefined;
		const properties = readElementDependencySchema?.properties ?? {};
		assert.ok(Object.hasOwn(properties, "elementName"));
		assert.ok(!Object.hasOwn(properties, "methodName"));

		const request: AscetReadParams = {
			action: "read_element_dependency",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_K_Effective",
			targetKind: "component",
		};
		assert.equal(request.action, "read_element_dependency");
	});

	test("exposes bounded implementation traversal controls", () => {
		const schema = getActionSchema("read_implementation") as { properties?: Record<string, unknown> } | undefined;
		const properties = schema?.properties ?? {};
		assert.ok(Object.hasOwn(properties, "detailLevel"));
		assert.ok(Object.hasOwn(properties, "maxDepth"));
		assert.ok(Object.hasOwn(properties, "maxElements"));
		assert.ok(Object.hasOwn(properties, "timeoutMs"));
	});
});

function getActionLiterals(): string[] {
	const anyOf =
		(ascetReadParameters as { anyOf?: Array<{ properties?: { action?: { const?: string; enum?: unknown[] } } }> })
			.anyOf ?? [];
	return anyOf
		.map((entry) => actionName(entry.properties?.action))
		.filter((value): value is string => typeof value === "string");
}

function getActionSchema(action: string): unknown {
	const anyOf =
		(ascetReadParameters as { anyOf?: Array<{ properties?: { action?: { const?: string; enum?: unknown[] } } }> })
			.anyOf ?? [];
	return anyOf.find((entry) => actionName(entry.properties?.action) === action);
}

function actionName(schema: { const?: string; enum?: unknown[] } | undefined): string | undefined {
	if (typeof schema?.const === "string") {
		return schema.const;
	}
	return Array.isArray(schema?.enum) && typeof schema.enum[0] === "string" ? schema.enum[0] : undefined;
}

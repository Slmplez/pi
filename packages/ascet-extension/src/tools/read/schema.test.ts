import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { type AscetReadParams, ascetReadParameters } from "./schema.ts";

describe("ascet_read schema", () => {
	test("read_block_diagram is semantic-only and does not expose detailLevel", () => {
		const properties = (ascetReadParameters as { properties?: Record<string, unknown> }).properties ?? {};

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

	test("accepts read_element_dependency as a read action", () => {
		const actionSchema = (ascetReadParameters as { properties?: { action?: { anyOf?: Array<{ const?: string }> } } })
			.properties?.action;
		const actions = actionSchema?.anyOf?.map((entry) => entry.const) ?? [];

		assert.ok(actions.includes("read_element_dependency"));

		const request: AscetReadParams = {
			action: "read_element_dependency",
			targetPath: "FeatureA\\Consumer",
			elementName: "C_K_Effective",
			targetKind: "component",
		};
		assert.equal(request.action, "read_element_dependency");
	});
});

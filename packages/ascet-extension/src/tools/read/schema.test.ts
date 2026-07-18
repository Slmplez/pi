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
});

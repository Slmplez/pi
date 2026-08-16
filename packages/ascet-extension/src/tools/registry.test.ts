import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { allAscetToolNames, allAscetTools, canonicalAscetToolNames, hiddenAscetTools } from "./registry.ts";

function hasConst(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.some(hasConst);
	}
	if (value === null || typeof value !== "object") {
		return false;
	}
	return Object.hasOwn(value, "const") || Object.values(value).some(hasConst);
}

describe("ASCET tool registry", () => {
	test("keeps batch write hidden from canonical public tools", () => {
		assert.equal(canonicalAscetToolNames.includes("ascet_batch_write" as never), false);
		assert.deepEqual(
			hiddenAscetTools.map((tool) => tool.name),
			["ascet_batch_write"],
		);
	});

	test("does not register retired P0 discovery tools", () => {
		for (const name of ["ascet_index", "ascet_explore", "ascet_verify"] as const) {
			assert.equal(canonicalAscetToolNames.includes(name as never), false, `${name} must not be canonical`);
			assert.equal(allAscetToolNames.includes(name as never), false, `${name} must not be registered`);
		}
	});

	test("exposes OpenAI-compatible object schemas for all ASCET tools", () => {
		for (const tool of allAscetTools) {
			const schema = tool.parameters as { type?: unknown };
			assert.equal(schema.type, "object", `${tool.name} parameters must have root type=object`);
			assert.equal(hasConst(schema), false, `${tool.name} parameters must use enum instead of const`);
		}
	});
});

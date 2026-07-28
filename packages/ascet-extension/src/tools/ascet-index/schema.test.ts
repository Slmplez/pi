import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ascetIndexParameters } from "./schema.ts";

function hasConst(value: unknown): boolean {
	if (Array.isArray(value)) {
		return value.some(hasConst);
	}
	if (value === null || typeof value !== "object") {
		return false;
	}
	return Object.hasOwn(value, "const") || Object.values(value).some(hasConst);
}

describe("ascet_index schema", () => {
	test("is OpenAI-compatible object union", () => {
		const schema = ascetIndexParameters as { type?: unknown; anyOf?: unknown };
		assert.equal(schema.type, "object");
		assert.equal(Array.isArray(schema.anyOf), true);
		assert.equal(hasConst(schema), false);
	});
});

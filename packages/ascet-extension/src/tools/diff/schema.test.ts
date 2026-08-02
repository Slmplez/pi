import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ascetDiffParameters } from "./schema.ts";

describe("ascet_diff schema", () => {
	test("exposes a bounded timeout for method diffs", () => {
		const properties = (ascetDiffParameters as { properties?: Record<string, unknown> }).properties ?? {};
		assert.ok(Object.hasOwn(properties, "timeoutMs"));
	});
});

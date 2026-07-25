import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { canonicalAscetToolNames, hiddenAscetTools } from "./registry.ts";

describe("ASCET tool registry", () => {
	test("keeps batch write hidden from canonical public tools", () => {
		assert.equal(canonicalAscetToolNames.includes("ascet_batch_write" as never), false);
		assert.deepEqual(
			hiddenAscetTools.map((tool) => tool.name),
			["ascet_batch_write"],
		);
	});
});

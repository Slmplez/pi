import assert from "node:assert/strict";
import test from "node:test";
import { buildVerifyReadbackArgs } from "./verify-readback.ts";

test("routes project formula readback through get_formulas", () => {
	assert.deepEqual(
		buildVerifyReadbackArgs({ action: "readback", objectKind: "project", projectPath: "Demo\\Project" }),
		["exec", "get_formulas", "--request-json", JSON.stringify({ path: "Demo\\Project" }), "--json"],
	);
});

test("keeps component readback on the exact component summary operation", () => {
	assert.deepEqual(
		buildVerifyReadbackArgs({ action: "readback", objectKind: "module", componentPath: "Demo\\Module" }),
		["exec", "read_component_summary", "Demo\\Module", "--json"],
	);
});

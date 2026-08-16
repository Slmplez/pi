import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { ascetGetParameters } from "./schema.ts";

describe("ascet_get public schema", () => {
	test("exposes only tree and formulas", () => {
		assert.equal(Value.Check(ascetGetParameters, { action: "tree" }), true);
		assert.equal(Value.Check(ascetGetParameters, { action: "formulas", path: "DEMO\\Project" }), true);
		for (const action of [
			"database_identity",
			"database_catalog",
			"elements",
			"component_refs",
			"bde_edges",
			"import_binding",
			"dbitem_refs",
		]) {
			assert.equal(Value.Check(ascetGetParameters, { action }), false, action);
		}
	});

	test("tree accepts only optional path and depth 1 through 5", () => {
		assert.equal(
			Value.Check(ascetGetParameters, { action: "tree", path: "PlatformLibrary\\Package", depth: 2 }),
			true,
		);
		assert.equal(Value.Check(ascetGetParameters, { action: "tree", depth: 0 }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "tree", depth: 6 }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "tree", traversal: { depth: 2 } }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "tree", delivery: "inline" }), false);
	});

	test("formulas requires an exact path and accepts an optional name", () => {
		assert.equal(Value.Check(ascetGetParameters, { action: "formulas" }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "formulas", path: "" }), false);
		assert.equal(
			Value.Check(ascetGetParameters, { action: "formulas", path: "DEMO\\Project", name: "VehicleMass" }),
			true,
		);
		assert.equal(
			Value.Check(ascetGetParameters, {
				action: "formulas",
				path: "DEMO\\Project",
				formulaName: "VehicleMass",
			}),
			false,
		);
	});
});

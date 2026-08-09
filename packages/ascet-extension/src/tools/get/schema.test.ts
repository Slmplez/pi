import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { ascetGetParameters } from "../../get.ts";

describe("ascet_get schema", () => {
	test("requires a non-empty target for scoped actions", () => {
		assert.equal(Value.Check(ascetGetParameters, { action: "elements" }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "elements", target: {} }), false);
		assert.equal(Value.Check(ascetGetParameters, { action: "dbitem_refs", target: {} }), false);
		assert.equal(
			Value.Check(ascetGetParameters, {
				action: "elements",
				target: { targetPathPrefix: "DEMO" },
			}),
			true,
		);
	});

	test("requires an identified import provider", () => {
		assert.equal(
			Value.Check(ascetGetParameters, {
				action: "import_binding",
				target: { path: "DEMO\\PID" },
				elementName: "P",
				provider: {},
			}),
			false,
		);
		assert.equal(
			Value.Check(ascetGetParameters, {
				action: "import_binding",
				target: { path: "DEMO\\PID" },
				elementName: "P",
				provider: { oid: "provider-1" },
			}),
			true,
		);
	});

	test("allows tree without a target", () => {
		assert.equal(Value.Check(ascetGetParameters, { action: "tree" }), true);
	});
	test("uses an independent database_catalog schema branch", () => {
		const valid = {
			action: "database_catalog",
			sourceTreeResultId: "obs-tree-full",
			include: ["module"],
			messageDepth: 0,
			delivery: "stored",
		};
		assert.equal(Value.Check(ascetGetParameters, valid), true);
		assert.equal(Value.Check(ascetGetParameters, { ...valid, include: [] }), false);
		assert.equal(Value.Check(ascetGetParameters, { ...valid, include: ["module", "module"] }), false);
		assert.equal(Value.Check(ascetGetParameters, { ...valid, messageDepth: -1 }), false);
		assert.equal(Value.Check(ascetGetParameters, { ...valid, messageDepth: 1.5 }), false);
		assert.equal(Value.Check(ascetGetParameters, { ...valid, target: { path: "DB" } }), false);
		assert.equal(
			Value.Check(ascetGetParameters, { action: "database_catalog", sourceTreeResultId: "obs-tree-full" }),
			false,
		);
	});
});

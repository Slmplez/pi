import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { normalizeAscetIndexAreas, planAscetIndexAreas } from "./area-mapping.ts";

describe("ASCET index area mapping", () => {
	test("normalizes duplicate areas and defaults to p0", () => {
		assert.deepEqual(normalizeAscetIndexAreas(undefined), ["p0"]);
		assert.deepEqual(normalizeAscetIndexAreas(["elements", "elements", "code"]), ["elements", "code"]);
		assert.deepEqual(normalizeAscetIndexAreas(["elements", "p0", "code"]), ["p0"]);
	});

	test("maps elements and code to independent refresh partitions and SQLite areas", () => {
		const plan = planAscetIndexAreas(["elements", "code"]);
		assert.deepEqual(plan.requestedAreas, ["elements", "code"]);
		assert.deepEqual(plan.effectivePartitions, ["element_decls", "text_code"]);
		assert.deepEqual(plan.sqliteAreas, ["elements", "code_blocks", "code_terms"]);
		assert.equal(plan.includeTextCode, true);
		assert.equal(plan.requiresP0, false);
	});

	test("maps tree and project to dedicated refresh partitions", () => {
		const plan = planAscetIndexAreas(["tree", "project"]);
		assert.deepEqual(plan.effectivePartitions, ["tree", "project"]);
		assert.equal(plan.requiresP0, false);
		assert.equal(plan.sqliteAreas.includes("folders"), true);
		assert.equal(plan.sqliteAreas.includes("project_items"), true);
		assert.equal(plan.sqliteAreas.includes("code_terms"), false);
	});

	test("maps refs to component and element reference partitions plus dependency SQLite area", () => {
		const plan = planAscetIndexAreas(["refs"]);
		assert.deepEqual(plan.effectivePartitions, ["refs"]);
		assert.deepEqual(plan.sqliteAreas, ["component_refs", "element_refs", "dbitem_dependencies"]);
	});

	test("rejects unknown areas", () => {
		assert.throws(() => planAscetIndexAreas(["diagram_metadata"]), /Unsupported ASCET index area/);
	});
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { searchActionCatalog } from "./search.ts";

describe("ASCET action catalog lookup", () => {
	test("supports exact ascet_get action id lookup", () => {
		const result = searchActionCatalog({ query: "ascet_get.tree" });

		assert.equal(result.total, 1);
		assert.equal(result.catalogVersion, 1);
		assert.ok(result.catalogFingerprint.length > 0);
		assert.equal(result.items[0]?.tool, "ascet_get");
		assert.equal(result.items[0]?.action, "tree");
		assert.equal(result.items[0]?.result?.shape, "observation");
		assert.ok((result.items[0]?.rules ?? []).length > 0);
		assert.ok((result.items[0]?.fewShots ?? []).length > 0);
	});

	test("supports exact ascet_get tool and action lookup", () => {
		const result = searchActionCatalog({ tool: "ascet_get", name: "elements" });

		assert.equal(result.total, 1);
		assert.equal(result.items[0]?.tool, "ascet_get");
		assert.equal(result.items[0]?.action, "elements");
		assert.equal(result.items[0]?.result?.shape, "observation");
	});

	test("semantic queries prefer bounded Get actions", () => {
		assert.equal(searchActionCatalog({ query: "folder tree", limit: 1 }).items[0]?.action, "tree");
		assert.equal(searchActionCatalog({ query: "element directory", limit: 1 }).items[0]?.action, "elements");
		assert.equal(searchActionCatalog({ query: "component references", limit: 1 }).items[0]?.action, "component_refs");
		assert.equal(searchActionCatalog({ query: "import binding", limit: 1 }).items[0]?.action, "import_binding");
	});

	test("summary detail omits full rules and fewShots", () => {
		const result = searchActionCatalog({ query: "ascet_get.elements", detailLevel: "summary" });

		assert.equal(result.items[0]?.tool, "ascet_get");
		assert.equal(result.items[0]?.rules, undefined);
		assert.equal(result.items[0]?.fewShots, undefined);
		assert.ok(result.items[0]?.schema);
		assert.ok(result.items[0]?.result);
	});
});

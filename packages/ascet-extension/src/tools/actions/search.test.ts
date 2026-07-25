import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { searchActionCatalog } from "./search.ts";

describe("ASCET action search", () => {
	test("supports exact action id lookup", () => {
		const result = searchActionCatalog({ query: "ascet_read.read_code" });

		assert.equal(result.total, 1);
		assert.equal(result.items[0]?.tool, "ascet_read");
		assert.equal(result.items[0]?.action, "read_code");
		assert.deepEqual(result.items[0]?.schema?.required, ["action", "componentPath"]);
		assert.equal(result.items[0]?.result?.shape, "codeText");
		assert.ok((result.items[0]?.rules ?? []).length > 0);
		assert.ok((result.items[0]?.fewShots ?? []).length > 0);
	});

	test("supports exact tool and name lookup", () => {
		const result = searchActionCatalog({ tool: "ascet_search", name: "text_in_code" });

		assert.equal(result.total, 1);
		assert.equal(result.items[0]?.tool, "ascet_search");
		assert.equal(result.items[0]?.action, "text_in_code");
		assert.equal(result.items[0]?.result?.shape, "textOccurrences");
	});

	test("semantic queries prefer the intended actions", () => {
		assert.equal(searchActionCatalog({ query: "complete code", limit: 1 }).items[0]?.action, "read_code");
		assert.equal(searchActionCatalog({ query: "code search", limit: 1 }).items[0]?.action, "text_in_code");
		assert.equal(searchActionCatalog({ query: "list diagrams", limit: 1 }).items[0]?.action, "list_diagrams");
		assert.equal(
			searchActionCatalog({ query: "read block diagram", limit: 1 }).items[0]?.action,
			"read_block_diagram",
		);
		assert.equal(
			searchActionCatalog({ query: "element declaration", limit: 1 }).items[0]?.action,
			"declarations_of_element",
		);
		assert.equal(
			searchActionCatalog({ query: "method declaration", limit: 1 }).items[0]?.action,
			"declarations_of_method_process",
		);
		assert.equal(
			searchActionCatalog({ query: "method local variables", limit: 1 }).items[0]?.action,
			"declarations_of_method_process_element",
		);
		assert.equal(
			searchActionCatalog({ query: "component reference", limit: 1 }).items[0]?.action,
			"references_to_component",
		);
		assert.equal(searchActionCatalog({ query: "element usage", limit: 1 }).items[0]?.action, "references_to_element");
		assert.equal(searchActionCatalog({ query: "write method code", limit: 1 }).items[0]?.action, "set_method_code");
		assert.equal(searchActionCatalog({ query: "verify write result", limit: 1 }).items[0]?.action, "readback");
	});

	test("hides internal actions unless requested", () => {
		const publicResult = searchActionCatalog({ query: "search_occurrences", includeHidden: false });
		const hiddenResult = searchActionCatalog({ query: "search_occurrences", includeHidden: true });

		assert.equal(
			publicResult.items.some((item) => item.action === "search_occurrences"),
			false,
		);
		assert.equal(hiddenResult.items[0]?.action, "search_occurrences");
		assert.equal(hiddenResult.items[0]?.replacement, "ascet_search.references_to_element");
	});

	test("summary detail omits full rules and fewShots", () => {
		const result = searchActionCatalog({ query: "ascet_read.read_code", detailLevel: "summary" });

		assert.equal(result.items[0]?.tool, "ascet_read");
		assert.equal(result.items[0]?.rules, undefined);
		assert.equal(result.items[0]?.fewShots, undefined);
		assert.ok(result.items[0]?.schema);
		assert.ok(result.items[0]?.result);
	});
});

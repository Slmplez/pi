import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { listActionCatalogEntries } from "./catalog.ts";

describe("ASCET action catalog", () => {
	test("has stable model-facing metadata for every public action", () => {
		const entries = listActionCatalogEntries();

		assert.ok(entries.length > 30);
		for (const entry of entries) {
			assert.equal(entry.visibility, "public");
			assert.equal(entry.id, `${entry.tool}.${entry.action}`);
			assert.ok(entry.family);
			assert.ok(entry.risk);
			assert.ok(entry.compact.length > 0);
			assert.ok(
				entry.miniFewShot.includes(`${entry.tool}(`),
				`${entry.id} miniFewShot must include ${entry.tool}(: ${entry.miniFewShot}`,
			);
			assert.ok(entry.intent.length > 0);
			assert.ok(entry.schema.required.length + entry.schema.optional.length > 0);
			assert.ok(entry.result.shape.length > 0);
			assert.ok(entry.result.fields.length > 0);
		}
	});

	test("keeps hidden and internal actions out of the public catalog", () => {
		const publicIds = listActionCatalogEntries().map((entry) => entry.id);
		const allIds = listActionCatalogEntries({ includeHidden: true }).map((entry) => entry.id);

		assert.equal(publicIds.includes("ascet_capabilities.search"), false);
		assert.equal(publicIds.includes("ascet_capabilities.activate_profile"), false);
		assert.equal(publicIds.includes("ascet_search.search_occurrences"), false);
		assert.equal(publicIds.includes("ascet_search.search_text_code"), false);
		assert.equal(allIds.includes("ascet_capabilities.search"), false);
		assert.equal(allIds.includes("ascet_capabilities.activate_profile"), false);
		assert.equal(allIds.includes("ascet_search.search_occurrences"), true);
		assert.equal(allIds.includes("ascet_batch_write.batch_set_method_code"), true);
	});

	test("defines the key distinction between live code read and code text search", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));

		assert.match(entries.get("ascet_read.read_code")?.compact ?? "", /complete live code/);
		assert.match(entries.get("ascet_read.read_code")?.avoidWhen.join("\n") ?? "", /global occurrence search/);
		assert.match(entries.get("ascet_search.text_in_code")?.compact ?? "", /snippets/);
		assert.match(entries.get("ascet_search.text_in_code")?.avoidWhen.join("\n") ?? "", /complete code body/);
	});

	test("defines dependency chain and dependency write boundaries", () => {
		const entries = new Map(listActionCatalogEntries().map((entry) => [entry.id, entry]));
		const readChain = entries.get("ascet_read.read_dependent_chain");
		const writeDependency = entries.get("ascet_edit.set_element_dependency");

		assert.match(readChain?.compact ?? "", /Live-mapping-first dependency provider resolver/);
		assert.match(readChain?.result.fields.join("\n") ?? "", /element\.data/);
		assert.match(readChain?.rules.join("\n") ?? "", /scope=Exported/);
		assert.match(writeDependency?.compact ?? "", /existing local parameter only/);
		assert.match(writeDependency?.rules.join("\n") ?? "", /does not create local, imported, or exported elements/);
		assert.match(writeDependency?.rules.join("\n") ?? "", /refreshes element_decls and full_element_cache/);
	});
});

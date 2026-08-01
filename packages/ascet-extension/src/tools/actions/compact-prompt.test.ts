import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildCompactActionGuide } from "./compact-prompt.ts";

describe("ASCET compact action guide", () => {
	test("injects compact public action descriptors and miniFewShots", () => {
		const text = buildCompactActionGuide().join("\n");

		assert.match(text, /ASCET action guide/);
		assert.match(text, /search_actions/);
		assert.match(text, /ascet_read\.read_code: read complete live code/);
		assert.match(text, /ascet_read\(\{action:"read_code"/);
		assert.match(text, /ascet_read\.read_dependent_chain: Live-mapping-first dependency provider resolver/);
		assert.match(text, /ascet_search\.text_in_code: search indexed ESDL\/C snippets/);
		assert.match(text, /ascet_search\(\{action:"text_in_code"/);
		assert.match(
			text,
			/ascet_edit\.set_element_dependency: set dependency flag\/formula on an existing local parameter only/,
		);
	});

	test("does not expose hidden or internal actions by default", () => {
		const text = buildCompactActionGuide().join("\n");

		assert.doesNotMatch(text, /\bsearch_occurrences\b/);
		assert.doesNotMatch(text, /\bsearch_text_code\b/);
		assert.doesNotMatch(text, /\bascet_batch_write\b/);
	});
});

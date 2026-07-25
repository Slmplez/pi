import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	formatQuickSearchUiMappingGuidelines,
	getAscetQuickSearchUiMapping,
	listAscetQuickSearchUiMappings,
} from "./quick-search-ui-mapping.ts";

describe("ASCET Component Manager quick-search UI mapping", () => {
	test("covers every known dropdown mode with an indexed path or explicit API fallback", () => {
		const mappings = listAscetQuickSearchUiMappings();
		const modes = mappings.map((mapping) => mapping.mode);

		assert.deepEqual(modes, [
			"components",
			"declarations_of_component",
			"references_to_component",
			"declarations_of_method_process",
			"references_to_method_process",
			"declarations_of_method_process_element",
			"declarations_of_element",
			"references_to_element",
			"senders_of_message",
			"receivers_of_message",
			"text_in_esdl_or_c_code",
		]);
		assert.equal(
			mappings.every((mapping) => mapping.coverage === "index" || mapping.coverage === "api_fallback"),
			true,
		);
	});

	test("routes declarations to the warmed index where the current index can serve them", () => {
		assert.deepEqual(getAscetQuickSearchUiMapping("components")?.preferredAction, {
			tool: "ascet_search",
			action: "search_components",
			indexFastPath: true,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("declarations_of_component")?.preferredAction, {
			tool: "ascet_search",
			action: "search_components",
			indexFastPath: true,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("declarations_of_element")?.preferredAction, {
			tool: "ascet_search",
			action: "declarations_of_element",
			indexFastPath: true,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("declarations_of_method_process")?.preferredAction, {
			tool: "ascet_search",
			action: "declarations_of_method_process",
			indexFastPath: true,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("declarations_of_method_process_element")?.preferredAction, {
			tool: "ascet_search",
			action: "declarations_of_method_process_element",
			indexFastPath: true,
		});
	});

	test("routes references and message direction to public search fallback actions", () => {
		assert.deepEqual(getAscetQuickSearchUiMapping("references_to_component")?.preferredAction, {
			tool: "ascet_search",
			action: "references_to_component",
			indexFastPath: false,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("references_to_element")?.preferredAction, {
			tool: "ascet_search",
			action: "references_to_element",
			indexFastPath: false,
		});
		assert.equal(getAscetQuickSearchUiMapping("senders_of_message")?.preferredAction.action, "senders_of_message");
		assert.equal(
			getAscetQuickSearchUiMapping("receivers_of_message")?.preferredAction.action,
			"receivers_of_message",
		);
		assert.equal(getAscetQuickSearchUiMapping("senders_of_message")?.fallbackReason.includes("direction"), true);
		assert.equal(getAscetQuickSearchUiMapping("receivers_of_message")?.fallbackReason.includes("direction"), true);
	});

	test("routes code text to the warmed text-code index with scoped fallback", () => {
		assert.deepEqual(getAscetQuickSearchUiMapping("text_in_esdl_or_c_code")?.preferredAction, {
			tool: "ascet_search",
			action: "text_in_code",
			indexFastPath: true,
		});
		assert.deepEqual(getAscetQuickSearchUiMapping("text_in_esdl_or_c_code")?.requiredContext, []);
	});

	test("formats model-facing guidelines from the mapping contract", () => {
		const guidelines = formatQuickSearchUiMappingGuidelines();

		assert.equal(
			guidelines.some((line) => line.includes("Component Manager quick search")),
			true,
		);
		assert.equal(
			guidelines.some((line) => line.includes("Declarations of element")),
			true,
		);
		assert.equal(
			guidelines.some((line) => line.includes("References to element")),
			true,
		);
		assert.equal(
			guidelines.some((line) => line.includes("Text in ESDL or C code")),
			true,
		);
	});
});

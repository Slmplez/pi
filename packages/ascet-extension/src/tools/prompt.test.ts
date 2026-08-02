import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ascetActionExamples, compactExamplesForTool } from "./_shared/action-examples.ts";
import { ascetCapabilitiesPrompt } from "./capabilities/prompt.ts";
import { ascetEditPrompt } from "./edit/prompt.ts";
import { ascetExplorePrompt } from "./explore/prompt.ts";
import {
	actionInstructionIds,
	buildToolPromptGuidelines,
	findActionInstructions,
	getActionInstruction,
} from "./instructions/registry.ts";
import { ascetReadPrompt } from "./read/prompt.ts";
import { ascetSearchPrompt } from "./search/prompt.ts";

function guidelineText(prompt: { promptGuidelines: readonly string[] }): string {
	return prompt.promptGuidelines.join("\n");
}

describe("ASCET prompt coordination", () => {
	test("guides recursive exported-parameter provider discovery", () => {
		const read = guidelineText(ascetReadPrompt);
		const search = guidelineText(ascetSearchPrompt);
		const explore = guidelineText(ascetExplorePrompt);

		assert.match(read, /Live-mapping-first/);
		assert.match(read, /element_decls/);
		assert.match(read, /live element catalog/);
		assert.match(read, /scope=Exported/);
		assert.match(read, /same-named Exported Parameter/);
		assert.match(search, /_Calibration/);
		assert.match(search, /_Constant/);
		assert.match(search, /Imported Parameter and Exported Parameter must be same-named/);
		assert.match(explore, /list_components recursively/);
	});

	test("requires exported-provider evidence before dependent local writes", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(write, /resolve the authoritative same-named Exported Parameter provider/);
		assert.match(write, /Do not bind to a provider candidate unless the matching element is scope=Exported/);
		assert.match(write, /Imported Parameter and Exported Parameter must have the same name/);
		assert.match(write, /align metadata from the Exported Parameter, not from the Imported Parameter/);
		assert.match(write, /does not create local, imported, or exported elements/);
		assert.match(write, /full_element_cache/);
	});

	test("makes code semantics primary for element-spec generation", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(write, /element's code role and explicit requirements/);
		assert.match(write, /semantic intent drives the target spec/);
		assert.match(write, /live reads as compatibility and preservation evidence/);
		assert.match(write, /Do not copy a sibling element's values unless semantic equivalence is established/);
		assert.match(write, /ascet_read\.read_code/);
	});

	test("deduplicates ASCET edit prompt rules and few-shots", () => {
		assert.equal(new Set(ascetEditPrompt.promptGuidelines).size, ascetEditPrompt.promptGuidelines.length);
	});

	test("search prompt examples do not expose redesigned search_occurrences", () => {
		const search = guidelineText(ascetSearchPrompt);
		const examples = compactExamplesForTool("ascet_search").join("\n");

		assert.doesNotMatch(search, /\bsearch_occurrences\b/);
		assert.doesNotMatch(examples, /\bsearch_occurrences\b/);
		assert.equal(
			ascetActionExamples.some(
				(example) => example.tool === "ascet_search" && example.action === "search_occurrences",
			),
			false,
		);
	});

	test("action-level registry supports tool, action, profile, and tag lookup", () => {
		assert.deepEqual(actionInstructionIds({ tool: "ascet_search", action: "text_in_code" }), [
			"ascet_search.text_in_code",
		]);
		assert.equal(getActionInstruction("ascet_read.read_code")?.action, "read_code");
		assert.ok(
			findActionInstructions({ profile: "write-preflight", tags: ["provider-discovery"] }).some(
				(instruction) => instruction.id === "ascet_edit.set_element_dependency",
			),
		);
		assert.ok(
			findActionInstructions({ tool: "ascet_read", profile: "advanced-read" }).some(
				(instruction) => instruction.action === "read_block_diagram",
			),
		);
	});

	test("prompt assembly composes action instructions with tiny few-shots", () => {
		const textCode = buildToolPromptGuidelines({
			tool: "ascet_search",
			actions: ["text_in_code"],
			profile: "base",
		}).join("\n");
		const liveCode = buildToolPromptGuidelines({
			tool: "ascet_read",
			actions: ["read_code"],
			profile: "base",
		}).join("\n");

		assert.match(textCode, /Search indexed ESDL\/C snippets/);
		assert.match(textCode, /does not read complete code/);
		assert.match(textCode, /text_in_code: ascet_search/);
		assert.match(liveCode, /live ToolAPI read/);
		assert.match(liveCode, /read_code: ascet_read/);
	});

	test("capabilities prompt injects the compact ASCET action guide", () => {
		const capabilities = guidelineText(ascetCapabilitiesPrompt);

		assert.match(capabilities, /ASCET action guide/);
		assert.match(capabilities, /search_actions/);
		assert.match(capabilities, /ascet_read\.read_code: read complete live code/);
		assert.match(capabilities, /ascet_read\.read_dependent_chain: Live-mapping-first dependency provider resolver/);
		assert.match(capabilities, /ascet_search\.text_in_code: search indexed ESDL\/C snippets/);
		assert.doesNotMatch(capabilities, /\bactivate_profile\b/);
		assert.doesNotMatch(capabilities, /\boperationQuery\b/);
		assert.doesNotMatch(capabilities, /\bascet_batch_write\b/);
		assert.doesNotMatch(capabilities, /\bsearch_occurrences\b/);
	});

	test("hidden action and hidden tool instructions are excluded from public prompt assembly", () => {
		const publicSearch = buildToolPromptGuidelines({ tool: "ascet_search" }).join("\n");
		const publicBatch = buildToolPromptGuidelines({ tool: "ascet_batch_write", profile: "batch-write" }).join("\n");
		const hiddenSearch = buildToolPromptGuidelines({
			tool: "ascet_search",
			actions: ["search_occurrences"],
			includeHidden: true,
		}).join("\n");

		assert.doesNotMatch(publicSearch, /\bsearch_occurrences\b/);
		assert.equal(publicBatch, "");
		assert.match(hiddenSearch, /\bsearch_occurrences\b/);
		assert.equal(getActionInstruction("ascet_batch_write.batch_set_method_code"), undefined);
		assert.equal(
			getActionInstruction("ascet_batch_write.batch_set_method_code", { includeHidden: true })?.hidden,
			true,
		);
	});
});

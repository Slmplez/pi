import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { compactExamplesForTool } from "./_shared/action-examples.ts";
import { ascetCapabilitiesPrompt } from "./capabilities/prompt.ts";
import { ascetDiffPrompt } from "./diff/prompt.ts";
import { ascetEditPrompt } from "./edit/prompt.ts";
import { ascetGetPrompt } from "./get/prompt.ts";
import {
	actionInstructionIds,
	buildToolPromptGuidelines,
	findActionInstructions,
	getActionInstruction,
} from "./instructions/registry.ts";
import { ascetReadPrompt } from "./read/prompt.ts";
import { ascetSearchTool } from "./search/definition.ts";

const TOOL_PROMPT_BASELINE_CHARS = 38_257;

function guidelineText(prompt: { promptGuidelines: readonly string[] }): string {
	return prompt.promptGuidelines.join("\n");
}

function promptSize(prompt: { promptSnippet: string; promptGuidelines: readonly string[] }): number {
	return prompt.promptSnippet.length + guidelineText(prompt).length;
}

describe("ASCET prompt coordination", () => {
	test("keeps public family prompts compact and aligned with final tools", () => {
		const search = guidelineText(ascetSearchTool);
		const get = guidelineText(ascetGetPrompt);
		const read = guidelineText(ascetReadPrompt);
		const edit = guidelineText(ascetEditPrompt);

		assert.match(search, /hints, not complete metadata/);
		assert.match(get, /ascet_get\.tree/);
		assert.match(get, /ascet_get\.formulas/);
		assert.doesNotMatch(get, /ascet_get\.(elements|database_catalog|import_binding)/);
		assert.match(read, /ascet_read\.read_dependent_chain/);
		assert.match(edit, /ascet_edit\.create_dependent_chain/);
		assert.match(
			edit,
			/Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name>/,
		);
		assert.match(edit, /explicit implementation with valueType, memoryLocation, formula, and limitAssignments/);
		assert.match(
			edit,
			/ident needs no projectPath; another formula needs the matching Provider or Consumer projectPath/,
		);
		assert.match(edit, /formula="x", formal="x"/);
		assert.match(edit, /apply verifies readback/);
		assert.match(edit, /P_Threshold/);
		assert.doesNotMatch(
			edit,
			/<Provider Project containing ProviderFormula>|<Consumer Project containing LocalFormula>|<ProviderFormula>|<LocalFormula>/,
		);
		assert.doesNotMatch(edit, /ascetDefault is not supported for this action/);
		assert.match(edit, /ascet_edit\.set_element_dependency/);
		assert.doesNotMatch(edit, /configure_parameter_dependency_chain/);
	});

	test("keeps detailed dependency rules available on demand", () => {
		const write = buildToolPromptGuidelines({
			tool: "ascet_edit",
			actions: ["apply_element_spec", "create_dependent_chain"],
			includeExamples: false,
		}).join("\n");

		assert.match(write, /element's code role and explicit requirements/);
		assert.match(write, /Provider Exported Parameter creation/);
		assert.match(write, /limitAssignments=true.*limitAssignments=null/);
		assert.match(write, /provider\.projectPath.*consumer\.projectPath/);
		assert.match(write, /Do not add a mapping field/);
		assert.match(write, /Missing compatible endpoints are created/);
		assert.match(write, /automatic readback/);
		assert.doesNotMatch(write, /ascetDefault is not supported for this action/);
		assert.doesNotMatch(write, /verifyReadback=true/);

		const detailedExamples = buildToolPromptGuidelines({
			tool: "ascet_edit",
			actions: ["create_dependent_chain"],
			includeExamples: true,
		}).join("\n");
		assert.match(detailedExamples, /<Provider Project containing ProviderFormula>/);
		assert.match(detailedExamples, /<Consumer Project containing LocalFormula>/);
	});

	test("reduces default family prompt volume by at least 70 percent", () => {
		const total = [ascetGetPrompt, ascetReadPrompt, ascetDiffPrompt, ascetEditPrompt].reduce(
			(sum, prompt) => sum + promptSize(prompt),
			0,
		);

		assert.ok(total <= Math.floor(TOOL_PROMPT_BASELINE_CHARS * 0.3), `${total} > 70% reduction target`);
	});

	test("keeps dependency-chain examples on ascet_read and ascet_edit", () => {
		const readExamples = compactExamplesForTool("ascet_read").join("\n");
		const editExamples = compactExamplesForTool("ascet_edit").join("\n");

		assert.match(readExamples, /action:"read_dependent_chain"/);
		assert.match(editExamples, /action:"create_dependent_chain"/);
		assert.match(editExamples, /localElement:\{name:"C_Threshold"/);
		assert.doesNotMatch(editExamples, /configure_parameter_dependency_chain/);
	});

	test("deduplicates compact family prompts", () => {
		for (const prompt of [ascetGetPrompt, ascetReadPrompt, ascetDiffPrompt, ascetEditPrompt]) {
			assert.equal(new Set(prompt.promptGuidelines).size, prompt.promptGuidelines.length);
		}
	});

	test("Get examples cover only bounded tree and exact formulas", () => {
		const examples = compactExamplesForTool("ascet_get").join("\n");

		assert.match(examples, /action:"tree"/);
		assert.match(examples, /path:"PlatformLibrary\\\\Package"/);
		assert.match(examples, /action:"formulas"/);
		assert.doesNotMatch(examples, /action:"elements"|delivery:|resultId/);
	});

	test("action-level registry exposes the final dependency pair", () => {
		assert.deepEqual(actionInstructionIds({ tool: "ascet_get" }), ["ascet_get.tree", "ascet_get.formulas"]);
		assert.equal(getActionInstruction("ascet_read.read_code")?.action, "read_code");
		assert.deepEqual(actionInstructionIds({ tool: "configure_parameter_dependency_chain" }), []);
		assert.equal(getActionInstruction("ascet_edit.set_element_dependency")?.action, "set_element_dependency");
		assert.ok(
			findActionInstructions({ tool: "ascet_edit", action: "create_dependent_chain" }).some(
				(instruction) => instruction.id === "ascet_edit.create_dependent_chain",
			),
		);
	});

	test("capabilities prompt injects the compact action guide", () => {
		const capabilities = guidelineText(ascetCapabilitiesPrompt);

		assert.match(capabilities, /ASCET action guide/);
		assert.match(capabilities, /search_actions/);
		assert.match(capabilities, /ascet_search\.search/);
		assert.match(capabilities, /ascet_read\.read_code: read complete live code/);
		assert.doesNotMatch(capabilities, /\bascet_batch_write\b/);
	});

	test("public descriptor instructions exclude retired and hidden actions", () => {
		const publicGet = buildToolPromptGuidelines({ tool: "ascet_get", includeExamples: false }).join("\n");

		assert.match(publicGet, /ascet_get\.tree/);
		assert.match(publicGet, /ascet_get\.formulas/);
		assert.doesNotMatch(publicGet, /import_binding|database_catalog|elements/);
		assert.equal(getActionInstruction("ascet_batch_write.batch_set_method_code"), undefined);
		assert.equal(
			getActionInstruction("ascet_batch_write.batch_set_method_code", { includeHidden: true })?.hidden,
			true,
		);
	});
});

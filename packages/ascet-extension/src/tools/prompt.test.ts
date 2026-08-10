import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { configureParameterDependencyChainTool } from "../configure-parameter-dependency-chain.ts";
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

const TOOL_PROMPT_BASELINE_CHARS = 38_257;

function guidelineText(prompt: { promptGuidelines: readonly string[] }): string {
	return prompt.promptGuidelines.join("\n");
}

function promptSize(prompt: { promptSnippet: string; promptGuidelines: readonly string[] }): number {
	return prompt.promptSnippet.length + guidelineText(prompt).length;
}

describe("ASCET prompt coordination", () => {
	test("keeps family prompts compact and descriptor-generated", () => {
		const get = guidelineText(ascetGetPrompt);
		const read = guidelineText(ascetReadPrompt);
		const edit = guidelineText(ascetEditPrompt);

		assert.match(get, /ascet_get\.tree/);
		assert.match(get, /ascet_get\.elements/);
		assert.match(read, /ascet_read\.read_code/);
		assert.match(read, /ascet_read\.read_element/);
		assert.match(edit, /ascet_edit\.apply_element_spec/);
		assert.match(edit, /ascet_edit\.set_element_dependency/);
		assert.doesNotMatch(edit, /Provider Exported Parameter creation requires/);
	});

	test("keeps detailed action rules available on demand from descriptors", () => {
		const write = buildToolPromptGuidelines({
			tool: "ascet_edit",
			actions: ["apply_element_spec", "set_element_dependency"],
			includeExamples: false,
		}).join("\n");

		assert.match(write, /element's code role and explicit requirements/);
		assert.match(write, /Provider Exported Parameter creation/);
		assert.match(write, /Local Dependent Parameter creation/);
		assert.match(write, /Dependency mappings may target an existing Parameter, Constant, or System Constant/);
		assert.match(write, /dependencyMappings is mandatory/);
		assert.doesNotMatch(write, /verifyReadback=true/);
	});

	test("reduces default family prompt volume by at least 70 percent", () => {
		const total = [ascetGetPrompt, ascetReadPrompt, ascetDiffPrompt, ascetEditPrompt].reduce(
			(sum, prompt) => sum + promptSize(prompt),
			0,
		);

		assert.ok(total <= Math.floor(TOOL_PROMPT_BASELINE_CHARS * 0.3), `${total} > 70% reduction target`);
	});

	test("keeps dependency-chain execute rules descriptor-backed", () => {
		const prompt = guidelineText(configureParameterDependencyChainTool);
		const examples = compactExamplesForTool("configure_parameter_dependency_chain").join("\n");

		assert.match(prompt, /complete inline definition/);
		assert.match(prompt, /dependency\.formals/);
		assert.match(prompt, /mandatory readback/);
		assert.match(prompt, /compensates in reverse order/);
		assert.doesNotMatch(prompt, /mode=plan|mode=commit|planId|verifyReadback=true/);
		assert.match(examples, /name:"P_Threshold"/);
		assert.match(examples, /name:"C_Threshold"/);
		assert.doesNotMatch(examples, /name:"P_In"|name:"P_Local"|mode:"plan"|mode:"commit"|planId|verifyReadback/);
	});

	test("deduplicates compact family prompts", () => {
		for (const prompt of [ascetGetPrompt, ascetReadPrompt, ascetDiffPrompt, ascetEditPrompt]) {
			assert.equal(new Set(prompt.promptGuidelines).size, prompt.promptGuidelines.length);
		}
	});

	test("Get examples cover bounded tree and elements actions", () => {
		const examples = compactExamplesForTool("ascet_get").join("\n");

		assert.match(examples, /action:"tree"/);
		assert.match(examples, /action:"elements"/);
		assert.match(examples, /target/);
	});

	test("action-level registry supports action and profile lookup", () => {
		assert.deepEqual(actionInstructionIds({ tool: "ascet_get", action: "elements" }), ["ascet_get.elements"]);
		assert.equal(getActionInstruction("ascet_read.read_code")?.action, "read_code");
		assert.deepEqual(actionInstructionIds({ tool: "configure_parameter_dependency_chain" }), [
			"configure_parameter_dependency_chain.execute",
		]);
		assert.ok(
			findActionInstructions({ profile: "write-preflight", tags: ["provider-discovery"] }).some(
				(instruction) => instruction.id === "ascet_edit.set_element_dependency",
			),
		);
	});

	test("capabilities prompt injects the compact action guide", () => {
		const capabilities = guidelineText(ascetCapabilitiesPrompt);

		assert.match(capabilities, /ASCET action guide/);
		assert.match(capabilities, /search_actions/);
		assert.match(capabilities, /ascet_read\.read_code: read complete live code/);
		assert.doesNotMatch(capabilities, /\bascet_batch_write\b/);
	});

	test("public descriptor instructions exclude hidden actions", () => {
		const publicGet = buildToolPromptGuidelines({ tool: "ascet_get", includeExamples: false }).join("\n");

		assert.match(publicGet, /import_binding/);
		assert.equal(getActionInstruction("ascet_batch_write.batch_set_method_code"), undefined);
		assert.equal(
			getActionInstruction("ascet_batch_write.batch_set_method_code", { includeHidden: true })?.hidden,
			true,
		);
	});
});

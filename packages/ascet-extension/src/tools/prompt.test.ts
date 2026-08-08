import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { configureParameterDependencyChainTool } from "../configure-parameter-dependency-chain.ts";
import { compactExamplesForTool } from "./_shared/action-examples.ts";
import { ascetCapabilitiesPrompt } from "./capabilities/prompt.ts";
import { ascetEditPrompt } from "./edit/prompt.ts";
import { ascetGetPrompt } from "./get/prompt.ts";
import {
	actionInstructionIds,
	buildToolPromptGuidelines,
	findActionInstructions,
	getActionInstruction,
} from "./instructions/registry.ts";
import { ascetReadPrompt } from "./read/prompt.ts";

function guidelineText(prompt: { promptGuidelines: readonly string[] }): string {
	return prompt.promptGuidelines.join("\n");
}

describe("ASCET prompt coordination", () => {
	test("guides bounded tree-first Get discovery and exact deep reads", () => {
		const get = guidelineText(ascetGetPrompt);
		const read = guidelineText(ascetReadPrompt);

		assert.match(get, /tree as the primary navigation action/);
		assert.match(get, /complete selected Component or Project catalog/);
		assert.match(get, /Pi find, grep, and read/);
		assert.match(get, /separate ASCET search tool/);
		assert.match(read, /does not discover providers across folders or the database/);
	});

	test("requires resolved dependency targets before dependent local writes", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(write, /resolve every dependency mapping target/);
		assert.match(
			write,
			/For an Imported Parameter target, resolve the authoritative same-named Exported Parameter provider/,
		);
		assert.match(write, /do not require an Exported provider for Constant or System Constant targets/);
		assert.match(write, /align metadata from the authoritative provider/);
		assert.match(write, /does not create local, imported, or exported elements/);
		assert.match(write, /on-demand observations/);
	});

	test("makes code semantics primary for element-spec generation", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(write, /element's code role and explicit requirements/);
		assert.match(write, /semantic intent drives the target spec/);
		assert.match(write, /live reads as compatibility and preservation evidence/);
		assert.match(write, /Do not copy a sibling element's values unless semantic equivalence is established/);
		assert.match(write, /ascet_read\.read_code/);
	});

	test("requires explicit Provider and Local decision groups while keeping Imported lightweight", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(
			write,
			/Provider Exported Parameter creation requires explicit unit, comment, calibration, range, data, and implementation decision groups/,
		);
		assert.match(
			write,
			/Local Dependent Parameter creation requires explicit unit, comment, calibration, range, and implementation decision groups/,
		);
		assert.match(write, /Imported Parameter is the lightweight exception/);
		assert.match(write, /range\.mode=none\|physical\|implementation/);
		assert.match(write, /implementation\.mode=explicit\|ascetDefault/);
		assert.match(write, /null limitAssignments when that option is not applicable/);
	});

	test("describes general dependency targets, explicit mappings, variants, and restoration", () => {
		const write = guidelineText(ascetEditPrompt);

		assert.match(write, /Dependency mappings may target an existing Parameter, Constant, or System Constant/);
		assert.match(write, /dependencyMappings is mandatory/);
		assert.match(write, /never infer mappings from formula text/);
		assert.match(write, /omitted or ambiguous variant selection as all variants/);
		assert.match(write, /snapshot, an explicit value, or an explicit ASCET default/);
		assert.doesNotMatch(write, /formula mapping must resolve through Imported Parameter names/);
	});

	test("injects inline dependency-chain plan and planId-only commit few-shots", () => {
		const prompt = guidelineText(configureParameterDependencyChainTool);
		const examples = compactExamplesForTool("configure_parameter_dependency_chain").join("\n");

		assert.match(prompt, /complete role-specific inline elements/);
		assert.match(prompt, /Never create or pass provider, consumer, or local specFile paths/);
		assert.match(prompt, /dependency\.formals/);
		assert.match(examples, /mode:"plan"/);
		assert.match(examples, /role:"providerExportedParameter"/);
		assert.match(examples, /mode:"commit",planId:/);
		assert.doesNotMatch(examples, /specFile/);
	});

	test("deduplicates ASCET edit prompt rules and few-shots", () => {
		assert.equal(new Set(ascetEditPrompt.promptGuidelines).size, ascetEditPrompt.promptGuidelines.length);
	});

	test("Get prompt examples cover bounded tree and elements actions", () => {
		const examples = compactExamplesForTool("ascet_get").join("\n");

		assert.match(examples, /action:"tree"/);
		assert.match(examples, /action:"elements"/);
		assert.match(examples, /target/);
	});

	test("action-level registry supports Get action and profile lookup", () => {
		assert.deepEqual(actionInstructionIds({ tool: "ascet_get", action: "elements" }), ["ascet_get.elements"]);
		assert.equal(getActionInstruction("ascet_read.read_code")?.action, "read_code");
		assert.deepEqual(actionInstructionIds({ tool: "configure_parameter_dependency_chain" }), [
			"configure_parameter_dependency_chain.plan",
			"configure_parameter_dependency_chain.commit",
		]);
		assert.ok(
			findActionInstructions({ profile: "write-preflight", tags: ["provider-discovery"] }).some(
				(instruction) => instruction.id === "ascet_edit.set_element_dependency",
			),
		);
		assert.ok(
			findActionInstructions({ tool: "ascet_get", profile: "advanced-read" }).some(
				(instruction) => instruction.action === "bde_edges",
			),
		);
	});

	test("prompt assembly composes Get action instructions with tiny few-shots", () => {
		const elements = buildToolPromptGuidelines({
			tool: "ascet_get",
			actions: ["elements"],
			profile: "base",
		}).join("\n");
		const liveCode = buildToolPromptGuidelines({
			tool: "ascet_read",
			actions: ["read_code"],
			profile: "base",
		}).join("\n");

		assert.match(elements, /complete Element directory/);
		assert.match(elements, /result-count limit/);
		assert.match(elements, /elements: ascet_get/);
		assert.match(liveCode, /live ToolAPI read/);
		assert.match(liveCode, /read_code: ascet_read/);
	});

	test("capabilities prompt injects the compact ASCET action guide", () => {
		const capabilities = guidelineText(ascetCapabilitiesPrompt);

		assert.match(capabilities, /ASCET action guide/);
		assert.match(capabilities, /search_actions/);
		assert.match(capabilities, /ascet_read\.read_code: read complete live code/);
		assert.doesNotMatch(capabilities, /\bactivate_profile\b/);
		assert.doesNotMatch(capabilities, /\boperationQuery\b/);
		assert.doesNotMatch(capabilities, /\bascet_batch_write\b/);
	});

	test("public Get instructions are available without hidden actions", () => {
		const publicGet = buildToolPromptGuidelines({ tool: "ascet_get" }).join("\n");

		assert.match(publicGet, /ascet_get/);
		assert.match(publicGet, /import_binding/);
		assert.equal(getActionInstruction("ascet_batch_write.batch_set_method_code"), undefined);
		assert.equal(
			getActionInstruction("ascet_batch_write.batch_set_method_code", { includeHidden: true })?.hidden,
			true,
		);
	});
});

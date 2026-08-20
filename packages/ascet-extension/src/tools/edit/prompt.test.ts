import assert from "node:assert/strict";
import { test } from "node:test";
import { ascetEditPrompt } from "./prompt.ts";

test("ascet_edit prompt explains apply_element_spec formula Project context", () => {
	const guidance = ascetEditPrompt.promptGuidelines.join("\n");
	assert.match(guidance, /absent formula.*ident.*does not require projectPath/i);
	assert.match(guidance, /every other formula requires one explicit projectPath/i);
	assert.match(guidance, /Never infer <component folder>\\Project/);
	assert.match(guidance, /ascet_edit_project_context_required/);
	assert.match(guidance, /direct Bridge callers receive project_context_required/);
});

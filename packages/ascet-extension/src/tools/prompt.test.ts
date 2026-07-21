import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ascetExplorePrompt } from "./explore/prompt.ts";
import { ascetReadPrompt } from "./read/prompt.ts";
import { ascetSearchPrompt } from "./search/prompt.ts";
import { ascetWritePrompt } from "./write/prompt.ts";

function guidelineText(prompt: { promptGuidelines: readonly string[] }): string {
	return prompt.promptGuidelines.join("\n");
}

describe("ASCET prompt coordination", () => {
	test("guides recursive exported-parameter provider discovery", () => {
		const read = guidelineText(ascetReadPrompt);
		const search = guidelineText(ascetSearchPrompt);
		const explore = guidelineText(ascetExplorePrompt);

		assert.match(read, /coordinated workflow/);
		assert.match(read, /scope=Exported/);
		assert.match(read, /same-named Exported Parameter/);
		assert.match(search, /_Calibration/);
		assert.match(search, /_Constant/);
		assert.match(search, /Imported Parameter and Exported Parameter must be same-named/);
		assert.match(explore, /list_components recursively/);
		assert.match(explore, /same-named Exported Parameter/);
	});

	test("requires exported-provider evidence before dependent local writes", () => {
		const write = guidelineText(ascetWritePrompt);

		assert.match(write, /resolve the authoritative same-named Exported Parameter provider/);
		assert.match(write, /Do not bind to a provider candidate unless the matching element is scope=Exported/);
		assert.match(write, /Imported Parameter and Exported Parameter must have the same name/);
		assert.match(write, /align metadata from the Exported Parameter, not from the Imported Parameter/);
	});
});

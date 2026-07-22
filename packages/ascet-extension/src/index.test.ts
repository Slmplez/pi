import assert from "node:assert/strict";
import { describe, test } from "node:test";
import ascetExtension from "./index.ts";

describe("ASCET extension agent routing hook", () => {
	test("adds implementation routing guidance without relying on prompt keyword prefiltering", async () => {
		let beforeAgentStart:
			| ((event: {
					type: "before_agent_start";
					prompt: string;
					systemPrompt: string;
			  }) => { systemPrompt?: string } | undefined | Promise<{ systemPrompt?: string } | undefined>)
			| undefined;

		ascetExtension({
			registerTool() {},
			registerCommand() {},
			registerProvider() {},
			sendUserMessage() {},
			on(event: string, handler: unknown) {
				if (event === "before_agent_start") {
					beforeAgentStart = handler as typeof beforeAgentStart;
				}
			},
		});

		assert.equal(typeof beforeAgentStart, "function");
		const result = await beforeAgentStart({
			type: "before_agent_start",
			prompt: "Add a calculation method to this class and configure related parameters.",
			systemPrompt: "Base system prompt.",
		});

		assert.match(result?.systemPrompt ?? "", /ascet-implementation/);
	});
});

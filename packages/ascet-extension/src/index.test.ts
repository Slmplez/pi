import assert from "node:assert/strict";
import { describe, test } from "node:test";
import ascetExtension from "./index.ts";

describe("ASCET extension agent routing hook", () => {
	test("profile activation is deferred until before_agent_start and preserves non-ASCET active tools", async () => {
		let active = ["non_ascet_tool", "ascet_read"];
		const registered: string[] = [];
		let beforeAgentStart:
			| ((event: {
					type: "before_agent_start";
					prompt: string;
					systemPrompt: string;
			  }) => { systemPrompt?: string } | undefined | Promise<{ systemPrompt?: string } | undefined>)
			| undefined;

		ascetExtension({
			registerTool(tool: unknown) {
				const candidate = tool as { name?: string };
				if (candidate.name) {
					registered.push(candidate.name);
				}
			},
			getActiveTools() {
				return active;
			},
			setActiveTools(toolNames: string[]) {
				active = [...toolNames];
			},
			registerCommand() {},
			registerProvider() {},
			sendUserMessage() {},
			on(event: string, handler: unknown) {
				if (event === "before_agent_start") {
					beforeAgentStart = handler as typeof beforeAgentStart;
				}
			},
		});

		assert.equal(registered.includes("ascet_status"), true);
		assert.deepEqual(active, ["non_ascet_tool", "ascet_read"]);
		if (typeof beforeAgentStart !== "function") {
			assert.fail("before_agent_start hook should be registered.");
		}
		await beforeAgentStart({
			type: "before_agent_start",
			prompt: "Use ASCET.",
			systemPrompt: "Base system prompt.",
		});
		assert.deepEqual(active, [
			"non_ascet_tool",
			"find",
			"grep",
			"read",
			"ascet_get",
			"ascet_read",
			"ascet_status",
			"ascet_capabilities",
			"ascet_recover",
			"ascet_scheduler_status",
			"ascet_diff",
			"ascet_edit",
			"ascet_verify",
			"configure_parameter_dependency_chain",
		]);
	});

	test("adds inline ASCET coding policy without relying on prompt keyword prefiltering", async () => {
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

		if (typeof beforeAgentStart !== "function") {
			assert.fail("before_agent_start hook should be registered.");
		}
		const hook = beforeAgentStart;
		const result = await hook({
			type: "before_agent_start",
			prompt: "Add a calculation method to this class and configure related parameters.",
			systemPrompt: "Base system prompt.",
		});

		assert.match(result?.systemPrompt ?? "", /ASCET coding policy:/);
		assert.doesNotMatch(result?.systemPrompt ?? "", /ascet-implementation/);
	});
});

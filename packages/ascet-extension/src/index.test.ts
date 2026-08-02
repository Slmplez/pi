import assert from "node:assert/strict";
import { describe, test } from "node:test";
import ascetExtension, { scheduleStartupAscetSearchIndexWarmup } from "./index.ts";

describe("ASCET extension agent routing hook", () => {
	test("activates the profile at session_start and preserves non-ASCET active tools", async () => {
		let active = ["non_ascet_tool", "ascet_read"];
		const registered: string[] = [];
		let sessionStart: ((event: { type: "session_start" }, ctx: { cwd?: string }) => void | Promise<void>) | undefined;
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
				if (event === "session_start") {
					sessionStart = handler as typeof sessionStart;
				}
				if (event === "before_agent_start") {
					beforeAgentStart = handler as typeof beforeAgentStart;
				}
			},
		});

		assert.equal(registered.includes("ascet_status"), true);
		assert.deepEqual(active, ["non_ascet_tool", "ascet_read"]);
		if (typeof sessionStart !== "function") {
			assert.fail("session_start hook should be registered.");
		}
		await sessionStart({ type: "session_start" }, {});
		assert.deepEqual(active, [
			"non_ascet_tool",
			"ascet_status",
			"ascet_capabilities",
			"ascet_index",
			"ascet_recover",
			"ascet_scheduler_status",
			"ascet_explore",
			"ascet_search",
			"ascet_read",
			"ascet_diff",
			"ascet_edit",
			"ascet_verify",
		]);
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
			"ascet_status",
			"ascet_capabilities",
			"ascet_index",
			"ascet_recover",
			"ascet_scheduler_status",
			"ascet_explore",
			"ascet_search",
			"ascet_read",
			"ascet_diff",
			"ascet_edit",
			"ascet_verify",
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

	test("schedules startup P0 refresh so stale ASCET edits are picked up", async () => {
		const observed = await new Promise<{
			cwd?: string;
			partition?: string;
			forceRefresh?: boolean;
			includeTextCode?: boolean;
			toolName?: string;
			scheduler?: unknown;
		}>((resolve) => {
			const scheduled = scheduleStartupAscetSearchIndexWarmup(
				{
					cwd: "E:\\Rep\\Demo",
					sessionManager: {
						getCwd() {
							return "E:\\Rep\\DemoFromSession";
						},
					},
				},
				{
					delayMs: 0,
					warmSearchIndex: async (options) => {
						resolve(options);
						return {
							ok: true,
							commandId: "warm_search_index",
							databaseName: "DemoDb",
							databasePath: "C:\\ASCET\\DemoDb",
							entryCount: 1,
							elapsedMs: 1,
							scanComplete: true,
							fromCache: true,
							exitCode: 0,
							timedOut: false,
							stdout: "",
							stderr: "",
						};
					},
				},
			);
			assert.equal(scheduled, true);
		});

		assert.equal(observed.cwd, "E:\\Rep\\DemoFromSession");
		assert.equal(observed.partition, "p0");
		assert.equal(observed.forceRefresh, true);
		assert.equal(observed.includeTextCode, true);
		assert.equal(observed.toolName, "ascet_status");
		assert.equal(typeof observed.scheduler, "object");
	});
});

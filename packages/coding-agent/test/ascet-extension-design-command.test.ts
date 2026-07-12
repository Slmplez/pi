import { describe, expect, it } from "vitest";
import type { AscetExtensionAPI } from "../../ascet-extension/src/core/tool.ts";
import ascetExtension from "../../ascet-extension/src/index.ts";

type RegisteredCommand = Parameters<AscetExtensionAPI["registerCommand"]>[1];

function loadExtensionWithCaptures() {
	const tools: unknown[] = [];
	const commands = new Map<string, RegisteredCommand>();
	const sentMessages: Array<{ content: string; options?: { deliverAs?: "steer" | "followUp" } }> = [];
	const notifications: Array<{ message: string; level?: "info" | "warning" | "error" }> = [];

	const pi: AscetExtensionAPI = {
		registerTool(tool: unknown) {
			tools.push(tool);
		},
		registerCommand(name: string, options: RegisteredCommand) {
			commands.set(name, options);
		},
		sendUserMessage(content: string, options?: { deliverAs?: "steer" | "followUp" }) {
			sentMessages.push({ content, options });
		},
	};
	ascetExtension(pi);

	const ctx = {
		cwd: "E:\\Rep\\AscetAgent\\PI",
		isIdle: () => true,
		ui: {
			notify(message: string, level?: "info" | "warning" | "error") {
				notifications.push({ message, level });
			},
		},
	};

	return { tools, commands, sentMessages, notifications, ctx };
}

describe("/ascet-design command", () => {
	it("registers a guided command that requires clarification and requirements risk retrieval", async () => {
		const { commands, sentMessages, ctx } = loadExtensionWithCaptures();
		const command = commands.get("ascet-design");

		expect(command?.description).toContain("ASCET design");
		await command?.handler("wheel speed quality fallback", ctx);

		expect(sentMessages).toHaveLength(1);
		expect(sentMessages[0]?.options).toBeUndefined();
		expect(sentMessages[0]?.content).toContain("call ask_user_question before searching");
		expect(sentMessages[0]?.content).toContain(
			'Use ascet_requirements(action="risk_context") before ASCET live design',
		);
		expect(sentMessages[0]?.content).toContain("If design_gate_ready=false, do not enter ASCET design");
		expect(sentMessages[0]?.content).toContain("If next_action is present, call that ascet_requirements action");
		expect(sentMessages[0]?.content).toContain("If blocking_clarifications are present, call ask_user_question");
		expect(sentMessages[0]?.content).toContain("Only enter ASCET design when detail_complete, evidence complete");
		expect(sentMessages[0]?.content).toContain("Do not call ascet_write or ascet_batch_write");
		expect(sentMessages[0]?.content).toContain("unless the user explicitly asks to apply changes");
	});

	it("queues the generated design prompt as a follow-up while the session is busy", async () => {
		const { commands, sentMessages, notifications, ctx } = loadExtensionWithCaptures();
		const command = commands.get("ascet-design");
		const busyCtx = {
			...ctx,
			isIdle: () => false,
		};

		await command?.handler("907829", busyCtx);

		expect(sentMessages).toMatchObject([
			{
				options: { deliverAs: "followUp" },
			},
		]);
		expect(sentMessages[0]?.content).toContain("907829");
		expect(notifications).toContainEqual({
			message: "Queued ASCET design as a follow-up.",
			level: "info",
		});
	});
});

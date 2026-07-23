import { describe, expect, it } from "vitest";
import type { AscetExtensionAPI } from "../../ascet-extension/src/core/tool.ts";
import ascetExtension from "../../ascet-extension/src/index.ts";

type RegisteredCommand = Parameters<AscetExtensionAPI["registerCommand"]>[1];

function loadExtensionWithCaptures() {
	const tools: unknown[] = [];
	const commands = new Map<string, RegisteredCommand>();

	const pi: AscetExtensionAPI = {
		registerTool(tool: unknown) {
			tools.push(tool);
		},
		registerCommand(name: string, options: RegisteredCommand) {
			commands.set(name, options);
		},
		sendUserMessage() {},
	};
	ascetExtension(pi);

	return { tools, commands };
}

describe("hidden /ascet-design command", () => {
	it("does not register the ASCET design prompt command", () => {
		const { commands } = loadExtensionWithCaptures();

		expect(commands.has("ascet-design")).toBe(false);
	});

	it("does not register the ASCET full-check prompt command", () => {
		const { commands } = loadExtensionWithCaptures();

		expect(commands.has("ascet-full-check")).toBe(false);
	});
});

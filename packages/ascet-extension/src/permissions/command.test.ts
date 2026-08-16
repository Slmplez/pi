import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetExtensionAPI } from "../core/tool.ts";
import { registerAscetPermissionCommand } from "./command.ts";
import { createAscetPermissionController } from "./controller.ts";

type Command = Parameters<AscetExtensionAPI["registerCommand"]>[1];

describe("/ascet-permission", () => {
	test("shows, changes, cycles, and validates modes", async () => {
		let command: Command | undefined;
		const notices: Array<{ message: string; level?: string }> = [];
		const entries: unknown[] = [];
		const controller = createAscetPermissionController({ appendEntry: (_type, data) => entries.push(data) });
		registerAscetPermissionCommand(
			{
				registerCommand(_name, options) {
					command = options;
				},
			},
			controller,
		);
		assert.ok(command);
		const ctx = {
			cwd: process.cwd(),
			isIdle: () => true,
			ui: { notify: (message: string, level?: "info" | "warning" | "error") => notices.push({ message, level }) },
		};
		await command.handler("", ctx);
		await command.handler("accept-edits", ctx);
		await command.handler("cycle", ctx);
		await command.handler("invalid", ctx);
		assert.equal(controller.getMode(), "auto");
		assert.deepEqual(entries, [{ mode: "acceptEdits" }, { mode: "auto" }]);
		assert.match(notices[0].message, /Default/);
		assert.match(notices.at(-1)?.message ?? "", /Usage/);
	});
});

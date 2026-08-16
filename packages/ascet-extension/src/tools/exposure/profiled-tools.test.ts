import assert from "node:assert/strict";
import { test } from "node:test";
import { buildProfiledAscetTools } from "./profiled-tools.ts";

test("profiled ASCET tools capture one plugin permission snapshot per execution", async () => {
	const cwd = process.cwd();
	const observedCwds: string[] = [];
	const [tool] = buildProfiledAscetTools(
		"base",
		["ascet_capabilities"],
		{},
		{
			getSnapshot(requestCwd) {
				observedCwds.push(requestCwd);
				return { mode: "auto", rules: [] };
			},
		},
	);
	assert.ok(tool?.execute);
	const executable = tool as unknown as {
		execute(...args: unknown[]): Promise<unknown> | unknown;
	};
	await executable.execute("call-1", {}, new AbortController().signal, undefined, { cwd });
	assert.deepEqual(observedCwds, [cwd]);
});

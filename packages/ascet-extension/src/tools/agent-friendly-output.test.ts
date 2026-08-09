import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliJsonResult } from "../cli.ts";
import { formatAscetEditabilityResult } from "../edit/editability.ts";
import { createAscetExposureController } from "./exposure/controller.ts";
import { formatAscetRecoverResult } from "./recover.ts";
import { ascetSchedulerStatusTool } from "./scheduler-status/definition.ts";

function createPiHarness() {
	let active: string[] = [];
	return {
		pi: {
			registerTool(_tool: unknown) {},
			getActiveTools() {
				return active;
			},
			setActiveTools(toolNames: string[]) {
				active = [...toolNames];
			},
		},
	};
}

describe("ASCET tool Agent-friendly output", () => {
	test("component editable returns structured JSON instead of a bare boolean", () => {
		const text = formatAscetEditabilityResult(
			{
				ok: true,
				data: true,
				request: { cwd: ".", cliPath: "AscetBridge.exe", args: [] },
				stdout: "",
				stderr: "",
				exitCode: 0,
				timedOut: false,
			} satisfies AscetCliJsonResult,
			{ mode: "check", componentPath: "DEMO/C" },
		);

		assert.deepEqual(JSON.parse(text), { editable: true });
	});

	test("recover formatter returns structured JSON instead of human summary text", () => {
		const text = formatAscetRecoverResult({
			ok: true,
			action: "clear_extension_temp",
			data: {
				tempRoot: "C:\\Temp\\pi-ascet-extension",
				cleared: true,
			},
		});

		assert.deepEqual(JSON.parse(text), {
			path: "C:/Temp/pi-ascet-extension",
			cleared: true,
		});
	});

	test("scheduler status defaults to structured JSON content", async () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("ops");
		const result = (await ascetSchedulerStatusTool.execute?.(
			"tool-call",
			{},
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd() },
		)) as { content: Array<{ type: "text"; text: string }> };
		const payload = JSON.parse(result.content[0]?.text ?? "");

		assert.equal(payload.ok, undefined);
		assert.equal(typeof payload.summary, "string");
		assert.equal(typeof payload.scheduler, "object");
		assert.equal(typeof payload.cliLock, "object");
	});
});

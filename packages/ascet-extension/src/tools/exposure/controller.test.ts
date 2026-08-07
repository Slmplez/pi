import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAscetExposureController } from "./controller.ts";

function createPiHarness(initialActive: string[] = ["non_ascet_tool"]) {
	const registered: Array<{ name: string; promptGuidelines?: readonly string[] }> = [];
	let active = [...initialActive];
	return {
		registered,
		get active() {
			return active;
		},
		pi: {
			registerTool(tool: unknown) {
				const candidate = tool as { name?: string; promptGuidelines?: readonly string[] };
				if (candidate.name) {
					registered.push({ name: candidate.name, promptGuidelines: candidate.promptGuidelines });
				}
			},
			getActiveTools() {
				return active;
			},
			setActiveTools(toolNames: string[]) {
				active = [...toolNames];
			},
		},
	};
}

describe("ASCET exposure controller", () => {
	test("activates base profile with all canonical tools except batch write", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });

		exposure.activateProfile("base");

		assert.deepEqual(harness.active, [
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
		]);
		assert.equal(
			harness.registered.some((tool) => tool.name === "ascet_batch_write"),
			false,
		);
	});

	test("write-preflight exposes write and verify but not batch write", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });

		exposure.activateProfile("write-preflight");

		assert.equal(harness.active.includes("ascet_edit"), true);
		assert.equal(harness.active.includes("ascet_verify"), true);
		assert.equal(harness.active.includes("ascet_batch_write"), false);
	});

	test("batch write requires explicit feature gate", () => {
		const disabled = createPiHarness();
		createAscetExposureController(disabled.pi, { env: {} }).activateProfile("batch-write");
		assert.equal(disabled.active.includes("ascet_batch_write"), false);

		const enabled = createPiHarness();
		createAscetExposureController(enabled.pi, { env: { PI_ASCET_ENABLE_BATCH_WRITE: "1" } }).activateProfile(
			"batch-write",
		);
		assert.equal(enabled.active.includes("ascet_batch_write"), true);
	});

	test("advanced-read refreshes read prompt guidelines", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });

		exposure.activateProfile("advanced-read");

		const readTool = [...harness.registered]
			.reverse()
			.find((tool: (typeof harness.registered)[number]) => tool.name === "ascet_read");
		assert.ok(readTool);
		assert.match((readTool.promptGuidelines ?? []).join("\n"), /read_block_diagram/);
	});

	test("reports active profile metadata after activation", () => {
		const harness = createPiHarness(["non_ascet_tool", "ascet_read"]);
		const exposure = createAscetExposureController(harness.pi, { env: {} });

		exposure.activateProfile("verify");

		assert.deepEqual(exposure.getMetadata(), {
			profile: "verify",
			activeTools: [
				"find",
				"grep",
				"read",
				"ascet_get",
				"ascet_read",
				"ascet_status",
				"ascet_capabilities",
				"ascet_verify",
				"ascet_scheduler_status",
			],
			batchWriteEnabled: false,
		});
	});
});

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { createAscetExposureController } from "./controller.ts";
import { profileTools } from "./profiles.ts";

function createPiHarness(initialActive: string[] = ["non_ascet_tool"]) {
	const registered: Array<{ name: string; promptGuidelines?: readonly string[] }> = [];
	const registeredTools: Array<{ name?: string; execute?: (...args: unknown[]) => unknown }> = [];
	let active = [...initialActive];
	return {
		registered,
		registeredTools,
		get active() {
			return active;
		},
		pi: {
			registerTool(tool: unknown) {
				const candidate = tool as {
					name?: string;
					promptGuidelines?: readonly string[];
					execute?: (...args: unknown[]) => unknown;
				};
				registeredTools.push(candidate);
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
			"configure_parameter_dependency_chain",
		]);
		assert.equal(
			harness.registered.some((tool) => tool.name === "ascet_batch_write"),
			false,
		);
	});

	test("keeps the base profile free of duplicated workflow guidance", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		const getPrompt =
			[...harness.registered]
				.reverse()
				.find((tool) => tool.name === "ascet_get")
				?.promptGuidelines?.join("\n") ?? "";
		const readPrompt =
			[...harness.registered]
				.reverse()
				.find((tool) => tool.name === "ascet_read")
				?.promptGuidelines?.join("\n") ?? "";
		assert.doesNotMatch(getPrompt, /Use ascet_get\.tree first/);
		assert.doesNotMatch(readPrompt, /selected through ascet_get/);
	});

	test("keeps reference-profile guidance outgoing-only", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("reference");

		const getPrompt =
			[...harness.registered]
				.reverse()
				.find((tool) => tool.name === "ascet_get")
				?.promptGuidelines?.join("\n") ?? "";
		assert.match(getPrompt, /exact resolved targets/);
		assert.match(getPrompt, /outgoing relationships only/);
		assert.doesNotMatch(getPrompt, /after tree resolves/);
	});
	test("does not expose retired ascet_verify in any profile", () => {
		for (const [profile, tools] of Object.entries(profileTools)) {
			assert.equal(tools.includes("ascet_verify"), false, profile);
		}
	});

	test("write-preflight exposes writes but not retired verify or batch write", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });

		exposure.activateProfile("write-preflight");

		assert.equal(harness.active.includes("ascet_edit"), true);
		assert.equal(harness.active.includes("ascet_verify"), false);
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

		exposure.activateProfile("advanced-read");

		assert.deepEqual(exposure.getMetadata(), {
			profile: "advanced-read",
			activeTools: ["find", "grep", "read", "ascet_get", "ascet_read", "ascet_status", "ascet_capabilities"],
			batchWriteEnabled: false,
		});
	});

	test("isolates action activation between controllers", async () => {
		const advanced = createPiHarness();
		createAscetExposureController(advanced.pi, { env: {} }).activateProfile("advanced-read");
		const advancedRead = [...advanced.registeredTools].reverse().find((tool) => tool.name === "ascet_read");
		assert.ok(advancedRead?.execute);

		const ops = createPiHarness();
		createAscetExposureController(ops.pi, { env: {} }).activateProfile("ops");
		const opsRead = [...ops.registeredTools].reverse().find((tool) => tool.name === "ascet_read");
		assert.ok(opsRead?.execute);

		let cliCalls = 0;
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
			cliCalls++;
			return {
				exitCode: 0,
				stdout: JSON.stringify({ ok: true, result: { nodes: [] }, error: null }),
				stderr: "",
				timedOut: false,
				request,
			};
		};
		const params = { action: "read_block_diagram", componentPath: "DEMO\\PID" };
		await advancedRead.execute("call-a", params, new AbortController().signal, undefined, {
			cwd: process.cwd(),
			executeCli,
		});
		assert.equal(cliCalls, 1);

		const blocked = (await opsRead.execute("call-b", params, new AbortController().signal, undefined, {
			cwd: process.cwd(),
			executeCli,
		})) as { details?: { error?: { code?: string } } };
		assert.equal(blocked.details?.error?.code, "ascet_action_unavailable");
		assert.equal(cliCalls, 1);
	});
});

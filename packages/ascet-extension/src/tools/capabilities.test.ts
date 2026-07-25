import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ascetCapabilitiesTool } from "./capabilities/definition.ts";
import { runAscetCapabilities } from "./capabilities.ts";
import { createAscetExposureController } from "./exposure/controller.ts";

function createPiHarness(initialActive: string[] = ["non_ascet_tool"]) {
	let active = [...initialActive];
	return {
		get active() {
			return active;
		},
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

function withCatalog<T>(run: (cwd: string) => T): T {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-capabilities-"));
	try {
		const contractsRoot = join(root, "src", "ascetcli", "contracts");
		mkdirSync(join(contractsRoot, "commands"), { recursive: true });
		writeFileSync(
			join(contractsRoot, "cli-catalog.json"),
			JSON.stringify({
				commands: [
					{
						id: "AscetReadCode",
						operation: "read_code",
						family: "read",
						risk: "read",
						summary: "Read method code.",
						objectKinds: ["class"],
						supportsJson: true,
					},
				],
			}),
		);
		return run(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

describe("runAscetCapabilities", () => {
	test("includes active profile metadata in search results", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });
		exposure.activateProfile("verify");

		withCatalog((cwd) => {
			const result = runAscetCapabilities({ family: "read", limit: 1 }, { cwd, env: {} });

			assert.equal(result.ok, true);
			assert.equal(result.data.activeProfile, "verify");
			assert.deepEqual(result.data.activeTools, [
				"ascet_status",
				"ascet_capabilities",
				"ascet_explore",
				"ascet_search",
				"ascet_read",
				"ascet_verify",
				"ascet_scheduler_status",
			]);
			assert.equal(result.data.batchWriteEnabled, false);
			assert.equal(
				result.data.actions.some((action) => action.tool === "ascet_read" && action.name === "read_code"),
				true,
			);
			assert.equal(
				result.data.actions.some((action) => action.name === "search_occurrences"),
				false,
			);
		});
	});

	test("tool result content is compact JSON without success envelopes", async () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		await withCatalog(async (cwd) => {
			const result = await ascetCapabilitiesTool.execute(
				"call-1",
				{ family: "read", limit: 1 },
				new AbortController().signal,
				undefined,
				{ cwd },
			);
			const text = result.content[0]?.text ?? "";
			const payload = JSON.parse(text) as {
				activeProfile?: string;
				activeTools?: string[];
				total?: number;
				items?: Array<{ operation?: string }>;
			};

			assert.equal(payload.activeProfile, "base");
			assert.equal(payload.items?.length, 1);
			assert.ok((payload.total ?? 0) >= 1);
			assert.equal(typeof payload.items?.[0]?.operation, "string");
			assert.doesNotMatch(text, /ASCET capabilities:/);
			assert.doesNotMatch(text, /"ok"|error|null|"meta"|"mode"|"operation":\s*"search"/);
			assert.equal(Object.hasOwn(result.details, "ok"), false);
			assert.equal(Object.hasOwn(result.details, "error"), false);
		});
	});

	test("reports active public search action descriptors", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		withCatalog((cwd) => {
			const result = runAscetCapabilities({ family: "search", operationQuery: "text_in_code" }, { cwd, env: {} });
			assert.equal(
				result.data.actions.some((action) => action.tool === "ascet_search" && action.name === "text_in_code"),
				true,
			);
			assert.equal(
				result.data.actions.some((action) => action.name === "search_text_code"),
				false,
			);
		});
	});

	test("reports quick-search semantic action descriptors", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		withCatalog((cwd) => {
			const result = runAscetCapabilities(
				{ family: "search", operationQuery: "declarations_of", detailLevel: "full" } as Parameters<
					typeof runAscetCapabilities
				>[0],
				{ cwd, env: {} },
			);
			const actions = new Map(result.data.actions.map((action) => [action.name, action]));
			assert.equal(actions.get("declarations_of_element")?.state, "active");
			assert.equal(actions.get("declarations_of_method_process")?.state, "active");
			assert.equal(actions.get("declarations_of_method_process_element")?.state, "active");
			assert.deepEqual(actions.get("declarations_of_method_process")?.requiresPartitions, ["method_decls"]);
			assert.deepEqual(actions.get("declarations_of_method_process_element")?.requiresPartitions, [
				"method_process_elements",
			]);

			const messages = runAscetCapabilities(
				{ family: "search", operationQuery: "message", detailLevel: "full" } as Parameters<
					typeof runAscetCapabilities
				>[0],
				{ cwd, env: {} },
			);
			const messageActions = new Map(messages.data.actions.map((action) => [action.name, action]));
			assert.deepEqual(messageActions.get("senders_of_message")?.requiresPartitions, ["messages"]);
			assert.deepEqual(messageActions.get("receivers_of_message")?.requiresPartitions, ["messages"]);
		});
	});

	test("activates a profile through a stable capabilities action", () => {
		const harness = createPiHarness();
		const exposure = createAscetExposureController(harness.pi, { env: {} });
		exposure.activateProfile("base");

		withCatalog((cwd) => {
			const result = runAscetCapabilities(
				{ action: "activate_profile", profile: "diff" } as Parameters<typeof runAscetCapabilities>[0],
				{ cwd, env: {} },
			);

			assert.equal(result.ok, true);
			assert.equal(exposure.getProfile(), "diff");
			assert.equal(result.data.activeProfile, "diff");
			assert.equal(harness.active.includes("ascet_diff"), true);
			assert.equal(harness.active.includes("ascet_batch_write"), false);
		});
	});

	test("adds compact action instructions only at full detail", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		withCatalog((cwd) => {
			const summary = runAscetCapabilities({ family: "read", limit: 1 }, { cwd, env: {} });
			assert.equal(summary.data.matches[0]?.actionInstructions, undefined);

			const full = runAscetCapabilities(
				{ family: "read", limit: 1, detailLevel: "full" } as Parameters<typeof runAscetCapabilities>[0],
				{ cwd, env: {} },
			);
			const instructions = full.data.matches[0]?.actionInstructions ?? [];
			assert.equal(instructions.length > 0, true);
			assert.match(instructions.join("\n"), /ascet_read/);
		});
	});

	test("reports hidden/internal action descriptors only at full detail", () => {
		const harness = createPiHarness();
		createAscetExposureController(harness.pi, { env: {} }).activateProfile("base");

		withCatalog((cwd) => {
			const summary = runAscetCapabilities({ operationQuery: "search_occurrences" }, { cwd, env: {} });
			assert.equal(
				summary.data.actions.some((action) => action.name === "search_occurrences"),
				false,
			);

			const full = runAscetCapabilities(
				{ operationQuery: "search_occurrences", detailLevel: "full", includeHidden: true },
				{ cwd, env: {} },
			);
			const action = full.data.actions.find((item) => item.name === "search_occurrences");
			assert.equal(action?.state, "hidden");
			assert.equal(action?.replacement, "ascet_search.references_to_element");
		});
	});

	test("reports batch write as feature disabled until explicitly enabled", () => {
		const disabled = createPiHarness();
		createAscetExposureController(disabled.pi, { env: {} }).activateProfile("batch-write");

		withCatalog((cwd) => {
			const result = runAscetCapabilities(
				{ operationQuery: "ascet_batch_write", detailLevel: "full", includeHidden: true },
				{ cwd, env: {} },
			);
			assert.equal(result.data.actions.find((item) => item.tool === "ascet_batch_write")?.state, "feature_disabled");
		});

		const enabled = createPiHarness();
		createAscetExposureController(enabled.pi, { env: { PI_ASCET_ENABLE_BATCH_WRITE: "1" } }).activateProfile(
			"batch-write",
		);
		withCatalog((cwd) => {
			const result = runAscetCapabilities(
				{ operationQuery: "ascet_batch_write", detailLevel: "full", includeHidden: true },
				{ cwd, env: { PI_ASCET_ENABLE_BATCH_WRITE: "1" } },
			);
			assert.equal(result.data.actions.find((item) => item.tool === "ascet_batch_write")?.state, "active");
		});
	});
});

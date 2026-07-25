import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAscetExposureController } from "../exposure/controller.ts";
import { ascetSearchTool } from "../search/index.ts";
import { AscetActionUnavailableError, assertActionActive, extractToolAction } from "./guard.ts";

function activateBaseProfile() {
	const pi = {
		registerTool(_tool: unknown) {},
		getActiveTools() {
			return ["ascet_status", "ascet_capabilities", "ascet_explore", "ascet_search", "ascet_read"];
		},
		setActiveTools(_toolNames: string[]) {},
	};
	const exposure = createAscetExposureController(pi, { env: {} });
	exposure.activateProfile("base");
}

describe("ASCET action runtime guard", () => {
	test("resolves default actions for tools with optional action parameters", () => {
		assert.equal(extractToolAction("ascet_capabilities", {}), "search");
		assert.equal(extractToolAction("ascet_scheduler_status", {}), "status");
		assert.equal(extractToolAction("ascet_status", {}), "status");
	});

	test("allows active public actions and rejects internal replacements", () => {
		activateBaseProfile();

		const descriptor = assertActionActive("ascet_search", "search_components");
		assert.equal(descriptor?.id, "ascet_search.search_components");

		assert.throws(
			() => assertActionActive("ascet_search", "search_occurrences"),
			(error) =>
				error instanceof AscetActionUnavailableError &&
				error.payload.replacement === "ascet_search.references_to_element",
		);
	});

	test("tool execution returns structured rejection for stale hidden/internal actions", async () => {
		activateBaseProfile();

		const result = await ascetSearchTool.execute(
			"call-1",
			{ action: "search_text_code", query: "needle" } as never,
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd() },
		);

		const details = result.details as {
			error?: { code?: string };
			replacement?: string;
			recover?: { tool?: string; action?: string };
		};
		assert.equal(details.error?.code, "ascet_action_unavailable");
		assert.equal(details.replacement, "ascet_search.text_in_code");
		assert.deepEqual(details.recover, { tool: "ascet_capabilities", action: "search", query: "search_text_code" });
		assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
			error: {
				code: "ascet_action_unavailable",
				message: "ASCET action ascet_search.search_text_code is not active. Use ascet_search.text_in_code.",
			},
			recover: { tool: "ascet_capabilities", action: "search", query: "search_text_code" },
		});
	});
});

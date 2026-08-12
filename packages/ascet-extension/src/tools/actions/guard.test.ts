import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { createAscetExposureController } from "../exposure/controller.ts";
import { AscetActionUnavailableError, assertActionActive, extractToolAction } from "./guard.ts";

function activateProfile(profile: "base" | "write-preflight") {
	const pi = {
		registerTool(_tool: unknown) {},
		getActiveTools() {
			return [];
		},
		setActiveTools(_toolNames: string[]) {},
	};
	const exposure = createAscetExposureController(pi, { env: {} });
	exposure.activateProfile(profile);
}

describe("ASCET action runtime guard", () => {
	test("resolves default actions for tools with optional action parameters", () => {
		assert.equal(extractToolAction("configure_parameter_dependency_chain", {}), "execute");
		assert.equal(extractToolAction("ascet_capabilities", {}), "search_actions");
		assert.equal(extractToolAction("ascet_scheduler_status", {}), "status");
		assert.equal(extractToolAction("ascet_status", {}), "status");
	});

	test("allows active Get actions and rejects unknown actions", () => {
		activateProfile("base");

		const descriptor = assertActionActive("ascet_get", "tree");
		assert.equal(descriptor?.id, "ascet_get.tree");
		assert.equal(assertActionActive("ascet_get", "database_identity")?.id, "ascet_get.database_identity");
		assert.equal(assertActionActive("ascet_edit", "check")?.id, "ascet_edit.check");
		assert.equal(
			assertActionActive("configure_parameter_dependency_chain", "execute")?.id,
			"configure_parameter_dependency_chain.execute",
		);

		assert.throws(
			() => assertActionActive("ascet_get", "unknown"),
			(error) =>
				error instanceof AscetActionUnavailableError &&
				error.payload.tool === "ascet_get" &&
				error.payload.action === "unknown" &&
				error.payload.state === "hidden",
		);
	});
	test("allows public mutation reconciliation in write recovery profiles", () => {
		activateProfile("write-preflight");
		assert.equal(assertActionActive("ascet_recover", "reconcile_mutation")?.id, "ascet_recover.reconcile_mutation");
	});
});

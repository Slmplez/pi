import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveProfileTools } from "../exposure/profiles.ts";
import { AscetActionUnavailableError, assertActionActive, extractToolAction } from "./guard.ts";

const env: Record<string, string | undefined> = {};
const baseContext = {
	env,
	activeProfile: "base" as const,
	activeTools: resolveProfileTools("base", env),
};
const writeContext = {
	env,
	activeProfile: "write-preflight" as const,
	activeTools: resolveProfileTools("write-preflight", env),
};
const opsContext = {
	env,
	activeProfile: "ops" as const,
	activeTools: resolveProfileTools("ops", env),
};

describe("ASCET action runtime guard", () => {
	test("extracts action or mode without retired tool special cases", () => {
		assert.equal(extractToolAction("ascet_get", { action: "tree" }), "tree");
		assert.equal(extractToolAction("ascet_search", { action: "search", mode: "element" }), "search");
		assert.equal(extractToolAction("ascet_capabilities", {}), "search_actions");
		assert.equal(extractToolAction("ascet_scheduler_status", {}), "status");
		assert.equal(extractToolAction("ascet_status", {}), "status");
		assert.equal(extractToolAction("configure_parameter_dependency_chain", {}), "default");
	});

	test("allows only the public Get actions", () => {
		assert.equal(assertActionActive("ascet_get", "tree", baseContext)?.id, "ascet_get.tree");
		assert.equal(assertActionActive("ascet_get", "formulas", baseContext)?.id, "ascet_get.formulas");
		assert.throws(
			() => assertActionActive("ascet_get", "database_identity", baseContext),
			(error) =>
				error instanceof AscetActionUnavailableError &&
				error.payload.tool === "ascet_get" &&
				error.payload.action === "database_identity" &&
				error.payload.state === "hidden",
		);
	});

	test("exposes create_dependent_chain through ascet_edit and retires the composite tool", () => {
		assert.equal(
			assertActionActive("ascet_edit", "create_dependent_chain", writeContext)?.id,
			"ascet_edit.create_dependent_chain",
		);
		assert.equal(assertActionActive("configure_parameter_dependency_chain", "execute", writeContext), undefined);
	});

	test("allows public mutation reconciliation in write recovery profiles", () => {
		assert.equal(
			assertActionActive("ascet_recover", "reconcile_mutation", opsContext)?.id,
			"ascet_recover.reconcile_mutation",
		);
	});
});

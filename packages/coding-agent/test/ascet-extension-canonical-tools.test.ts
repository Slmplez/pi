import { Value } from "typebox/value";
import { describe, expect, it } from "vitest";
import { ascetGetParameters } from "../../ascet-extension/src/get.ts";
import { listAscetRoutesForTool, routeAscetAction } from "../../ascet-extension/src/routing/router.ts";
import { listActionCatalogEntries } from "../../ascet-extension/src/tools/actions/catalog.ts";
import { resolveProfileTools } from "../../ascet-extension/src/tools/exposure/profiles.ts";
import { canonicalAscetToolNames } from "../../ascet-extension/src/tools/registry.ts";

const GET_ACTIONS = [
	"tree",
	"elements",
	"formulas",
	"component_refs",
	"bde_edges",
	"import_binding",
	"dbitem_refs",
] as const;

describe("ASCET canonical PI tools", () => {
	it("exposes ascet_get as the only live discovery tool", () => {
		expect(canonicalAscetToolNames).toEqual([
			"ascet_status",
			"ascet_capabilities",
			"ascet_recover",
			"ascet_scheduler_status",
			"ascet_get",
			"ascet_read",
			"ascet_diff",
			"ascet_edit",
			"configure_parameter_dependency_chain",
		]);
	});

	it("routes every get action through a pooled read backend operation", () => {
		for (const action of GET_ACTIONS) {
			const route = routeAscetAction({ toolName: "ascet_get", action });
			expect(route.operation).toBe(`get_${action}`);
			expect(route.logicalCommandId).toMatch(/^AscetGet/);
		}
		expect(listAscetRoutesForTool("ascet_get")).toHaveLength(GET_ACTIONS.length);
	});

	it("keeps Element and Formula requests unbounded by result count", () => {
		expect(Value.Check(ascetGetParameters, { action: "elements", target: { path: "DEMO\\Component" } })).toBe(true);
		expect(Value.Check(ascetGetParameters, { action: "formulas", target: { path: "DEMO\\Project" } })).toBe(true);
		const schema = JSON.stringify(ascetGetParameters);
		expect(schema).not.toContain("maxItems");
	});

	it("activates Pi find, grep, read, and ascet_get in every profile", () => {
		for (const profile of [
			"base",
			"advanced-read",
			"reference",
			"diff",
			"write-preflight",
			"batch-write",
			"component-edit",
			"ops",
		] as const) {
			const tools = resolveProfileTools(profile, {});
			expect(tools).toEqual(expect.arrayContaining(["find", "grep", "read", "ascet_get"]));
		}
	});

	it("publishes concise get action catalog entries", () => {
		const entries = listActionCatalogEntries().filter((entry) => entry.tool === "ascet_get");
		expect(entries.map((entry) => entry.action).sort()).toEqual([...GET_ACTIONS, "database_catalog"].sort());
		for (const entry of entries) {
			expect(entry.family).toBe("get");
			expect(entry.result.shape).toBe("observation");
		}
	});
});

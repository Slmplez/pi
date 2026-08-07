import { describe, expect, it } from "vitest";
import { listAscetRoutesForTool } from "../../ascet-extension/src/routing/router.ts";

const EXPECTED_GET_ACTIONS = [
	"tree",
	"elements",
	"formulas",
	"component_refs",
	"bde_edges",
	"import_binding",
	"dbitem_refs",
] as const;

describe("ASCET Copilot routing", () => {
	it("maps the on-demand discovery surface to get operations", () => {
		const routes = listAscetRoutesForTool("ascet_get");
		expect(routes.map((route) => route.action).sort()).toEqual([...EXPECTED_GET_ACTIONS].sort());
		expect(routes.map((route) => route.operation).sort()).toEqual(
			EXPECTED_GET_ACTIONS.map((action) => `get_${action}`).sort(),
		);
	});
});

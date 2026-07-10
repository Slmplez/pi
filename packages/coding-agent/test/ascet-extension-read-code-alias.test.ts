import { describe, expect, it } from "vitest";
import { resolveAscetBackendCommandId } from "../../ascet-extension/src/routing/command-aliases.ts";
import { routeAscetAction } from "../../ascet-extension/src/routing/router.ts";

describe("ASCET read_code logical command alias", () => {
	it("keeps AscetReadCode model-facing while using AscetReadTextCode backend", () => {
		expect(resolveAscetBackendCommandId("AscetReadCode")).toBe("AscetReadTextCode");
		expect(routeAscetAction({ toolName: "ascet_read", action: "read_code" })).toMatchObject({
			logicalCommandId: "AscetReadCode",
			backendCommandId: "AscetReadTextCode",
			operation: "read_code",
		});
	});
});

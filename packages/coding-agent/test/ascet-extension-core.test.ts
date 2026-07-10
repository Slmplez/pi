import { describe, expect, it } from "vitest";
import { normalizeAscetPath } from "../../ascet-extension/src/core/path.ts";
import { createPreflightOutcome, isAscetOutcome } from "../../ascet-extension/src/core/results.ts";

describe("ASCET extension core helpers", () => {
	it("normalizes slash paths before CLI invocation", () => {
		expect(normalizeAscetPath("DEMO/PID")).toBe("DEMO\\PID");
		expect(normalizeAscetPath("DEMO\\PID")).toBe("DEMO\\PID");
	});

	it("represents preflight as a non-error outcome", () => {
		const outcome = createPreflightOutcome({ operation: "create_folder", target: "DEMO\\X" });

		expect(outcome.status).toBe("preflight");
		expect(isAscetOutcome(outcome)).toBe(true);
	});
});

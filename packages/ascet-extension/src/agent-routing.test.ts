import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { appendAscetImplementationRoutingPrompt, isAscetImplementationRoutingRequest } from "./agent-routing.ts";

describe("ASCET implementation agent routing", () => {
	test("matches ASCET ESDL implementation requests", () => {
		assert.equal(
			isAscetImplementationRoutingRequest(
				"Create an ASCET ESDL method and configure dependent Local parameters for this class.",
			),
			true,
		);
	});

	test("does not route ASCET full-check workflows to the writable implementation agent", () => {
		assert.equal(
			isAscetImplementationRoutingRequest(
				"/skill:ascet-full-check run a full check for BDE signal mappings and implementation rules",
			),
			false,
		);
	});

	test("appends routing guidance once", () => {
		const base = "Base system prompt.";
		const routed = appendAscetImplementationRoutingPrompt(base);

		assert.match(routed, /delegate the task to the package subagent `ascet-implementation`/);
		assert.equal(appendAscetImplementationRoutingPrompt(routed), routed);
	});
});

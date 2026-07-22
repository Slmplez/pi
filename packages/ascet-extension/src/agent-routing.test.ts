import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { appendAscetImplementationRoutingPrompt } from "./agent-routing.ts";

describe("ASCET implementation agent routing", () => {
	test("appends routing guidance once", () => {
		const base = "Base system prompt.";
		const routed = appendAscetImplementationRoutingPrompt(base);
		const appendedPolicy = routed.slice(base.length).trim();
		const policyLines = appendedPolicy.split("\n").filter(Boolean);

		assert.match(routed, /ascet-implementation/);
		assert.ok(policyLines.length <= 5);
		assert.equal(appendAscetImplementationRoutingPrompt(routed), routed);
	});

	test("does not mention full-check workflows", () => {
		const routed = appendAscetImplementationRoutingPrompt("Base system prompt.");

		assert.doesNotMatch(routed, /ascet-full-check/);
		assert.doesNotMatch(routed, /full-check/i);
		assert.doesNotMatch(routed, /full check/i);
	});
});

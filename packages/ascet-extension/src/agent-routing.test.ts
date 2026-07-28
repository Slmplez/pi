import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { appendAscetCodingPolicyPrompt } from "./agent-routing.ts";

describe("ASCET coding policy routing", () => {
	test("appends inline coding guidance once", () => {
		const base = "Base system prompt.";
		const routed = appendAscetCodingPolicyPrompt(base);
		const appendedPolicy = routed.slice(base.length).trim();
		const policyLines = appendedPolicy.split("\n").filter(Boolean);

		assert.match(routed, /ASCET coding policy:/);
		assert.doesNotMatch(routed, /ascet-implementation/);
		assert.match(routed, /Handle ASCET coding inline/);
		assert.match(routed, /ascet_edit/);
		assert.doesNotMatch(routed, /ascet_write/);
		assert.match(routed, /set_method_code/);
		assert.match(
			routed,
			/Local Dependent Parameter -> Imported Parameter -> same-named Exported Parameter -> Provider Class/,
		);
		assert.match(routed, /Physical Range or Implementation Range/);
		assert.ok(policyLines.length <= 80);
		assert.equal(appendAscetCodingPolicyPrompt(routed), routed);
	});

	test("does not mention full-check workflows", () => {
		const routed = appendAscetCodingPolicyPrompt("Base system prompt.");

		assert.doesNotMatch(routed, /ascet-full-check/);
		assert.doesNotMatch(routed, /full-check/i);
		assert.doesNotMatch(routed, /full check/i);
	});
});

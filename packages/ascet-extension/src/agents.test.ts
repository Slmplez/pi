import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildAscetCodingPolicyPrompt } from "./ascet-coding-policy.ts";

const policyPrompt = buildAscetCodingPolicyPrompt();

describe("ASCET coding policy", () => {
	test("is concise Skill-routed guidance instead of subagent routing", () => {
		assert.match(policyPrompt, /ASCET coding policy:/);
		assert.match(policyPrompt, /ascet-engineering Skill/);
		assert.doesNotMatch(policyPrompt, /ascet-implementation/);
		assert.ok(policyPrompt.length >= 1000 && policyPrompt.length <= 1500);
		assert.ok(policyPrompt.split("\n").filter((line) => /^[0-9]+\./.test(line)).length <= 15);
	});

	test("requires planning, bounded evidence, and automatic verification", () => {
		assert.match(policyPrompt, /bounded exact target/);
		assert.match(policyPrompt, /source → transform → consumer/);
		assert.match(policyPrompt, /concrete todolist/);
		assert.match(policyPrompt, /complete implementation plan/);
		assert.match(policyPrompt, /executeWrite=true/);
		assert.match(policyPrompt, /verify automatically/);
		assert.doesNotMatch(policyPrompt, /verifyReadback\s*[:=]/);
	});
});

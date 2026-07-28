import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildAscetCodingPolicyPrompt } from "./ascet-coding-policy.ts";

const policyPrompt = buildAscetCodingPolicyPrompt({ editToolName: "ascet_edit" });

describe("ASCET coding policy", () => {
	test("is inline guidance instead of subagent routing", () => {
		assert.match(policyPrompt, /ASCET coding policy:/);
		assert.match(policyPrompt, /Handle ASCET coding inline/);
		assert.doesNotMatch(policyPrompt, /ascet-implementation/);
		assert.match(policyPrompt, /ascet_edit/);
		assert.match(policyPrompt, /ascet_verify/);
	});

	test("requires design-first implementation output and dependency evidence", () => {
		assert.match(policyPrompt, /Do not start by writing ESDL/);
		assert.match(policyPrompt, /Requirement understanding/);
		assert.match(policyPrompt, /Method plan/);
		assert.match(policyPrompt, /Imported Parameter and Exported Parameter must use the same name/);
		assert.match(
			policyPrompt,
			/Local Dependent Parameter -> Imported Parameter -> same-named Exported Parameter -> Provider Class/,
		);
		assert.match(policyPrompt, /Physical Range or Implementation Range/);
		assert.match(policyPrompt, /PASS/);
		assert.match(policyPrompt, /UNVERIFIED/);
	});
});

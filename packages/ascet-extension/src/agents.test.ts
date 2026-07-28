import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildAscetCodingPolicyPrompt } from "./ascet-coding-policy.ts";

const policyPrompt = buildAscetCodingPolicyPrompt();

describe("ASCET coding policy", () => {
	test("is inline guidance instead of subagent routing", () => {
		assert.match(policyPrompt, /ASCET coding policy:/);
		assert.match(policyPrompt, /Handle ASCET coding inline/);
		assert.doesNotMatch(policyPrompt, /ascet-implementation/);
		assert.match(policyPrompt, /ascet_edit/);
		assert.doesNotMatch(policyPrompt, /ascet_write/);
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

	test("guides ascet_index routing without replacing search read edit or verify", () => {
		assert.match(policyPrompt, /Index lifecycle rules/);
		assert.match(policyPrompt, /ascet_index\.status/);
		assert.match(policyPrompt, /ascet_index\.refresh/);
		assert.match(policyPrompt, /ascet_index\.mark_stale/);
		assert.match(policyPrompt, /ascet_index\.repair_status_file/);
		assert.match(policyPrompt, /ascet_index\.evaluate/);
		assert.match(policyPrompt, /Do not call raw warm_search_index directly/);
		assert.match(
			policyPrompt,
			/Do not use ascet_index as a substitute for ascet_search, ascet_read, ascet_edit, or ascet_verify/,
		);
	});
});

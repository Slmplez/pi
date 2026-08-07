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

	test("routes bounded discovery through ascet_get observations", () => {
		assert.match(policyPrompt, /ascet_get\.tree/);
		assert.match(policyPrompt, /ascet_get\.elements/);
		assert.match(policyPrompt, /ascet_get\.component_refs/);
		assert.match(policyPrompt, /ascet_get\.import_binding/);
		assert.match(policyPrompt, /ascet_get\.formulas/);
		assert.match(policyPrompt, /Pi find, grep, and read/);
		assert.match(policyPrompt, /stored observation/);
	});

	test("requires component editability checks before ASCET mutations", () => {
		assert.match(policyPrompt, /Before modifying any ASCET Class, Module, StateMachine, Enumeration, or component/);
		assert.match(policyPrompt, /mode:"check"/);
		assert.match(policyPrompt, /mode:"set"/);
		assert.match(policyPrompt, /executeWrite:true/);
		assert.match(policyPrompt, /Use action for mutations, not editability/);
	});
});

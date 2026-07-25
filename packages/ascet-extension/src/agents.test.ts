import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { describe, test } from "node:test";

const implementationAgent = readFileSync(new URL("../agents/ascet-implementation.md", import.meta.url), "utf8");

describe("ASCET implementation agent", () => {
	test("is packaged as a writable ASCET ESDL implementation subagent", () => {
		assert.match(implementationAgent, /name: ascet-implementation/);
		assert.match(implementationAgent, /Use proactively for ASCET ESDL coding and implementation tasks/);
		assert.match(implementationAgent, /ascet_write/);
		assert.doesNotMatch(implementationAgent, /ascet_batch_write/);
		assert.match(implementationAgent, /ascet_verify/);
	});

	test("requires design-first implementation output and dependency evidence", () => {
		assert.match(implementationAgent, /Do not start by writing ESDL/);
		assert.match(implementationAgent, /Required Work Order/);
		assert.match(implementationAgent, /Method \| Action \| Method Kind \| Signature/);
		assert.match(implementationAgent, /Imported Parameter and Exported Parameter must have the same name/);
		assert.match(implementationAgent, /Only `scope=Exported` elements are valid provider candidates/);
		assert.match(implementationAgent, /Physical Range or Implementation Range, exactly one/);
		assert.match(implementationAgent, /PASS/);
		assert.match(implementationAgent, /UNVERIFIED/);
	});
});

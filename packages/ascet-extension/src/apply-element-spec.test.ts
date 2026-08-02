import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { buildApplyElementSpecArgs, createApplyElementSpecSummary } from "./apply-element-spec.ts";

describe("apply_element_spec verification defaults", () => {
	test("requests live readback when verifyReadback is omitted", () => {
		const args = buildApplyElementSpecArgs({
			componentPath: "Demo/Controller",
			specFile: "element-spec.json",
		});

		assert.deepEqual(args.slice(-2), ["--verify-readback", "--json"]);
		assert.match(
			createApplyElementSpecSummary({ componentPath: "Demo/Controller", specFile: "element-spec.json" }),
			/verifyReadback: true/,
		);
	});

	test("supports an explicit no-verify opt-out", () => {
		const args = buildApplyElementSpecArgs({
			componentPath: "Demo/Controller",
			specFile: "element-spec.json",
			verifyReadback: false,
		});

		assert.deepEqual(args.slice(-2), ["--no-verify-readback", "--json"]);
	});
});

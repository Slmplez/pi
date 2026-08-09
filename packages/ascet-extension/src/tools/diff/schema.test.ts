import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import { ascetDiffTool } from "./definition.ts";
import { type AscetDiffParams, ascetDiffParameters } from "./schema.ts";

describe("ascet_diff schema", () => {
	test("requires action-specific fields", () => {
		assert.equal(Value.Check(ascetDiffParameters, { action: "diff" }), false);
		assert.equal(Value.Check(ascetDiffParameters, { action: "diff_method" }), false);
		assert.equal(Value.Check(ascetDiffParameters, { action: "diff_element_spec" }), false);
		assert.equal(
			Value.Check(ascetDiffParameters, {
				action: "diff_method",
				leftPath: "DEMO\\Left",
				rightPath: "DEMO\\Right",
				methodName: "calc",
				timeoutMs: 30_000,
			}),
			true,
		);
	});

	test("rejects fields from a different action", () => {
		assert.equal(
			Value.Check(ascetDiffParameters, {
				action: "diff_element_spec",
				componentPath: "DEMO\\PID",
				specFile: "pid.json",
				leftPath: "unexpected",
			}),
			false,
		);
	});
	test("returns a structured invalid-parameters result before execution", async () => {
		const result = await ascetDiffTool.execute(
			"call-invalid",
			{ action: "diff_method" } as AscetDiffParams,
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd() },
		);

		const details = result.details as { error?: { code?: string } };
		assert.equal(details.error?.code, "ascet_invalid_parameters");
		assert.match(result.content[0]?.text ?? "", /ascet_invalid_parameters/);
	});
});

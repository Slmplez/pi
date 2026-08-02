import assert from "node:assert/strict";
import test from "node:test";
import { summarizeVerificationChecks } from "./verdict.ts";

test("returns passed only when every evidence check passes", () => {
	const result = summarizeVerificationChecks([
		{ id: "build", status: "passed" },
		{ id: "runtime", status: "passed" },
		{ id: "gtest", status: "passed" },
	]);
	assert.equal(result.verdict, "passed");
	assert.equal(result.failureCode, "");
});

test("returns the first deterministic failure and never masks it", () => {
	const result = summarizeVerificationChecks([
		{
			id: "build",
			status: "failed",
			code: "c_compile_failed",
			message: "C failed",
			evidencePath: "build-result.json",
		},
		{
			id: "runtime",
			status: "failed",
			code: "runtime_failed",
			message: "runtime failed",
			evidencePath: "run-result.json",
		},
	]);
	assert.equal(result.verdict, "failed");
	assert.equal(result.failureCode, "c_compile_failed");
	assert.equal(result.firstFailure?.evidencePath, "build-result.json");
});

test("rejects an empty evidence check list", () => {
	const result = summarizeVerificationChecks([]);
	assert.equal(result.verdict, "failed");
	assert.equal(result.failureCode, "evidence_invalid");
});

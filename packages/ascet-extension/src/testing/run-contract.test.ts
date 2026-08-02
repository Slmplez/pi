import assert from "node:assert/strict";
import test from "node:test";
import {
	isPassedRunResult,
	isPassedVerifyResult,
	validateAscetRunRequest,
	validateAscetVerificationOptions,
} from "./run-contract.ts";

test("accepts a bounded run request with runtime paths", () => {
	const result = validateAscetRunRequest({
		runId: "run-001",
		buildResultPath: "tmp/run-001/build-result.json",
		run: { timeoutMs: 30_000, args: ["--gtest_color=no"], runtimePath: ["C:/TDM-GCC-64/bin"] },
	});
	assert.deepEqual(result.errors, []);
	assert.equal(result.value?.run.timeoutMs, 30_000);
});

test("rejects missing build result and invalid timeout", () => {
	const result = validateAscetRunRequest({ runId: "run-001", run: { timeoutMs: 0 } });
	assert.ok(result.errors.some((error) => error.code === "required" && error.path === "buildResultPath"));
	assert.ok(result.errors.some((error) => error.code === "invalid_timeout"));
});

test("rejects unsafe runtime and XML evidence paths", () => {
	const run = validateAscetRunRequest({
		runId: "run-001",
		buildResultPath: "tmp/run-001/build-result.json",
		run: { runtimePath: ["tmp/../outside"] },
	});
	assert.ok(run.errors.some((error) => error.code === "unsafe_path"));

	const verify = validateAscetVerificationOptions({
		profile: "offline",
		esdlReadbackPath: "tmp/../outside/readback.json",
	});
	assert.ok(verify.errors.some((error) => error.code === "unsafe_path"));
});

test("requires ESDL readback for live verification", () => {
	const result = validateAscetVerificationOptions({ profile: "live" });
	assert.ok(result.errors.some((error) => error.code === "readback_required"));
});

test("recognizes only complete passing run and verify results", () => {
	assert.equal(
		isPassedRunResult({
			schemaVersion: "ascet-test-run/v1",
			status: "passed",
			exitCode: 0,
			xmlValid: true,
			testsRun: 1,
			failures: 0,
			errors: 0,
		}),
		true,
	);
	assert.equal(
		isPassedRunResult({
			schemaVersion: "ascet-test-run/v1",
			status: "passed",
			exitCode: 0,
			xmlValid: true,
			testsRun: 0,
			failures: 0,
			errors: 0,
		}),
		false,
	);
	assert.equal(
		isPassedVerifyResult({
			schemaVersion: "ascet-test-verify/v1",
			status: "verified",
			verdict: "passed",
			checks: [],
			failureCode: "",
		}),
		true,
	);
});

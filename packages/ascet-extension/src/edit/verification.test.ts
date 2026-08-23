import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliJsonResult } from "../cli.ts";
import { classifyAscetEditExecution, extractAscetEditVerification } from "./verification.ts";

function createRawResult(overrides: Partial<AscetCliJsonResult>): AscetCliJsonResult {
	return {
		ok: false,
		data: null,
		request: { cwd: ".", cliPath: "ascet", args: [] },
		stdout: "",
		stderr: "",
		exitCode: 1,
		timedOut: false,
		...overrides,
	};
}

describe("ASCET edit verification", () => {
	test("reads only exact top-level readback booleans", () => {
		assert.deepEqual(extractAscetEditVerification({ verifyReadbackRequested: true, readbackVerified: true }), {
			mode: "automatic_readback",
			source: "write_command",
			required: true,
			requested: true,
			verified: true,
			status: "passed",
		});
		assert.equal(
			extractAscetEditVerification({ result: { verifyReadbackRequested: true, readbackVerified: true } }).status,
			"missing",
		);
	});

	test("reports failed verification when readback was requested but mismatched", () => {
		assert.equal(
			extractAscetEditVerification({ verifyReadbackRequested: true, readbackVerified: false }).status,
			"failed",
		);
	});

	test("reports missing verification evidence when the flags are incomplete", () => {
		assert.deepEqual(extractAscetEditVerification({ readbackVerified: true }), {
			mode: "automatic_readback",
			source: "write_command",
			required: true,
			requested: null,
			verified: true,
			status: "missing",
		});
	});

	test("classifies a verified successful write as applied and invalidating", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				ok: true,
				data: { verifyReadbackRequested: true, readbackVerified: true },
				exitCode: 0,
			}),
		);

		assert.equal(classification.mutationStatus, "applied");
		assert.equal(classification.verification.status, "passed");
		assert.equal(classification.shouldInvalidateObservations, true);
	});

	test("classifies a successful write with failed readback as applied and failed", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				ok: true,
				data: { verifyReadbackRequested: true, readbackVerified: false },
				exitCode: 0,
			}),
		);

		assert.equal(classification.mutationStatus, "applied");
		assert.equal(classification.verification.status, "failed");
		assert.equal(classification.shouldInvalidateObservations, true);
	});

	test("classifies a successful write without proof as applied and missing", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({ ok: true, data: { writeSucceeded: true }, exitCode: 0 }),
		);

		assert.equal(classification.mutationStatus, "applied");
		assert.equal(classification.verification.status, "missing");
		assert.equal(classification.shouldInvalidateObservations, true);
	});

	test("classifies readback mismatch as applied, failed, and invalidating", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				error: { code: "readback_mismatch", message: "readback differs" },
			}),
		);

		assert.deepEqual(classification, {
			mutationStatus: "applied",
			consistencyStatus: "unknown",
			verification: {
				mode: "automatic_readback",
				source: "write_command",
				required: true,
				requested: true,
				verified: false,
				status: "failed",
			},
			rollback: { required: false, status: "not_required", verified: true },
			shouldInvalidateObservations: true,
		});
	});

	test("classifies an explicit not-started write without invalidation", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({ error: { code: "write_not_started", message: "not started" } }),
		);

		assert.equal(classification.mutationStatus, "not_started");
		assert.equal(classification.verification.status, "unknown");
		assert.equal(classification.shouldInvalidateObservations, false);
	});

	test("classifies requiresReadback false as not started without invalidation", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				error: {
					code: "ascet_cli_failed",
					message: "write was not dispatched",
					details: { requiresReadback: false },
				},
			}),
		);

		assert.equal(classification.mutationStatus, "not_started");
		assert.equal(classification.verification.status, "unknown");
		assert.equal(classification.shouldInvalidateObservations, false);
	});

	test("classifies unknown write outcomes as unknown and invalidating", () => {
		for (const error of [
			{ code: "write_outcome_unknown", message: "outcome unknown" },
			{ code: "ascet_cli_failed", message: "dispatched", details: { requiresReadback: true } },
			{ code: "ascet_cli_failed", message: "unexpected failure" },
		]) {
			const classification = classifyAscetEditExecution(createRawResult({ error }));
			assert.equal(classification.mutationStatus, "unknown");
			assert.equal(classification.verification.status, "unknown");
			assert.equal(classification.shouldInvalidateObservations, true);
		}
	});
	test("classifies a verified compensating rollback as restored", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				ok: true,
				data: {
					status: "rolled_back",
					rollback: { required: true, status: "passed", verified: true },
				},
				exitCode: 0,
			}),
		);

		assert.deepEqual(classification, {
			mutationStatus: "rolled_back",
			consistencyStatus: "restored",
			verification: {
				mode: "automatic_readback",
				source: "write_command",
				required: true,
				requested: null,
				verified: null,
				status: "unknown",
			},
			rollback: { required: true, status: "passed", verified: true },
			shouldInvalidateObservations: true,
		});
	});

	test("classifies an Element transaction rolled-back error as restored", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				error: {
					code: "element_transaction_rolled_back",
					message: "previous Element state restored",
				},
			}),
		);

		assert.equal(classification.mutationStatus, "rolled_back");
		assert.equal(classification.consistencyStatus, "restored");
		assert.deepEqual(classification.rollback, { required: true, status: "passed", verified: true });
		assert.equal(classification.shouldInvalidateObservations, true);
	});

	test("classifies a Method consistency rollback as restored", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				error: {
					code: "method_consistency_rolled_back",
					message: "Method consistency validation failed and previous code was restored.",
				},
			}),
		);
		assert.equal(classification.mutationStatus, "rolled_back");
		assert.equal(classification.consistencyStatus, "restored");
		assert.equal(classification.rollback.status, "passed");
	});

	test("classifies a failed rollback as unknown consistency", () => {
		const classification = classifyAscetEditExecution(
			createRawResult({
				error: {
					code: "element_transaction_rollback_failed",
					message: "rollback failed",
					details: { rollback: { required: true, status: "failed", verified: false } },
				},
			}),
		);

		assert.equal(classification.mutationStatus, "unknown");
		assert.equal(classification.consistencyStatus, "unknown");
		assert.deepEqual(classification.rollback, { required: true, status: "failed", verified: false });
		assert.equal(classification.shouldInvalidateObservations, true);
	});
	test("classifies explicit guarded mutation metadata", () => {
		const partial = classifyAscetEditExecution(
			createRawResult({
				error: {
					code: "create_method_failed",
					message: "failed after editability acquisition",
					details: { mutationStatus: "partially_applied", verificationStatus: "unknown" },
				},
			}),
		);
		assert.equal(partial.mutationStatus, "partially_applied");
		assert.equal(partial.verification.status, "unknown");
		assert.equal(partial.shouldInvalidateObservations, true);

		const noOp = classifyAscetEditExecution(
			createRawResult({
				ok: true,
				data: { mutationStatus: "no_op", verificationStatus: "passed" },
				exitCode: 0,
			}),
		);
		assert.equal(noOp.mutationStatus, "no_op");
		assert.equal(noOp.verification.status, "passed");
		assert.equal(noOp.shouldInvalidateObservations, false);
	});
});

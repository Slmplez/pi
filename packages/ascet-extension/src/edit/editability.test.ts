import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import {
	buildAscetEditabilityArgs,
	formatAscetEditabilityResult,
	getAscetEditabilityOperation,
	runApprovedAscetEditability,
	runAscetEditability,
} from "./editability.ts";

function execution(
	request: AscetCliRequest,
	result: unknown,
	exitCode = 0,
	error: unknown = null,
): AscetCliExecutionResult {
	return {
		exitCode,
		stdout: JSON.stringify({
			type: "response",
			protocolVersion: 1,
			ok: exitCode === 0,
			result,
			error,
			meta: {
				bridgePid: 1,
				bridgeGeneration: "test",
				durationMs: 1,
				sessionPolicy: "fresh_session",
				mutationStarted: exitCode === 0 ? false : null,
			},
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

function checkResult(editable: boolean) {
	return {
		outcome: "succeeded",
		editable,
		mutationStatus: "read_only",
		changed: false,
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_scm_state",
		sessionCount: 1,
		nativeMutationAttemptCount: 0,
	};
}

function setResult(overrides: Record<string, unknown> = {}) {
	return {
		outcome: "succeeded",
		editable: true,
		beforeEditable: false,
		afterEditable: true,
		changed: true,
		mutationStatus: "applied",
		saveAttempted: false,
		saveSucceeded: false,
		saveState: "not_applicable",
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_scm_state",
		sessionCount: 1,
		saveCount: 0,
		nativeMutationAttemptCount: 1,
		nativeScmOperationCount: 1,
		editableRetryCount: 0,
		nativeOperations: [{ name: "Lock", attempted: true, returned: true, threw: false }],
		recovery: { required: false, actions: [] },
		...overrides,
	};
}

describe("ASCET editability actions", () => {
	test("keeps check and set as mode-discriminated edit actions", () => {
		assert.equal(getAscetEditabilityOperation("check"), "component_editable_check");
		assert.equal(getAscetEditabilityOperation("set"), "component_editable_set");
		assert.deepEqual(buildAscetEditabilityArgs({ mode: "check", componentPath: "\\DEMO\\PID" }), [
			"exec",
			"component_editable_check",
			"DEMO\\PID",
			"--json",
		]);
	});

	test("check normalizes the path and returns the strict read-only envelope", async () => {
		let observedArgs: string[] | undefined;
		let confirmationCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "check", componentPath: "\\DEMO\\PID" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return execution(request, checkResult(true));
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmationCalls += 1;
						return true;
					},
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(result.data, checkResult(true));
		assert.equal(confirmationCalls, 0);
		assert.deepEqual(observedArgs, ["exec", "component_editable_check", "DEMO\\PID", "--json"]);
	});

	test("rejects intent on mode=check as a read-only contract error", async () => {
		let calls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "check", componentPath: "DEMO/PID", intent: "apply" } as never,
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls += 1;
					return execution(request, checkResult(true));
				},
			},
			{},
		);
		assert.equal(result.ok, false);
		assert.equal(result.data, null);
		assert.equal(result.error?.code, "ascet_edit_invalid_parameter");
		assert.equal(calls, 0);
	});

	test("set preview is rejected before Bridge and denied apply has canonical not-started evidence", async () => {
		for (const intent of ["preview", undefined, "unknown"] as const) {
			let previewCalls = 0;
			const preview = await runApprovedAscetEditability(
				{ mode: "set", componentPath: "DEMO/PID", intent } as never,
				{
					cwd: process.cwd(),
					executeCli: async (request) => {
						previewCalls += 1;
						return execution(request, setResult());
					},
				},
				{},
			);
			assert.equal(preview.ok, false);
			assert.equal(preview.error?.code, "ascet_edit_invalid_parameter");
			assert.equal((preview.data as { mutationStatus?: string }).mutationStatus, "not_started");
			assert.equal(previewCalls, 0);
		}

		let applyCliCalls = 0;
		const denied = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					applyCliCalls += 1;
					return execution(request, setResult());
				},
			},
			{ hasUI: true, ui: { confirm: async () => false } },
		);
		assert.equal(denied.error?.code, "ascet_edit_confirmation_not_granted");
		assert.equal(applyCliCalls, 0);
		assert.deepEqual(denied.data, {
			outcome: "failed",
			editable: null,
			beforeEditable: null,
			afterEditable: null,
			changed: false,
			mutationStatus: "not_started",
			saveAttempted: false,
			saveSucceeded: false,
			saveState: "not_applicable",
			verified: false,
			verificationStatus: "not_applicable",
			verificationMode: "same_session_scm_state",
			sessionCount: 0,
			saveCount: 0,
			nativeMutationAttemptCount: 0,
			nativeScmOperationCount: 0,
			editableRetryCount: 0,
			nativeOperations: [],
			error: {
				code: "ascet_edit_confirmation_not_granted",
				message: "ASCET edit confirmation was not granted.",
			},
			recovery: { required: false, actions: [] },
		});
	});

	test("set never starts its CLI write after cancellation during confirmation", async () => {
		const toolRun = new AbortController();
		let setCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				signal: toolRun.signal,
				executeCli: async (request) => {
					setCalls += 1;
					return execution(request, setResult());
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						toolRun.abort();
						return true;
					},
				},
			},
		);
		assert.equal(setCalls, 0);
		assert.equal(result.error?.code, "ascet_edit_operation_aborted_before_write");
		assert.equal((result.data as { mutationStatus?: string }).mutationStatus, "not_started");
	});

	test("set asks before Bridge and returns one canonical SCM result", async () => {
		let confirmations = 0;
		let setCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "component_editable_set") setCalls += 1;
					return execution(request, setResult());
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations += 1;
						return true;
					},
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(result.data, setResult());
		assert.equal(confirmations, 1);
		assert.equal(setCalls, 1);
	});

	test("rejects an empty normalized path without throwing or entering Bridge", async () => {
		let calls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "  ", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls += 1;
					return execution(request, setResult());
				},
			},
			{},
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "ascet_edit_invalid_parameter");
		assert.equal((result.data as { mutationStatus?: string }).mutationStatus, "not_started");
		assert.equal((result.data as { sessionCount?: number }).sessionCount, 0);
		assert.equal(calls, 0);
	});

	test("normalizes malformed set output into a strict unknown-outcome envelope", async () => {
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{ cwd: process.cwd(), executeCli: async (request) => execution(request, { editable: true }) },
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "ascet_edit_invalid_output");
		assert.deepEqual(result.data, {
			outcome: "failed",
			editable: true,
			beforeEditable: null,
			afterEditable: null,
			changed: false,
			mutationStatus: "outcome_unknown",
			saveAttempted: false,
			saveSucceeded: false,
			saveState: "not_applicable",
			verified: false,
			verificationStatus: "unknown",
			verificationMode: "same_session_scm_state",
			sessionCount: 1,
			saveCount: 0,
			nativeMutationAttemptCount: 1,
			nativeScmOperationCount: 0,
			editableRetryCount: 0,
			nativeOperations: [],
			error: {
				code: "ascet_edit_invalid_output",
				message:
					"component_editable_set returned a result that does not satisfy the canonical editability contract.",
			},
			recovery: {
				required: true,
				actions: ["Inspect the SCM state for the target before retrying editability acquisition."],
			},
		});
	});

	test("rejects legacy boolean, bare object, and nested payload compatibility shapes", async () => {
		for (const cliResult of [false, { editable: true }, { result: false }, { result: { editable: true } }]) {
			const result = await runAscetEditability(
				{ mode: "check", componentPath: "DEMO/PID" },
				{ cwd: process.cwd(), executeCli: async (request) => execution(request, cliResult) },
			);
			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_edit_invalid_output");
		}
	});

	test("preserves a structured partial SCM failure payload", async () => {
		const partial = setResult({
			outcome: "failed",
			editable: false,
			afterEditable: false,
			changed: false,
			mutationStatus: "partial_failure",
			verified: false,
			verificationStatus: "unknown",
			nativeScmOperationCount: 2,
			editableRetryCount: 0,
			error: { code: "partial_failure", message: "CreateEdition failed." },
			recovery: { required: true, actions: ["Release reservation."] },
		});
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					execution(request, partial, 2, { code: "partial_failure", message: "CreateEdition failed." }),
			},
		);
		assert.equal(result.ok, false);
		assert.deepEqual(result.data, partial);
		assert.deepEqual(JSON.parse(formatAscetEditabilityResult(result)), partial);
	});

	test("rejects missing canonical editability fields", async () => {
		const result = await runAscetEditability(
			{ mode: "check", componentPath: "DEMO/PID" },
			{ cwd: process.cwd(), executeCli: async (request) => execution(request, { editable: false }) },
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "ascet_edit_invalid_output");
	});
});

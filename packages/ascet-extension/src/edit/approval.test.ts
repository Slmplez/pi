import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { requestAscetEditApproval } from "./approval.ts";

const request = {
	title: "Confirm ASCET edit",
	message: "Apply one edit.",
};

describe("ASCET edit approval", () => {
	test("returns a canonical preflight result without calling the UI", async () => {
		let confirmationCalls = 0;
		const result = await requestAscetEditApproval(request, {
			hasUI: true,
			ui: {
				async confirm() {
					confirmationCalls += 1;
					return true;
				},
			},
		});

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_preflight_required",
			message: "ASCET edit was not executed. Re-run with executeWrite=true to request interactive confirmation.",
		});
		assert.equal(confirmationCalls, 0);
	});

	test("requires a confirmation UI for requested edits", async () => {
		const result = await requestAscetEditApproval({ ...request, executeWrite: true }, {});

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_ui_required",
			message: "ASCET edit requires interactive confirmation; this context has no confirmation UI.",
		});
	});

	test("does not pass an already-cancelled tool-run signal to the confirmation UI", async () => {
		const toolRun = new AbortController();
		toolRun.abort();
		let confirmationSignal: AbortSignal | undefined;

		await requestAscetEditApproval(
			{ ...request, executeWrite: true, signal: toolRun.signal },
			{
				hasUI: true,
				ui: {
					async confirm(_title, _message, options) {
						confirmationSignal = options?.signal;
						return true;
					},
				},
			},
		);

		assert.equal(confirmationSignal, undefined);
	});

	test("blocks the write after confirmation when its tool run was already cancelled", async () => {
		const toolRun = new AbortController();
		toolRun.abort();
		let confirmationCalls = 0;
		const result = await requestAscetEditApproval(
			{ ...request, executeWrite: true, signal: toolRun.signal },
			{
				hasUI: true,
				ui: {
					async confirm() {
						confirmationCalls += 1;
						return true;
					},
				},
			},
		);

		assert.equal(confirmationCalls, 1);
		assert.equal(result.approved, false);
		assert.equal(result.code, "ascet_edit_operation_aborted_before_write");
	});

	test("reports a confirmation that was not granted without claiming user rejection", async () => {
		const result = await requestAscetEditApproval(
			{ ...request, executeWrite: true, errorPrefix: "ascet_batch_write" },
			{
				hasUI: true,
				ui: {
					async confirm() {
						return false;
					},
				},
			},
		);

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_batch_write_confirmation_not_granted",
			message: "ASCET edit confirmation was not granted.",
		});
	});

	test("reports a confirmation UI failure separately from a response that was not granted", async () => {
		const result = await requestAscetEditApproval(
			{ ...request, executeWrite: true },
			{
				hasUI: true,
				ui: {
					async confirm() {
						throw new Error("renderer disconnected");
					},
				},
			},
		);

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_confirmation_ui_failed",
			message: "ASCET edit confirmation UI failed: renderer disconnected",
		});
	});
});

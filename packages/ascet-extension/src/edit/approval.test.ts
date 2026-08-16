import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { requestAscetEditApproval } from "./approval.ts";

const request = {
	title: "Confirm ASCET edit",
	message: "Apply one edit.",
};

describe("ASCET edit approval adapter", () => {
	test("maps a missing UI to approval_required", async () => {
		const result = await requestAscetEditApproval(request, {});

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_approval_required",
			message: "This operation requires an interactive approval channel.",
		});
	});

	test("passes the tool-run signal to the confirmation UI without a fixed timeout", async () => {
		const toolRun = new AbortController();
		let confirmationSignal: AbortSignal | undefined;
		let confirmationTimeout: number | undefined;

		await requestAscetEditApproval(
			{ ...request, signal: toolRun.signal },
			{
				hasUI: true,
				ui: {
					async confirm(_title, _message, options) {
						confirmationSignal = options?.signal;
						confirmationTimeout = options?.timeout;
						return true;
					},
				},
			},
		);

		assert.equal(confirmationSignal, toolRun.signal);
		assert.equal(confirmationTimeout, undefined);
	});

	test("does not open the dialog when the tool run is already cancelled", async () => {
		const toolRun = new AbortController();
		toolRun.abort();
		let confirmationCalls = 0;
		const result = await requestAscetEditApproval(
			{ ...request, signal: toolRun.signal },
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

		assert.equal(confirmationCalls, 0);
		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_operation_aborted_before_write",
			message: "The operation was cancelled before mutation began.",
		});
	});

	test("maps rejection with the requested error prefix", async () => {
		const result = await requestAscetEditApproval(
			{ ...request, errorPrefix: "ascet_batch_write" },
			{ hasUI: true, ui: { confirm: async () => false } },
		);

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_batch_write_confirmation_not_granted",
			message: "ASCET edit confirmation was not granted.",
		});
	});

	test("maps a UI transport failure without implying approval", async () => {
		const result = await requestAscetEditApproval(request, {
			hasUI: true,
			ui: {
				confirm: async () => {
					throw new Error("renderer disconnected");
				},
			},
		});

		assert.deepEqual(result, {
			approved: false,
			code: "ascet_edit_confirmation_ui_failed",
			message: "ASCET edit confirmation UI failed: renderer disconnected",
		});
	});
});

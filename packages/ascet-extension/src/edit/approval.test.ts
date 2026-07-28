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

	test("reports a rejected confirmation with the caller error prefix", async () => {
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
			code: "ascet_batch_write_rejected",
			message: "ASCET edit was rejected by the user.",
		});
	});
});

import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { requestAscetMutationApproval } from "./approval.ts";

describe("ASCET mutation approval", () => {
	it("returns ui_unavailable without implying approval", async () => {
		assert.deepEqual(await requestAscetMutationApproval({ title: "x", message: "y" }, { hasUI: false }), {
			status: "ui_unavailable",
		});
	});

	it("passes only the request signal and no fixed timeout", async () => {
		const controller = new AbortController();
		let options: { signal?: AbortSignal; timeout?: number } | undefined;
		const result = await requestAscetMutationApproval(
			{ title: "x", message: "y", signal: controller.signal },
			{
				hasUI: true,
				ui: {
					confirm: async (_title, _message, value) => {
						options = value;
						return true;
					},
				},
			},
		);
		assert.equal(result.status, "approved");
		assert.equal(options?.signal, controller.signal);
		assert.equal(options?.timeout, undefined);
	});

	it("distinguishes rejection, cancellation, and UI failure", async () => {
		assert.deepEqual(
			await requestAscetMutationApproval(
				{ title: "x", message: "y" },
				{ hasUI: true, ui: { confirm: async () => false } },
			),
			{ status: "rejected" },
		);
		const controller = new AbortController();
		controller.abort();
		assert.deepEqual(
			await requestAscetMutationApproval(
				{ title: "x", message: "y", signal: controller.signal },
				{ hasUI: true, ui: { confirm: async () => true } },
			),
			{ status: "cancelled" },
		);
		assert.deepEqual(
			await requestAscetMutationApproval(
				{ title: "x", message: "y" },
				{
					hasUI: true,
					ui: {
						confirm: async () => {
							throw new Error("transport");
						},
					},
				},
			),
			{ status: "ui_failed", message: "transport" },
		);
	});
});

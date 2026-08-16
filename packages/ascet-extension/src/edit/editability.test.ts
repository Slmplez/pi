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

function successfulExecution(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify(result),
		stderr: "",
		timedOut: false,
		request,
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

	test("check normalizes the path and never requests confirmation", async () => {
		let observedArgs: string[] | undefined;
		let confirmationCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "check", componentPath: "\\DEMO\\PID" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return successfulExecution(request, { ok: true, result: true, error: null });
				},
			},
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

		assert.equal(result.ok, true);
		assert.equal(result.data, true);
		assert.equal(confirmationCalls, 0);
		assert.deepEqual(observedArgs, ["exec", "component_editable_check", "DEMO\\PID", "--json"]);
	});

	test("set preview checks current state and apply reports confirmation-not-granted", async () => {
		let previewArgs: string[] | undefined;
		const preflight = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "preview" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					previewArgs = request.args;
					return successfulExecution(request, { ok: true, result: false, error: null });
				},
			},
			{},
		);
		assert.equal(preflight.ok, true);
		assert.equal(preflight.data, false);
		assert.deepEqual(previewArgs, ["exec", "component_editable_check", "DEMO\\PID", "--json"]);

		const notGranted = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => successfulExecution(request, { ok: true, result: false, error: null }),
			},
			{
				hasUI: true,
				ui: {
					async confirm() {
						return false;
					},
				},
			},
		);
		assert.equal(notGranted.error?.code, "ascet_edit_confirmation_not_granted");
		assert.deepEqual(notGranted.data, {
			operation: "component_editable_set",
			writeExecuted: false,
			mutation: { status: "not_started" },
			summary: "ASCET editability request:\noperation: component_editable_set\ncomponentPath: DEMO/PID",
		});
	});

	test("set never starts its CLI write after the tool run is cancelled during confirmation", async () => {
		const toolRun = new AbortController();
		let checkCalls = 0;
		let setCalls = 0;
		const resultPromise = runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				signal: toolRun.signal,
				executeCli: async (request) => {
					if (request.args[1] === "component_editable_check") {
						checkCalls += 1;
						return successfulExecution(request, { ok: true, result: false, error: null });
					}
					setCalls += 1;
					return successfulExecution(request, { ok: true, result: true, error: null });
				},
			},
			{
				hasUI: true,
				ui: {
					async confirm() {
						toolRun.abort();
						return true;
					},
				},
			},
		);

		const result = await resultPromise;
		assert.equal(checkCalls, 1);
		assert.equal(setCalls, 0);
		assert.equal(result.error?.code, "ascet_edit_operation_aborted_before_write");
		assert.equal((result.data as { preflightOnly?: boolean } | null)?.preflightOnly, undefined);
	});

	test("set returns a no-op without confirmation when the target is already editable", async () => {
		let confirmations = 0;
		let setCalls = 0;
		const result = await runApprovedAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[1] === "component_editable_set") setCalls += 1;
					return successfulExecution(request, { ok: true, result: true, error: null });
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
		assert.equal(result.data, true);
		assert.equal(confirmations, 0);
		assert.equal(setCalls, 0);
	});
	test("normalizes direct, object, and envelope results to the agent payload", async () => {
		for (const cliResult of [false, { editable: true }, { result: false }, { result: { editable: true } }]) {
			const result = await runAscetEditability(
				{ mode: "check", componentPath: "DEMO/PID" },
				{ cwd: process.cwd(), executeCli: async (request) => successfulExecution(request, cliResult) },
			);
			assert.equal(result.ok, true);
			assert.equal(typeof result.data, "boolean");
			assert.deepEqual(JSON.parse(formatAscetEditabilityResult(result)), { editable: result.data });
		}
	});

	test("treats a successful set response with editable=false as a failed write", async () => {
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO/PID", intent: "preview" },
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					successfulExecution(request, { ok: true, result: { editable: false }, error: null }),
			},
		);

		assert.equal(result.ok, false);
		assert.equal(result.data, false);
		assert.equal(result.error?.code, "component_not_editable");
	});

	test("returns ascet_edit_invalid_output for non-boolean CLI output", async () => {
		const result = await runAscetEditability(
			{ mode: "check", componentPath: "DEMO/PID" },
			{ cwd: process.cwd(), executeCli: async (request) => successfulExecution(request, { rawOutput: "false" }) },
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "ascet_edit_invalid_output");
	});
});

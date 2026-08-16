import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { isAscetEditableWriteGateBlockedCode } from "./editable-write-gate.ts";
import { runAscetEdit } from "./service.ts";

function success(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function completeTree(request: AscetCliRequest): AscetCliExecutionResult {
	return success(request, {
		items: [{ path: "DEMO\\C", oid: "C-1", kind: "class" }],
		coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
		truncated: false,
		database: { name: "DB", path: "C:/Repo/DB" },
	});
}

describe("ASCET editable write gate", () => {
	test("recognizes only the public write-gate error code", () => {
		assert.equal(isAscetEditableWriteGateBlockedCode("editable_write_gate_blocked"), true);
		assert.equal(isAscetEditableWriteGateBlockedCode("component_not_editable"), false);
	});

	test("preview checks editability without dispatching the primary mutation", async () => {
		const requests: AscetCliRequest[] = [];
		const result = await runAscetEdit(
			{ action: "set_method_code", componentPath: "DEMO/C", methodName: "Main", code: "return;", intent: "preview" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					requests.push(request);
					if (request.args[1] === "get_database_identity") {
						return success(request, { database: { name: "DB", path: "C:/Repo/DB" } });
					}
					if (request.args[1] === "get_tree") return completeTree(request);
					if (request.args[1] === "component_editable_check") return success(request, true);
					throw new Error(`Unexpected preview operation ${request.args.join(" ")}`);
				},
			},
			{},
		);

		assert.equal(result.details.outcome.status, "preflight");
		assert.equal(requests.filter((request) => request.args[1] === "component_editable_check").length, 1);
		assert.equal(
			requests.some((request) => request.args[1] === "set_method_code"),
			false,
		);
	});

	test("maps a same-session Bridge editable gate rejection to blocked", async (context) => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-editable-gate-"));
		context.after(() => rmSync(root, { recursive: true, force: true }));
		const requests: AscetCliRequest[] = [];
		const result = await runAscetEdit(
			{
				action: "set_method_code",
				componentPath: "DEMO/C",
				methodName: "Main",
				code: "return;",
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					requests.push(request);
					if (request.args[1] === "get_database_identity") {
						return success(request, { database: { name: "DB", path: "C:/Repo/DB" } });
					}
					if (request.args[1] === "get_tree") return completeTree(request);
					if (request.args[1] === "component_editable_check") return success(request, true);
					return {
						exitCode: 2,
						stdout: JSON.stringify({
							type: "response",
							protocolVersion: 1,
							ok: false,
							result: null,
							error: {
								code: "editable_write_gate_blocked",
								message: "ASCET write blocked because component DEMO/C is not editable.",
							},
							meta: {
								bridgePid: 4321,
								bridgeGeneration: "test-generation",
								durationMs: 1,
								sessionPolicy: "fresh_session",
								mutationStarted: false,
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		assert.ok(requests.length >= 4);
		assert.ok(requests.some((request) => request.args[1] === "component_editable_check"));
		assert.deepEqual(requests.at(-1)?.args.slice(0, 2), ["exec", "set_method_code"]);
		assert.deepEqual(result.details.outcome, {
			status: "blocked",
			code: "editable_write_gate_blocked",
			message: "ASCET write blocked because component DEMO/C is not editable.",
		});
		assert.equal(result.details.observations, undefined);
		assert.equal(result.details.verification, undefined);
		assert.equal(result.details.mutationResult?.status, "blocked");
		assert.equal(result.details.mutationResult?.mutation.status, "not_started");
		assert.equal(result.details.mutationResult?.error?.code, "editable_write_gate_blocked");
	});
});

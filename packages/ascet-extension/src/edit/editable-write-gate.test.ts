import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { isAscetEditableWriteGateBlockedCode } from "./editable-write-gate.ts";
import { runAscetEdit } from "./service.ts";

describe("ASCET editable write gate", () => {
	test("recognizes only the public write-gate error code", () => {
		assert.equal(isAscetEditableWriteGateBlockedCode("editable_write_gate_blocked"), true);
		assert.equal(isAscetEditableWriteGateBlockedCode("component_not_editable"), false);
	});

	test("does not add an editability check to ordinary preflight", async () => {
		let dispatches = 0;
		const result = await runAscetEdit(
			{ action: "set_method_code", componentPath: "DEMO/C", methodName: "Main", code: "return;" },
			{
				cwd: process.cwd(),
				executeCli: async () => {
					dispatches += 1;
					throw new Error("Preflight must not dispatch an editability check.");
				},
			},
			{},
		);

		assert.equal(result.details.outcome.status, "preflight");
		assert.equal(dispatches, 0);
	});

	test("maps a Bridge editable gate rejection to blocked without extra agent fields", async (context) => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-editable-gate-"));
		context.after(() => rmSync(root, { recursive: true, force: true }));
		const requests: AscetCliRequest[] = [];
		const result = await runAscetEdit(
			{
				action: "set_method_code",
				componentPath: "DEMO/C",
				methodName: "Main",
				code: "return;",
				executeWrite: true,
			},
			{
				cwd: process.cwd(),
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					requests.push(request);
					const identityRequest = request.args[1] === "get_database_identity";
					const treeRequest = request.args[1] === "get_tree";
					const success = identityRequest || treeRequest;
					return {
						exitCode: success ? 0 : 2,
						stdout: JSON.stringify({
							type: "response",
							protocolVersion: 1,
							ok: success,
							result: identityRequest
								? { database: { name: "DB", path: "C:/Repo/DB" } }
								: treeRequest
									? {
											items: [{ path: "DEMO\\C", oid: "C-1", kind: "class" }],
											coverage: {
												status: "complete_for_scope",
												completeness: "complete",
												collectorCompleted: true,
											},
											truncated: false,
											database: { name: "DB", path: "C:/Repo/DB" },
										}
									: null,
							error: success
								? null
								: {
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

		assert.ok(requests.length >= 2);
		assert.equal(
			requests.some((request) => request.args[1] === "component_editable_check"),
			false,
		);
		assert.deepEqual(requests.at(-1)?.args.slice(0, 2), ["exec", "set_method_code"]);
		assert.deepEqual(result.details.outcome, {
			status: "blocked",
			code: "editable_write_gate_blocked",
			message: "ASCET write blocked because component DEMO/C is not editable.",
		});
		assert.equal(result.details.observations, undefined);
		assert.equal(result.details.verification, undefined);
		assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
			error: {
				code: "editable_write_gate_blocked",
				message: "ASCET write blocked because component DEMO/C is not editable.",
			},
		});
	});
});

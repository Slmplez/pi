import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { runAscetEdit } from "./service.ts";

function bridgeResult(
	request: AscetCliRequest,
	value: { ok: true; result: Record<string, unknown> } | { ok: false; code: string; message: string },
): AscetCliExecutionResult {
	return {
		exitCode: value.ok ? 0 : 1,
		stdout: JSON.stringify({
			type: "response",
			protocolVersion: 1,
			ok: value.ok,
			result: value.ok ? value.result : null,
			error: value.ok ? null : { code: value.code, message: value.message },
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
}

test("single-call apply reaches the Bridge write path and maps the runtime editable gate to blocked", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-editable-gate-apply-"));
	const requests: AscetCliRequest[] = [];

	try {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO/Controller",
				elementName: "P_Local",
				dependency: "dependent",
				dependencyFormula: "P_Input",
				dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
				variantPolicy: "default",
				intent: "apply",
			},
			{
				cwd: root,
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request) => {
					requests.push(request);
					if (request.args[1] === "get_database_identity") {
						return bridgeResult(request, {
							ok: true,
							result: { database: { name: "DB", path: "C:/Repo/DB" } },
						});
					}
					if (request.args[1] === "get_tree") {
						return bridgeResult(request, {
							ok: true,
							result: {
								items: [{ path: "DEMO\\Controller", oid: "C-1", kind: "module" }],
								coverage: {
									status: "complete_for_scope",
									completeness: "complete",
									collectorCompleted: true,
								},
								truncated: false,
								database: { name: "DB", path: "C:/Repo/DB" },
							},
						});
					}
					if (request.args[1] === "component_editable_check") {
						return bridgeResult(request, { ok: true, result: { editable: true } });
					}
					if (request.args.includes("--dry-run")) {
						return bridgeResult(request, {
							ok: true,
							result: {
								dryRun: true,
								beforeDependency: "independent",
								beforeFormula: "",
								mappings: [],
								payload: {
									target: "DEMO/Controller",
									kind: "component",
									identity: { componentOID: "C-1", elementOID: "" },
									definitionHash: "definition-1",
								},
							},
						});
					}
					return bridgeResult(request, {
						ok: false,
						code: "editable_write_gate_blocked",
						message: "ASCET write blocked because component 'DEMO/Controller' is not editable.",
					});
				},
			},
			{ ascetPermission: { mode: "default", rules: [] }, hasUI: true, ui: { confirm: async () => true } },
		);

		assert.ok(requests.some((request) => request.args.includes("--dry-run")));
		assert.ok(requests.some((request) => request.args[1] === "component_editable_check"));
		assert.deepEqual(result.details.outcome, {
			status: "blocked",
			code: "editable_write_gate_blocked",
			message: "ASCET write blocked because component 'DEMO/Controller' is not editable.",
		});
		assert.equal(result.details.observations, undefined);
		assert.equal(result.details.verification, undefined);
		assert.equal(result.details.mutationResult?.status, "blocked");
		assert.equal(result.details.mutationResult?.mutation.status, "not_started");
		assert.equal(result.details.mutationResult?.error?.code, "editable_write_gate_blocked");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

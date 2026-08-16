import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
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

test("missing Diagram creation raises create_method to medium risk before permission evaluation", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-create-method-risk-"));
	let confirmations = 0;
	let writes = 0;
	try {
		const result = await runAscetEdit(
			{
				action: "create_method",
				componentPath: "DEMO\\C",
				componentKind: "class",
				methodName: "calc",
				methodKind: "abstract",
				intent: "apply",
			},
			{
				cwd: root,
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request) => {
					const operation = request.args[1];
					if (operation === "get_database_identity") {
						return success(request, { database: { name: "DB", path: "C:/Repo/DB" } });
					}
					if (operation === "preflight_create_method") {
						return success(request, {
							databasePath: "C:/Repo/DB",
							componentPath: "DEMO\\C",
							componentOid: "C-1",
							componentKind: "Class",
							languageKind: "ESDL",
							diagramName: "Main",
							diagramExists: false,
							diagramRuntimeType: "",
							requiredMethod: "AddMethod",
							requiredMethodAvailable: false,
							addDiagramAvailable: true,
							futureMethodCapabilityProven: false,
							editable: true,
							readbackAvailable: true,
							noOp: false,
							plannedEffects: [
								{ kind: "create_diagram", target: "DEMO\\C::Main" },
								{ kind: "create_method", target: "DEMO\\C::calc" },
							],
							capability: { status: "supported", operation: "AddMethod" },
						});
					}
					if (operation === "get_tree") {
						return success(request, {
							items: [{ path: "DEMO\\C", oid: "C-1", kind: "class" }],
							coverage: {
								status: "complete_for_scope",
								completeness: "complete",
								collectorCompleted: true,
							},
							truncated: false,
							database: { name: "DB", path: "C:/Repo/DB" },
						});
					}
					writes++;
					return success(request, {});
				},
			},
			{
				ascetPermission: { mode: "acceptEdits", rules: [] },
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return false;
					},
				},
			},
		);

		assert.equal(confirmations, 1);
		assert.equal(writes, 0);
		assert.equal(result.details.outcome.status, "blocked");
		assert.equal(result.details.mutationResult?.permission.risk, "medium");
		assert.equal(result.details.mutationResult?.permission.decision, "ask");
		assert.equal(result.details.mutationResult?.mutation.status, "not_started");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

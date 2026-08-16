import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runApprovedAscetBatchWrite } from "./batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";

function response(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function treeResponse(request: AscetCliRequest, items: Array<Record<string, unknown>>): AscetCliExecutionResult {
	return response(request, {
		items,
		coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
		truncated: false,
		database: { name: "DB", path: "C:/Repo/DB" },
	});
}

describe("guarded ASCET batch write", () => {
	test("acquires all-target editability and executes the batch in one backend call", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-batch-"));
		let confirmations = 0;
		const calls: string[][] = [];
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_create_method",
					requests: [
						{
							componentPath: "DEMO\\BatchClass",
							componentKind: "class",
							methodName: "calc2",
							methodKind: "abstract",
						},
					],
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") {
							return treeResponse(request, [{ path: "DEMO\\BatchClass", oid: "C-1", kind: "class" }]);
						}
						if (operation === "component_editable_check") return response(request, false);
						if (operation === "guarded_batch_write") {
							const requestFile = request.args[request.args.indexOf("--request-file") + 1];
							assert.ok(requestFile);
							const guardedRequest = JSON.parse(readFileSync(requestFile, "utf8")) as {
								requests: Array<{ operation: string; args: Record<string, unknown> }>;
								editableTargets: string[];
								acquireEditability: boolean;
							};
							assert.deepEqual(guardedRequest.editableTargets, ["DEMO\\BatchClass"]);
							assert.equal(guardedRequest.acquireEditability, true);
							assert.equal(guardedRequest.requests[0]?.operation, "create_method");
							assert.equal(guardedRequest.requests[0]?.args.verifyReadback, true);
							return response(request, {
								success: true,
								editabilityMutationStarted: true,
								editabilityAcquired: true,
								primaryMutationStarted: true,
								mutationStatus: "applied",
								verificationStatus: "passed",
								targets: [
									{
										path: "DEMO\\BatchClass",
										initiallyEditable: false,
										editabilityAcquired: true,
										finalEditable: true,
									},
								],
								results: [
									{
										id: "req-1",
										ok: true,
										result: { verifyReadbackRequested: true, readbackVerified: true },
									},
								],
								error: null,
							});
						}
						throw new Error(`Unexpected batch operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: {
						confirm: async (_title, message) => {
							confirmations++;
							assert.match(message, /Request editability for DEMO\\BatchClass/);
							return true;
						},
					},
				},
			);

			assert.equal(confirmations, 1);
			assert.equal(result.ok, true);
			assert.ok(result.mutationResult);
			assert.equal(result.mutationResult.status, "ok");
			assert.equal(result.mutationResult.preflight.status, "passed");
			assert.deepEqual(result.mutationResult.editability, {
				status: "acquired",
				initiallyEditable: false,
				acquiredByThisOperation: true,
				finalEditableState: "editable",
			});
			assert.equal(result.mutationResult.mutation.status, "applied");
			assert.equal(result.mutationResult.verification.status, "passed");
			assert.deepEqual(result.mutationResult.bridge, {
				beforeBridge: true,
				bridgeEntered: true,
				backendResponseReceived: true,
			});
			assert.ok(result.mutationResult.audit?.approvedAt);
			assert.ok(result.mutationResult.audit?.revalidatedAt);
			assert.equal(calls.filter((args) => args[1] === "guarded_batch_write").length, 1);
			assert.equal(calls.filter((args) => args[0] === "batch").length, 0);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("re-prompts in the same call when shared-object scope changes materially", async (context) => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-batch-reprompt-"));
		context.after(() => rmSync(root, { recursive: true, force: true }));
		let confirmations = 0;
		let treeReads = 0;
		let batchCalls = 0;
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\New" }],
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request) => {
					const operation = request.args[1];
					if (operation === "get_database_identity") {
						return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
					}
					if (operation === "get_tree") {
						treeReads++;
						return treeResponse(
							request,
							treeReads === 1
								? [{ path: "DEMO", oid: "F-1", kind: "folder" }]
								: [
										{ path: "DEMO", oid: "F-1", kind: "folder" },
										{ path: "ProjectA::DEMO", oid: "F-1", kind: "folder" },
									],
						);
					}
					if (request.args[0] === "batch") {
						batchCalls++;
						return response(request, { results: [{ id: "req-1", ok: true }] });
					}
					throw new Error(`Unexpected batch operation ${operation ?? request.args.join(" ")}`);
				},
			},
			{
				ascetPermission: { mode: "default", rules: [] },
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);

		assert.equal(confirmations, 2);
		assert.equal(treeReads, 3);
		assert.equal(batchCalls, 1);
		assert.equal(result.ok, true);
		assert.ok(result.mutationResult);
		assert.equal(result.mutationResult.status, "partial");
		assert.equal(result.mutationResult.mutation.status, "applied");
		assert.equal(result.mutationResult.verification.status, "missing");
		assert.equal(result.mutationResult.recovery.required, true);
	});
});

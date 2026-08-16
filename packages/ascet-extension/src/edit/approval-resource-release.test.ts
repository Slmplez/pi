import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { createAscetScheduler } from "../scheduler/scheduler.ts";
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

test("approval waits after all ASCET scheduler ownership is released", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-approval-release-"));
	const scheduler = createAscetScheduler();
	let writes = 0;
	try {
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
			{
				cwd: root,
				agentId: "test-agent",
				sessionId: "test-session",
				scheduler,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => {
					const operation = request.args[1];
					if (operation === "get_database_identity") {
						return success(request, { database: { name: "DB", path: "C:/Repo/DB" } });
					}
					if (operation === "preflight_create_folder") {
						return success(request, {
							folderPath: "DEMO\\New",
							databasePath: "C:/Repo/DB",
							existing: ["DEMO"],
							willCreate: ["DEMO\\New"],
							conflicts: [],
							capability: { status: "supported", saveAvailable: true, readbackAvailable: true },
							noOp: false,
						});
					}
					if (operation === "get_tree") {
						return success(request, {
							items: [{ path: "DEMO", oid: "F-1", kind: "folder" }],
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
				ascetPermission: { mode: "default", rules: [] },
				hasUI: true,
				ui: {
					confirm: async () => {
						const beforeWait = scheduler.getSnapshot();
						assert.equal(beforeWait.activeCount, 0);
						assert.equal(beforeWait.queuedJobs.length, 0);
						await new Promise<void>((resolve) => setTimeout(resolve, 20));
						const afterWait = scheduler.getSnapshot();
						assert.equal(afterWait.activeCount, 0);
						assert.equal(afterWait.queuedJobs.length, 0);
						return false;
					},
				},
			},
		);

		assert.equal(writes, 0);
		assert.equal(result.details.outcome.status, "blocked");
		assert.equal(scheduler.getSnapshot().activeCount, 0);
		assert.equal(scheduler.getSnapshot().queuedJobs.length, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

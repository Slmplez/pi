import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { AscetObservationStore } from "../observation-store.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { runAscetEdit } from "./service.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function successfulExecution(request: AscetCliRequest): AscetCliExecutionResult {
	const operation = request.args[1];
	const result =
		operation === "get_database_identity"
			? { database: { name: "DB", path: "C:/Repo/DB" } }
			: operation === "get_tree"
				? {
						items: [{ path: "DEMO", oid: "F-1", kind: "folder" }],
						coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
						truncated: false,
						database: { name: "DB", path: "C:/Repo/DB" },
					}
				: operation === "preflight_create_folder"
					? {
							folderPath: request.args[2],
							existing: ["DEMO"],
							willCreate: [request.args[2]],
							conflicts: [],
							capability: { status: "supported", saveAvailable: true, readbackAvailable: true },
							noOp: false,
						}
					: { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function readTelemetry(root: string): Array<Record<string, unknown>> {
	return readFileSync(join(root, "artifacts", "telemetry", "element-write.jsonl"), "utf8")
		.trim()
		.split("\n")
		.map((line) => JSON.parse(line) as Record<string, unknown>);
}

test("regular approved mutations emit Event v2 telemetry", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-telemetry-write-"));
	try {
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
			{
				cwd: root,
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUN_ID: "run-1",
					PI_ASCET_WRITE_CLASS: "isolated_fixture",
				},
				executeCli: async (request) => successfulExecution(request),
			},
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		const [event] = readTelemetry(root);
		assert.deepEqual(
			{
				version: event?.version,
				operation: event?.operation,
				outcome: event?.outcome,
				mutationStatus: event?.mutationStatus,
				bridgeEntered: event?.bridgeEntered,
				writesPerformed: event?.writesPerformed,
			},
			{
				version: 2,
				operation: "create_folder",
				outcome: "committed",
				mutationStatus: "applied",
				bridgeEntered: true,
				writesPerformed: true,
			},
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("read-only preflight Bridge calls do not mark a blocked mutation as entered", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-telemetry-blocked-"));
	try {
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => successfulExecution(request),
			},
			{},
		);
		assert.equal(result.details.outcome.status, "blocked");
		const [event] = readTelemetry(root);
		assert.deepEqual(
			{
				outcome: event?.outcome,
				mutationStatus: event?.mutationStatus,
				bridgeEntered: event?.bridgeEntered,
				mutationStarted: event?.mutationStarted,
				cleanupRequired: event?.cleanupRequired,
			},
			{
				outcome: "blocked",
				mutationStatus: "not_started",
				bridgeEntered: false,
				mutationStarted: false,
				cleanupRequired: false,
			},
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("post-Bridge exceptions emit outcome_unknown telemetry", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-telemetry-error-"));
	const artifactRoot = join(root, "artifacts");
	try {
		const store = new AscetObservationStore({ root: artifactRoot, thresholdBytes: 1 });
		const stored = store.create({
			domain: "tree",
			target: { targetPathPrefix: "DEMO\\New" },
			sourceIdentity: {},
			items: [{ path: "DEMO\\New" }],
			coverage: { status: "complete_for_scope" },
			delivery: "stored",
		});
		assert.equal(stored.delivery, "stored");
		rmSync(stored.observation.dataPath);
		mkdirSync(stored.observation.dataPath);
		await assert.rejects(
			runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO\\New", intent: "apply" },
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot },
					executeCli: async (request) => successfulExecution(request),
				},
				approvingContext,
			),
		);
		const [event] = readTelemetry(root);
		assert.deepEqual(
			{
				outcome: event?.outcome,
				mutationStatus: event?.mutationStatus,
				bridgeEntered: event?.bridgeEntered,
				backendResponseReceived: event?.backendResponseReceived,
				cleanupRequired: event?.cleanupRequired,
			},
			{
				outcome: "outcome_unknown",
				mutationStatus: "unknown",
				bridgeEntered: true,
				backendResponseReceived: true,
				cleanupRequired: true,
			},
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

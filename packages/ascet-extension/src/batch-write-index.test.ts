import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import {
	createBatchWriteOutcome,
	invalidateBatchWriteObservations,
	runApprovedAscetBatchWrite,
} from "./batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import { AscetObservationStore } from "./observation-store.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function createEnvironment(): { root: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-batch-observation-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		root,
		env: {
			ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function createObservation(root: string, componentPath: string, resultId: string): void {
	new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => resultId }).create({
		domain: "elements",
		target: { path: componentPath },
		items: [{ name: "P" }],
		coverage: { status: "complete_for_scope" },
		delivery: "stored",
	});
}

function createExecution(request: AscetCliRequest, exitCode: number): AscetCliExecutionResult {
	const operation = request.args[1];
	const result =
		operation === "get_database_identity"
			? { database: { name: "DB", path: "C:/Repo/DB" } }
			: operation === "get_tree"
				? {
						items: [{ path: "DEMO\\A", oid: "C-1", kind: "class" }],
						coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
						truncated: false,
						database: { name: "DB", path: "C:/Repo/DB" },
					}
				: operation === "component_editable_check"
					? true
					: { results: exitCode === 2 ? [{ ok: false, error: { code: "failed" } }] : [{ ok: true }] };
	const isBatch = request.args[0] === "batch";
	const actualExitCode = isBatch ? exitCode : 0;
	return {
		exitCode: actualExitCode,
		stdout: JSON.stringify({
			ok: actualExitCode === 0 || actualExitCode === 2,
			result,
			error: null,
			meta: { mode: isBatch ? "batch" : "exec", operation },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ASCET batch write outcome", () => {
	test("returns preview as a successful non-mutating preflight outcome", async () => {
		const environment = createEnvironment();
		const codeFile = join(environment.root, "Main.esdl");
		writeFileSync(codeFile, "return;", "utf8");
		let confirmations = 0;
		let batchCalls = 0;
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_set_method_code",
					requests: [{ componentPath: "DEMO/A", methodName: "Main", codeFile }],
					intent: "preview",
				},
				{
					cwd: environment.root,
					env: environment.env,
					executeCli: async (request) => {
						if (request.args[0] === "batch") batchCalls++;
						return createExecution(request, 0);
					},
				},
				{
					hasUI: true,
					ui: {
						confirm: async () => {
							confirmations++;
							return true;
						},
					},
				},
			);

			assert.equal(result.ok, true);
			assert.equal(result.error, undefined);
			assert.equal(result.exitCode, 0);
			assert.equal(confirmations, 0);
			assert.equal(batchCalls, 0);
			assert.equal(result.mutationResult?.status, "ok");
			assert.equal(result.mutationResult?.mutation.status, "not_started");
			assert.equal(result.mutationResult?.verification.status, "not_applicable");
			const outcome = createBatchWriteOutcome(result);
			assert.equal(outcome.status, "preflight");
		} finally {
			environment.cleanup();
		}
	});

	test("classifies the runtime editable gate as blocked without extra fields", () => {
		const outcome = createBatchWriteOutcome({
			ok: false,
			data: null,
			request: {
				cwd: "C:/Repo",
				cliPath: "AscetBridge.exe",
				args: ["batch", "set_method_code"],
			},
			stdout: "",
			stderr: "",
			exitCode: 1,
			timedOut: false,
			error: {
				code: "editable_write_gate_blocked",
				message: "ASCET write blocked because component 'DEMO/ReadOnly' is not editable.",
			},
		});

		assert.deepEqual(outcome, {
			status: "blocked",
			code: "editable_write_gate_blocked",
			message: "ASCET write blocked because component 'DEMO/ReadOnly' is not editable.",
		});
	});
});
describe("ASCET batch write observation invalidation", () => {
	test("invalidates observations for all successful batch targets", () => {
		const environment = createEnvironment();
		try {
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\A", "obs-a");
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\B", "obs-b");
			assert.deepEqual(
				invalidateBatchWriteObservations(
					{
						operation: "batch_set_method_code",
						requests: [{ componentPath: "DEMO/A" }, { componentPath: "DEMO/B" }],
					},
					{ env: environment.env },
				),
				{ invalidated: ["obs-a", "obs-b"] },
			);
		} finally {
			environment.cleanup();
		}
	});

	test("does not invalidate observations for partially failed batch writes", async () => {
		const environment = createEnvironment();
		const codeFile = join(environment.root, "Main.esdl");
		writeFileSync(codeFile, "return;", "utf8");
		try {
			createObservation(environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT ?? "", "DEMO\\A", "obs-partial");
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_set_method_code",
					requests: [{ componentPath: "DEMO/A", methodName: "Main", codeFile }],
					intent: "apply",
				},
				{ cwd: environment.root, env: environment.env, executeCli: async (request) => createExecution(request, 2) },
				approvingContext,
			);
			assert.equal(result.exitCode, 2);
			assert.ok(result.mutationResult);
			assert.equal(result.mutationResult.status, "unknown");
			assert.equal(result.mutationResult.mutation.status, "unknown");
			assert.equal(result.mutationResult.verification.status, "failed");
			assert.equal(result.mutationResult.recovery.required, true);
			const remaining = new AscetObservationStore({
				root: environment.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT,
			}).invalidate({ componentPath: "DEMO\\A" });
			assert.deepEqual(remaining, ["obs-partial"]);
		} finally {
			environment.cleanup();
		}
	});
});

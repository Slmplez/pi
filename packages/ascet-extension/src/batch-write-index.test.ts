import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { createBatchWriteOutcome, runApprovedAscetBatchWrite } from "./batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import type { AscetJob } from "./scheduler/types.ts";
import { getAscetSearchIndexPartitionState, resetAscetSearchIndexForTest } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-batch-write-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
			PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function seedReadyIndex(): void {
	resetAscetSearchIndexForTest({
		databaseName: "DemoDb",
		databasePath: "C:\\ASCET\\DemoDb",
		generatedAtMs: Date.now(),
		elapsedMs: 5,
		scanComplete: true,
		components: [
			{
				path: "AEB\\Controller",
				name: "Controller",
				kind: "module",
				languageKind: "ESDL",
				displayName: "Controller",
				parentPath: "AEB",
				ownerKind: "folder",
				targetKind: "component",
				objectKind: "module",
			},
		],
		entries: [
			{
				group: "primitive",
				componentPath: "AEB\\Controller",
				componentKind: "module",
				componentLanguageKind: "ESDL",
				elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
				elementKind: "cont",
				displayType: "cont",
				displayScope: "exported",
				referencedComponentPath: "",
				path: "AEB\\Controller::P_AEB_IB_MaxVelocityDrop_Curve",
			},
		],
		textCodeEntries: [
			{
				componentPath: "AEB\\Controller",
				componentKind: "module",
				componentLanguageKind: "ESDL",
				section: "body",
				methodName: "calc",
				methodKind: "Process",
				text: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
				path: "AEB\\Controller::calc#body",
			},
		],
		textCodeIncluded: true,
		textCodeScanComplete: true,
	});
}

function okBatchExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: { results: [{ id: "req-1", ok: true }] },
			error: null,
			meta: { mode: "batch" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

function makeWarmSearchIndexExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
				generatedAtUtc: new Date().toISOString(),
				elapsedMs: 1,
				scanComplete: true,
				textCodeIncluded: true,
				textCodeScanComplete: true,
				components: [],
				folders: [],
				folderItems: [],
				entries: [],
				methodDeclarations: [],
				componentRefs: [],
				elementRefs: [],
				dbItemDependencies: [],
				textCodeEntries: [],
				counts: {},
			},
			error: null,
			meta: { mode: "exec", operation: "warm_search_index" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

type RecordedSchedulerSubmission = Pick<AscetJob<unknown>, "toolName" | "commandId" | "kind"> & {
	completed: Promise<void>;
};

function createRecordingScheduler(
	submissions: RecordedSchedulerSubmission[],
): Pick<AscetScheduler, "submit" | "getSnapshot"> {
	return {
		async submit<T>(job: AscetJob<T>): Promise<T> {
			const result = Promise.resolve(job.run());
			submissions.push({
				toolName: job.toolName,
				commandId: job.commandId,
				kind: job.kind,
				completed: result.then(() => undefined),
			});
			return result;
		},
		getSnapshot() {
			return {
				hostState: "healthy",
				runningJob: null,
				queuedJobs: [],
				recentJobs: [],
				pendingByAgent: {},
				activeCount: 0,
				resource: {
					key: "ascet.toolapi.global",
					active: 0,
					queued: 0,
					concurrency: 1,
					runningJob: null,
				},
			};
		},
	};
}

async function waitFor(predicate: () => boolean, timeoutMs = 1000): Promise<void> {
	const startedAt = Date.now();
	while (!predicate()) {
		if (Date.now() - startedAt > timeoutMs) {
			throw new Error("Timed out waiting for condition.");
		}
		await new Promise((resolve) => setTimeout(resolve, 10));
	}
}

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: {
		confirm: async () => true,
	},
};

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ascet_batch_write index impact", () => {
	test("does not label an ungranted batch confirmation as preflight", async () => {
		const fixture = createReadyEnv();
		let cliCalls = 0;
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_create_folder",
					requests: [{ folderPath: "AEB\\New" }],
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						cliCalls += 1;
						return okBatchExecution(request);
					},
				},
				{
					hasUI: true,
					ui: { confirm: async () => false },
				},
			);

			assert.equal(cliCalls, 0);
			assert.equal(result.error?.code, "ascet_batch_write_confirmation_not_granted");
			assert.deepEqual((result.data as { confirmation?: unknown }).confirmation, {
				code: "ascet_batch_write_confirmation_not_granted",
			});
			assert.equal((result.data as { preflightOnly?: boolean }).preflightOnly, undefined);
			assert.equal(createBatchWriteOutcome(result).status, "blocked");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful batch_set_method_code stales element declarations, element refs, and text_code", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_set_method_code",
					requests: [
						{
							componentPath: "AEB\\Controller",
							methodName: "calc",
							codeFile: join(fixture.cwd, "calc.esdl"),
						},
					],
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => okBatchExecution(request),
				},
				approvingContext,
			);

			assert.equal(result.ok, true);
			const payload = result.data as { result?: { index?: { stale?: string[]; affectedMethods?: unknown[] } } };
			assert.deepEqual(payload.result?.index?.stale, ["element_decls", "element_refs", "text_code"]);
			assert.deepEqual(payload.result?.index?.affectedMethods, [{ component: "AEB/Controller", method: "calc" }]);
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("element_refs")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("components")?.status, "ready");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful batch_create_component stales components partition", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_create_component",
					requests: [
						{
							componentPath: "AEB\\NewController",
							kind: "module",
							language: "ESDL",
						},
					],
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => okBatchExecution(request),
				},
				approvingContext,
			);

			assert.equal(result.ok, true);
			const payload = result.data as { result?: { index?: { stale?: string[]; affectedComponents?: string[] } } };
			assert.deepEqual(payload.result?.index?.stale, ["components"]);
			assert.deepEqual(payload.result?.index?.affectedComponents, ["AEB/NewController"]);
			assert.equal(getAscetSearchIndexPartitionState("components")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "ready");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful batch_set_method_code schedules refresh without changing batch result envelope", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const submissions: RecordedSchedulerSubmission[] = [];
		const scheduler = createRecordingScheduler(submissions);
		try {
			const result = await runApprovedAscetBatchWrite(
				{
					operation: "batch_set_method_code",
					requests: [
						{
							componentPath: "AEB\\Controller",
							methodName: "calc",
							codeFile: join(fixture.cwd, "calc.esdl"),
						},
						{
							componentPath: "AEB\\Controller",
							methodName: "calc",
							codeFile: join(fixture.cwd, "calc2.esdl"),
						},
					],
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					scheduler,
					executeCli: async (request) =>
						request.args[1] === "warm_search_index"
							? makeWarmSearchIndexExecution(request)
							: okBatchExecution(request),
				},
				approvingContext,
			);

			assert.equal(result.ok, true);
			const payload = result.data as {
				result?: { results?: unknown[]; index?: { stale?: string[]; requestCount?: number } };
			};
			assert.deepEqual(payload.result?.results, [{ id: "req-1", ok: true }]);
			assert.deepEqual(payload.result?.index?.stale, ["element_decls", "element_refs", "text_code"]);
			assert.equal(payload.result?.index?.requestCount, 2);
			await waitFor(() => submissions.some((entry) => entry.toolName === "ascet_index_refresh"));
			const refreshJobs = submissions.filter((entry) => entry.toolName === "ascet_index_refresh");
			assert.deepEqual(
				refreshJobs.map(({ toolName, commandId, kind }) => ({ toolName, commandId, kind })),
				[{ toolName: "ascet_index_refresh", commandId: "warm_search_index", kind: "read" }],
			);
			await Promise.all(refreshJobs.map((entry) => entry.completed));
		} finally {
			fixture.cleanup();
		}
	});
});

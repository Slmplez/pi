import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import type { AscetJob } from "../scheduler/types.ts";
import {
	getAscetFullElement,
	getAscetSearchIndexPartitionState,
	queryAscetSearchIndex,
	queryAscetTextCodeIndex,
	resetAscetSearchIndexForTest,
} from "../search-index.ts";
import { ingestAscetSearchIndexSqlite } from "../search-index-sqlite/ingest.ts";
import { getAscetSqliteIndexStatus } from "../search-index-sqlite/status.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { runAscetEdit } from "./service.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-"));
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

function makeExecution(request: AscetCliRequest, ok = true): AscetCliExecutionResult {
	const result =
		request.args[1] === "set_element_dependency"
			? {
					write: { succeeded: true, readbackVerified: true },
				}
			: request.args[1] === "apply_element_spec"
				? {
						WriteSucceeded: true,
						ReadbackVerified: true,
						componentPath: "AEB\\Controller",
					}
				: {
						writeSucceeded: true,
						componentPath: "AEB\\Controller",
						methodName: "calc",
						readback: { hash: "sha256:abc", lineCount: 1 },
					};
	return {
		exitCode: ok ? 0 : 1,
		stdout: JSON.stringify({
			ok,
			result: ok ? result : null,
			error: ok ? null : { code: "ascet_edit_failed", message: "write failed" },
			meta: { mode: "exec", operation: "set_method_code" },
		}),
		stderr: ok ? "" : "write failed",
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

type RecordedSchedulerSubmission = Pick<AscetJob<unknown>, "toolName" | "commandId" | "kind">;

function createRecordingScheduler(
	submissions: RecordedSchedulerSubmission[],
): Pick<AscetScheduler, "submit" | "getSnapshot"> {
	return {
		async submit<T>(job: AscetJob<T>): Promise<T> {
			submissions.push({ toolName: job.toolName, commandId: job.commandId, kind: job.kind });
			return job.run();
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

describe("ascet_edit WriteImpact", () => {
	test("successful set_method_code returns compact impact and stales element declarations, element refs, and text_code", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "AEB\\Controller",
					methodName: "calc",
					code: "out = in;",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => makeExecution(request),
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(payload.index, {
				action: "set_method_code",
				affectedComponents: ["AEB/Controller"],
				affectedMethods: [{ component: "AEB/Controller", method: "calc" }],
				stale: ["element_decls", "element_refs", "text_code"],
			});
			assert.deepEqual(payload.readback, { hash: "sha256:abc", lineCount: 1 });
			assert.equal(result.details.impact?.action, "set_method_code");
			const textCodePartition = getAscetSearchIndexPartitionState("text_code");
			assert.ok(textCodePartition && textCodePartition.status === "stale");
			assert.equal(textCodePartition.invalidatedReason, "edit_succeeded:set_method_code");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("element_refs")?.status, "stale");
			assert.equal(
				queryAscetSearchIndex(
					{ query: "P_AEB_IB_MaxVelocityDrop_Curve", componentPath: "AEB\\Controller", match: "exact", limit: 20 },
					{ cwd: fixture.cwd },
				),
				undefined,
			);
			assert.equal(
				queryAscetTextCodeIndex({ query: "speed - drop", match: "contains", limit: 20 }, { cwd: fixture.cwd }),
				undefined,
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("successful set_method_code schedules one background P0 refresh when scheduler is available", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const submissions: RecordedSchedulerSubmission[] = [];
		const scheduler = createRecordingScheduler(submissions);
		try {
			const options = {
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				scheduler,
				executeCli: async (request: AscetCliRequest) =>
					request.args[1] === "warm_search_index" ? makeWarmSearchIndexExecution(request) : makeExecution(request),
			};
			const [first, second] = await Promise.all([
				runAscetEdit(
					{
						action: "set_method_code",
						componentPath: "AEB\\Controller",
						methodName: "calc",
						code: "out = in;",
						executeWrite: true,
					},
					options,
					approvingContext,
				),
				runAscetEdit(
					{
						action: "set_method_code",
						componentPath: "AEB\\Controller",
						methodName: "calc",
						code: "out = in + 1;",
						executeWrite: true,
					},
					options,
					approvingContext,
				),
			]);

			assert.equal(first.details.outcome.status, "ok");
			assert.equal(second.details.outcome.status, "ok");
			await waitFor(() => submissions.some((entry) => entry.toolName === "ascet_index_refresh"));
			await new Promise((resolve) => setTimeout(resolve, 25));
			const refreshJobs = submissions.filter((entry) => entry.toolName === "ascet_index_refresh");
			assert.deepEqual(refreshJobs, [
				{ toolName: "ascet_index_refresh", commandId: "warm_search_index", kind: "read" },
			]);
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "ready");
		} finally {
			fixture.cleanup();
		}
	});

	test("preflight-only write does not update index state", async () => {
		seedReadyIndex();
		const result = await runAscetEdit(
			{
				action: "set_method_code",
				componentPath: "AEB\\Controller",
				methodName: "calc",
				code: "out = in;",
			},
			{ cwd: process.cwd() },
			approvingContext,
		);

		assert.equal(result.details.outcome.status, "preflight");
		assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "ready");
		assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
	});

	test("failed write does not update index state", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runAscetEdit(
				{
					action: "set_method_code",
					componentPath: "AEB\\Controller",
					methodName: "calc",
					code: "out = in;",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => makeExecution(request, false),
				},
				approvingContext,
			);

			assert.equal(result.details.outcome.status, "error");
			assert.equal(result.details.impact, undefined);
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "ready");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
				error: { code: "ascet_cli_failed", message: "write failed" },
			});
		} finally {
			fixture.cleanup();
		}
	});

	test("dependency writes require an applied and live-verified write result", async () => {
		for (const scenario of [
			{ code: "ascet_dependency_write_result_missing", write: undefined },
			{ code: "ascet_dependency_write_not_applied", write: { succeeded: false, readbackVerified: true } },
			{ code: "ascet_dependency_readback_not_verified", write: { succeeded: true, readbackVerified: false } },
		]) {
			seedReadyIndex();
			const fixture = createReadyEnv();
			const calls: string[][] = [];
			try {
				const result = await runAscetEdit(
					{
						action: "set_element_dependency",
						targetPath: "AEB\\Controller",
						elementName: "K_Shared",
						dependency: "dependent",
						executeWrite: true,
					},
					{
						cwd: fixture.cwd,
						env: fixture.env,
						timeoutMs: 1000,
						executeCli: async (request) => {
							calls.push(request.args);
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: { write: scenario.write },
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						},
					},
					approvingContext,
				);

				assert.deepEqual(result.details.outcome, {
					status: "error",
					error: { code: scenario.code, message: result.details.error?.message },
				});
				assert.equal(
					calls.some((args) => args[1] === "read_element_catalog"),
					false,
				);
				assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			} finally {
				fixture.cleanup();
			}
		}
	});

	test("dependency write validation accepts the live CLI result.payload envelope", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "DEMO\\Folder\\Controller",
					elementName: "K",
					dependency: "dependent",
					targetKind: "component",
					executeWrite: true,
					verifyReadback: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_element_catalog") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({ ok: true, result: { elements: [] }, error: null }),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: {
									payload: {
										write: { succeeded: true, readbackVerified: true },
										plan: { matches: [{ component: "DEMO\\Folder\\Controller", supported: true }] },
									},
									verification: { succeeded: true },
								},
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				approvingContext,
			);
			assert.equal(result.details.outcome?.status, "ok");
			assert.equal(
				calls.some((args) => args[1] === "read_element_catalog"),
				true,
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("successful set_element_dependency refreshes target element index from live catalog", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Controller",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					dependency: "dependent",
					verifyReadback: true,
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_element_catalog") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										elements: [
											{
												name: "P_AEB_IB_MaxVelocityDrop_Curve",
												kind: "parameter",
												modelType: "cont",
												scope: "Local",
												calibration: true,
											},
										],
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						return makeExecution(request);
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(payload.index.updated, ["element_decls", "full_element_cache"]);
			assert.deepEqual(payload.index.stale, ["text_code"]);
			assert.equal(payload.index.elements[0].component, "AEB/Controller");
			assert.equal(
				calls.some((args) => args[1] === "read_element_catalog"),
				true,
			);
			assert.equal(
				getAscetFullElement({
					componentPath: "AEB/Controller",
					name: "P_AEB_IB_MaxVelocityDrop_Curve",
					scope: "Local",
				})?.data.calibration,
				true,
			);
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "stale");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful dependency write reconciles the complete persisted index generation", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		ingestAscetSearchIndexSqlite(fixture.cwd, {
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
			textCodeIncluded: true,
			textCodeScanComplete: true,
			entries: [],
			components: [],
			folders: [],
			folderItems: [],
			methodDeclarations: [],
			methodProcessElements: [],
			componentRefs: [],
			elementRefs: [],
			messages: [],
			diagramMetadata: [],
			textCodeEntries: [],
			projectFormulas: [],
			projectItems: [],
			dbItemDependencies: [],
		});
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Controller",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					dependency: "dependent",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_element_catalog") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										elements: [
											{
												name: "P_AEB_IB_MaxVelocityDrop_Curve",
												kind: "parameter",
												modelType: "cont",
												scope: "Local",
											},
										],
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						if (request.args[1] === "warm_search_index") {
							return makeWarmSearchIndexExecution(request);
						}
						return makeExecution(request);
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(payload.index.stale ?? [], []);
			assert.equal(payload.index.refresh.partition, "p0");
			assert.equal(typeof payload.index.refresh.generation, "string");
			assert.equal(
				calls.some((args) => args[1] === "warm_search_index"),
				true,
			);
			assert.equal(getAscetSqliteIndexStatus(fixture.cwd).status, "ready");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful folder match-all dependency write refreshes every planned component", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		const componentPaths = ["AEB\\ControllerA", "AEB\\ControllerB"];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Folder",
					targetKind: "folder",
					match: "all",
					elementName: "K_Shared",
					dependency: "dependent",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_element_catalog") {
							assert.notEqual(request.args[2], "AEB\\Folder");
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										elements: [
											{
												name: "K_Shared",
												kind: "parameter",
												modelType: "cont",
												scope: "Local",
												component: request.args[2],
											},
										],
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: {
									write: { succeeded: true, readbackVerified: true, changed: 2 },
									plan: {
										count: 2,
										matches: componentPaths.map((component) => ({
											component,
											element: "K_Shared",
											supported: true,
										})),
									},
								},
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(
				calls.filter((args) => args[1] === "read_element_catalog").map((args) => args[2]),
				componentPaths,
			);
			assert.deepEqual(
				payload.index.elements.map((entry: { component: string }) => entry.component),
				["AEB/ControllerA", "AEB/ControllerB"],
			);
			assert.deepEqual(payload.index.updated, ["element_decls", "full_element_cache"]);
		} finally {
			fixture.cleanup();
		}
	});

	test("multi-target dependency write stales the full impact when one catalog refresh fails", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Folder",
					targetKind: "folder",
					match: "all",
					elementName: "K_Shared",
					dependency: "dependent",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						if (request.args[1] === "read_element_catalog" && request.args[2] === "AEB\\ControllerB") {
							return { ...makeExecution(request, false), stdout: "" };
						}
						if (request.args[1] === "read_element_catalog") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										elements: [{ name: "K_Shared", kind: "parameter", modelType: "cont", scope: "Local" }],
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: {
									write: { succeeded: true, readbackVerified: true, changed: 2 },
									plan: {
										count: 2,
										matches: [
											{ component: "AEB\\ControllerA", element: "K_Shared", supported: true },
											{ component: "AEB\\ControllerB", element: "K_Shared", supported: true },
										],
									},
								},
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(
				payload.index.elements.map((entry: { component: string }) => entry.component),
				["AEB/ControllerA"],
			);
			assert.deepEqual(payload.index.stale, ["element_decls", "element_refs", "text_code"]);
			assert.equal(payload.index.issues[0].code, "indexReadbackFailed");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "stale");
		} finally {
			fixture.cleanup();
		}
	});

	test("multi-target dependency write with missing plan components reports writeback recovery state", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Folder",
					targetKind: "folder",
					match: "all",
					elementName: "K_Shared",
					dependency: "dependent",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: {
									write: { succeeded: true, readbackVerified: true, changed: 1 },
									plan: { count: 1, matches: [{ element: "K_Shared", supported: true }] },
								},
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.equal(
				calls.some((args) => args[1] === "read_element_catalog"),
				false,
			);
			assert.equal(payload.index.issues[0].code, "index-writeback-targets-missing");
			assert.deepEqual(payload.index.stale, ["element_decls", "element_refs", "text_code"]);
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "stale");
		} finally {
			fixture.cleanup();
		}
	});

	test("set_element_dependency dryRun does not refresh or stale the index", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Controller",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					dependency: "dependent",
					dryRun: true,
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						calls.push(request.args);
						return makeExecution(request);
					},
				},
				approvingContext,
			);

			assert.equal(
				calls.some((args) => args[1] === "read_element_catalog"),
				false,
			);
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "ready");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful write reports stale recovery when catalog refresh fails", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "AEB\\Controller",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					dependency: "dependent",
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						if (request.args[1] === "read_element_catalog") {
							return { ...makeExecution(request, false), stdout: "" };
						}
						return makeExecution(request);
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(payload.index.updated ?? [], []);
			assert.deepEqual(payload.index.stale, ["element_decls", "element_refs", "text_code"]);
			assert.equal(payload.index.issues[0].code, "indexReadbackFailed");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "stale");
		} finally {
			fixture.cleanup();
		}
	});

	test("successful apply_element_spec refreshes new element names from spec file", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const specFile = join(fixture.cwd, "elements.json");
		writeFileSync(
			specFile,
			JSON.stringify({
				elements: [
					{ name: "K_Local", scope: "Local" },
					{ name: "K_Imported", scope: "Imported" },
				],
			}),
			"utf8",
		);
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "AEB\\Controller",
					specFile,
					mode: "restore",
					verifyReadback: true,
					executeWrite: true,
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					timeoutMs: 1000,
					executeCli: async (request) => {
						if (request.args[1] === "read_element_catalog") {
							return {
								exitCode: 0,
								stdout: JSON.stringify({
									ok: true,
									result: {
										elements: [
											{ name: "K_Local", kind: "parameter", modelType: "cont", scope: "Local" },
											{ name: "K_Imported", kind: "parameter", modelType: "cont", scope: "Imported" },
											{ name: "Other", kind: "parameter", modelType: "cont", scope: "Local" },
										],
									},
									error: null,
								}),
								stderr: "",
								timedOut: false,
								request,
							};
						}
						return makeExecution(request);
					},
				},
				approvingContext,
			);

			const payload = JSON.parse(result.content[0]?.text ?? "{}");
			assert.deepEqual(
				payload.index.elements.map((entry: { name: string }) => entry.name),
				["K_Local", "K_Imported"],
			);
			assert.equal(
				getAscetFullElement({ componentPath: "AEB/Controller", name: "K_Local", scope: "Local" })?.type,
				"cont",
			);
			assert.equal(
				getAscetFullElement({ componentPath: "AEB/Controller", name: "K_Imported", scope: "Imported" })?.type,
				"cont",
			);
		} finally {
			fixture.cleanup();
		}
	});
});

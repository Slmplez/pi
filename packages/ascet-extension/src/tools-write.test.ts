import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	getAscetFullElement,
	getAscetSearchIndexPartitionState,
	queryAscetSearchIndex,
	queryAscetTextCodeIndex,
	resetAscetSearchIndexForTest,
} from "./search-index.ts";
import { runAscetWrite } from "./tools/write.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-write-"));
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
	return {
		exitCode: ok ? 0 : 1,
		stdout: JSON.stringify({
			ok,
			result: ok
				? {
						writeSucceeded: true,
						componentPath: "AEB\\Controller",
						methodName: "calc",
						readback: { hash: "sha256:abc", lineCount: 1 },
					}
				: null,
			error: ok ? null : { code: "ascet_write_failed", message: "write failed" },
			meta: { mode: "exec", operation: "set_method_code" },
		}),
		stderr: ok ? "" : "write failed",
		timedOut: false,
		request,
	};
}

const approvingContext: AscetWriteApprovalContext = {
	hasUI: true,
	ui: {
		confirm: async () => true,
	},
};

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ascet_write WriteImpact", () => {
	test("successful set_method_code returns compact impact and stales only text_code", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		try {
			const result = await runAscetWrite(
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
				stale: ["text_code"],
			});
			assert.deepEqual(payload.readback, { hash: "sha256:abc", lineCount: 1 });
			assert.equal(result.details.impact?.action, "set_method_code");
			const textCodePartition = getAscetSearchIndexPartitionState("text_code");
			assert.ok(textCodePartition && textCodePartition.status === "stale");
			assert.equal(textCodePartition.invalidatedReason, "write_succeeded:set_method_code");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
			assert.equal(
				queryAscetSearchIndex(
					{ query: "P_AEB_IB_MaxVelocityDrop_Curve", componentPath: "AEB\\Controller", match: "exact", limit: 20 },
					{ cwd: fixture.cwd },
				)?.ok,
				true,
			);
			assert.equal(
				queryAscetTextCodeIndex({ query: "speed - drop", match: "contains", limit: 20 }, { cwd: fixture.cwd }),
				undefined,
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("preflight-only write does not update index state", async () => {
		seedReadyIndex();
		const result = await runAscetWrite(
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
			const result = await runAscetWrite(
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

	test("successful set_element_dependency refreshes target element index from live catalog", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetWrite(
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

	test("set_element_dependency dryRun does not refresh or stale the index", async () => {
		seedReadyIndex();
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			await runAscetWrite(
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
			const result = await runAscetWrite(
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
			assert.deepEqual(payload.index.stale, ["element_decls", "text_code"]);
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
			const result = await runAscetWrite(
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

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
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
});

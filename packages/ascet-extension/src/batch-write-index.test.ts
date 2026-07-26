import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { runApprovedAscetBatchWrite } from "./batch-write.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { getAscetSearchIndexPartitionState, resetAscetSearchIndexForTest } from "./search-index.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

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

const approvingContext: AscetWriteApprovalContext = {
	hasUI: true,
	ui: {
		confirm: async () => true,
	},
};

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ascet_batch_write index impact", () => {
	test("successful batch_set_method_code stales text_code only", async () => {
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
			assert.deepEqual(payload.result?.index?.stale, ["text_code"]);
			assert.deepEqual(payload.result?.index?.affectedMethods, [{ component: "AEB/Controller", method: "calc" }]);
			assert.equal(getAscetSearchIndexPartitionState("text_code")?.status, "stale");
			assert.equal(getAscetSearchIndexPartitionState("element_decls")?.status, "ready");
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
});

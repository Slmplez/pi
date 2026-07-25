import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { createAscetRuntimeStatusReport } from "./status-runtime.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-status-runtime-"));
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
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

describe("createAscetRuntimeStatusReport", () => {
	test("uses warm_search_index as the runtime readiness probe", async () => {
		const fixture = createReadyEnv();
		let observedOptions:
			| {
					partition?: string;
					forceRefresh?: boolean;
					scanTimeoutMs?: number;
					toolName?: string;
			  }
			| undefined;
		try {
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: fixture.env,
				warmSearchIndex: async (options) => {
					observedOptions = options;
					return {
						ok: true,
						commandId: "warm_search_index",
						databaseName: "DemoDb",
						databasePath: "C:\\ASCET\\DemoDb",
						entryCount: 2,
						elapsedMs: 7,
						scanComplete: true,
						fromCache: false,
						error: undefined,
						exitCode: 0,
						timedOut: false,
						stdout: "",
						stderr: "",
					};
				},
			});

			assert.equal(report.ok, true);
			assert.equal(report.runtime.commandId, "warm_search_index");
			assert.match(report.runtime.description, /warm_search_index/);
			assert.equal(observedOptions?.partition, "components");
			assert.equal(observedOptions?.forceRefresh, true);
			assert.equal(observedOptions?.scanTimeoutMs, 15_000);
			assert.equal(observedOptions?.toolName, "ascet_status");
			assert.match(report.summary, /ASCET quick-search index: ready/);
			assert.doesNotMatch(report.summary, /list_folders/);
		} finally {
			fixture.cleanup();
		}
	});

	test("reports quick-search index disabled when PI_ASCET_SEARCH_INDEX is 0", async () => {
		const fixture = createReadyEnv();
		try {
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: {
					...fixture.env,
					PI_ASCET_SEARCH_INDEX: "0",
				},
				timeoutMs: 1000,
			});

			assert.equal(report.ok, false);
			assert.equal(report.installationOk, true);
			assert.equal(report.runtimeOk, false);
			assert.equal(report.runtime.error?.code, "search_index_disabled");
			assert.match(report.summary, /ASCET quick-search index: FAILED \(search_index_disabled\)/);
			assert.doesNotMatch(report.summary, /list_folders/);
		} finally {
			fixture.cleanup();
		}
	});
});

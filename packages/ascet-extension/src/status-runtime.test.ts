import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ingestAscetSearchIndexSqlite } from "./search-index-sqlite/ingest.ts";
import type { AscetSearchIndexBuildInput } from "./search-index-store.ts";
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

function minimalP0Input(): AscetSearchIndexBuildInput {
	return {
		databaseName: "DemoDb",
		databasePath: "C:\\ASCET\\DemoDb",
		generatedAtMs: Date.now(),
		elapsedMs: 7,
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
		projectFormulas: [],
		projectItems: [],
		textCodeEntries: [],
		messages: [],
		diagramMetadata: [],
	};
}

describe("createAscetRuntimeStatusReport", () => {
	test("uses warm_search_index P0 options when a runtime probe is injected", async () => {
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
			assert.match(report.runtime.description, /SQLite active generation/);
			assert.equal(observedOptions?.partition, "p0");
			assert.equal(observedOptions?.forceRefresh, false);
			assert.equal(observedOptions?.scanTimeoutMs, 60_000);
			assert.equal(observedOptions?.toolName, "ascet_status");
			assert.match(report.summary, /ASCET quick-search index: ready/);
			assert.match(report.summary, /storage: sqlite/);
			assert.doesNotMatch(report.summary, /list_folders/);
		} finally {
			fixture.cleanup();
		}
	});

	test("reads SQLite P0 index status without a live runtime probe", async () => {
		const fixture = createReadyEnv();
		try {
			ingestAscetSearchIndexSqlite(fixture.cwd, minimalP0Input());
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
			});

			assert.equal(report.ok, true);
			assert.equal(report.runtimeOk, true);
			assert.equal(report.index.status, "ready");
			assert.match(report.summary, /ASCET quick-search P0 index: SQLite active generation/);
			assert.match(report.summary, /\[ok\] components/);
			assert.doesNotMatch(report.summary, /method_process_elements/);
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

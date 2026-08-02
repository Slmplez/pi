import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliRequest } from "../cli.ts";
import { ingestAscetSearchIndexSqlite } from "../search-index-sqlite/ingest.ts";
import { writeAscetIndexStatusFile } from "../search-index-sqlite/status-file.ts";
import type { AscetSqliteSearchIndexBuildInput } from "../search-index-sqlite/types.ts";
import { resetAscetSearchIndexForTest } from "../search-index-store.ts";
import { evaluateAscetIndex } from "./evaluate.ts";
import { refreshAscetIndex } from "./refresh.ts";
import { repairAscetIndexStatusFile } from "./repair-status-file.ts";
import { markAscetIndexAreasStale } from "./stale.ts";
import { readAscetIndexStatus } from "./status.ts";

function createTempCwd(): { cwd: string; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-index-maintainer-"));
	return {
		cwd,
		cleanup: () => rmSync(cwd, { recursive: true, force: true }),
	};
}

function fixtureInput(): AscetSqliteSearchIndexBuildInput {
	return {
		databaseName: "AEB",
		databasePath: "d:/ETASData/ASCET6.4/Database/AEB",
		generatedAtMs: 1_725_000_000_000,
		elapsedMs: 1234,
		scanComplete: true,
		textCodeIncluded: true,
		textCodeScanComplete: true,
		components: [
			{
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				name: "AEB_pDriverIBooster",
				kind: "class",
				languageKind: "ESDL",
				displayName: "AEB_pDriverIBooster",
				ownerKind: "folder",
				targetKind: "component",
				objectKind: "class",
				parentPath: "PlatformLibrary\\AEB",
			},
		],
		folders: [{ path: "PlatformLibrary", name: "PlatformLibrary", parentPath: "" }],
		folderItems: [
			{
				folderPath: "PlatformLibrary",
				itemPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				itemName: "AEB_pDriverIBooster",
				itemKind: "class",
			},
		],
		entries: [
			{
				group: "primitive",
				componentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				componentKind: "class",
				componentLanguageKind: "ESDL",
				elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
				elementKind: "cont",
				displayType: "OneDTableElement",
				displayScope: "exported",
				referencedComponentPath: "",
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::P_AEB_IB_MaxVelocityDrop_Curve",
			},
		],
		methodDeclarations: [
			{
				group: "method",
				componentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				componentKind: "class",
				componentLanguageKind: "ESDL",
				methodName: "calc",
				methodKind: "AbstractMethod",
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::calc",
			},
		],
		componentRefs: [],
		elementRefs: [],
		messages: [],
		textCodeEntries: [],
		projectFormulas: [],
		projectItems: [],
		dbItemDependencies: [],
	};
}

describe("ASCET index maintainer status", () => {
	let cleanup = () => {};

	afterEach(() => {
		cleanup();
		cleanup = () => {};
		resetAscetSearchIndexForTest();
	});

	test("reads SQLite status and detects footer mismatch", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		writeAscetIndexStatusFile(temp.cwd, { state: "ready", phase: "method_process_elements", totalDocs: 3 });

		const status = readAscetIndexStatus({ cwd: temp.cwd, detailLevel: "areas" });
		assert.equal(status.state, "ready");
		assert.equal(status.totalDocs > 3, true);
		assert.equal(status.footer?.inSync, false);
		assert.equal(status.areas?.find((area) => area.name === "elements")?.count, 1);
	});

	test("repairs the footer status file from SQLite", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		writeAscetIndexStatusFile(temp.cwd, { state: "ready", phase: "method_process_elements", totalDocs: 3 });

		const repaired = repairAscetIndexStatusFile(temp.cwd);
		assert.equal(repaired.repaired, true);
		assert.equal(repaired.footer?.inSync, true);
		assert.equal(repaired.footer?.totalDocs, repaired.totalDocs);
	});

	test("marks public areas stale through SQLite area mapping", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());

		const result = markAscetIndexAreasStale(temp.cwd, ["code"], "external_edit");
		const status = readAscetIndexStatus({ cwd: temp.cwd, detailLevel: "areas" });
		assert.deepEqual(result.areas, ["code_blocks", "code_terms"]);
		assert.equal(status.state, "stale");
		assert.equal(status.areas?.find((area) => area.name === "code_blocks")?.state, "stale");
	});

	test("does not evaluate a stale SQLite index as passed", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		markAscetIndexAreasStale(temp.cwd, ["elements"], "write_succeeded:set_element_spec");

		const result = evaluateAscetIndex({ cwd: temp.cwd, checks: ["status", "counts", "sidecar"] });
		const checks = result.checks as Array<{ name: string; passed: boolean }>;
		assert.equal(result.state, "failed");
		assert.equal(checks.find((check) => check.name === "status")?.passed, false);
	});

	test("scoped freshness evaluation ignores unrelated stale areas", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		markAscetIndexAreasStale(temp.cwd, ["elements"], "write_succeeded:set_element_spec");

		const result = evaluateAscetIndex({
			cwd: temp.cwd,
			checks: ["freshness"],
			requiredAreas: ["components"],
		});
		const checks = result.checks as Array<{ name: string; passed: boolean }>;
		assert.equal(result.state, "passed");
		assert.equal(checks.find((check) => check.name === "freshness")?.passed, true);
		assert.deepEqual(result.staleAreas, []);
	});

	test("freshness evaluation fails when a required area is stale", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		markAscetIndexAreasStale(temp.cwd, ["elements"], "write_succeeded:set_element_spec");

		const result = evaluateAscetIndex({
			cwd: temp.cwd,
			checks: ["freshness"],
			requiredAreas: ["elements"],
		});
		assert.equal(result.state, "failed");
		assert.deepEqual(result.staleAreas, ["elements"]);
		assert.equal(result.authoritative, false);
	});

	test("foreground refresh forces a warmup instead of accepting a ready cache", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		resetAscetSearchIndexForTest({
			databaseName: "AEB",
			databasePath: "d:/ETASData/ASCET6.4/Database/AEB",
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
			entries: fixtureInput().entries,
		});
		let calls = 0;
		const result = await refreshAscetIndex({
			cwd: temp.cwd,
			env: { PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
			areas: ["elements"],
			executeCli: async (request: AscetCliRequest) => {
				calls += 1;
				return {
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							operation: "warm_search_index",
							database: { name: "AEB", path: "d:/ETASData/ASCET6.4/Database/AEB" },
							generatedAtUtc: new Date().toISOString(),
							elapsedMs: 1,
							scanComplete: true,
							entries: fixtureInput().entries,
						},
						error: null,
					}),
					stderr: "",
					timedOut: false,
					request,
				};
			},
		});

		assert.equal(calls, 1);
		assert.deepEqual(result.effectivePartitions, ["element_decls"]);
	});

	test("dedicated tree, project, and refs refreshes do not fall back to p0", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const requestedPartitions: string[] = [];
		for (const area of ["tree", "project", "refs"] as const) {
			const result = await refreshAscetIndex({
				cwd: temp.cwd,
				env: { PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
				areas: [area],
				force: true,
				executeCli: async (request: AscetCliRequest) => {
					requestedPartitions.push(request.args[3] ?? "");
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								operation: "warm_search_index",
								database: { name: "AEB", path: "d:/ETASData/ASCET6.4/Database/AEB" },
								generatedAtUtc: new Date().toISOString(),
								elapsedMs: 1,
								scanComplete: true,
								components: fixtureInput().components,
								folders: fixtureInput().folders,
								folderItems: fixtureInput().folderItems,
								projectFormulas: fixtureInput().projectFormulas,
								projectItems: fixtureInput().projectItems,
								componentRefs: fixtureInput().componentRefs,
								elementRefs: fixtureInput().elementRefs,
								dbItemDependencies: fixtureInput().dbItemDependencies,
							},
							error: null,
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			});
			assert.deepEqual(result.effectivePartitions, [area]);
		}
		assert.deepEqual(requestedPartitions, ["tree", "project", "refs"]);
	});
});

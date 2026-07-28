import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { ingestAscetSearchIndexSqlite } from "../search-index-sqlite/ingest.ts";
import { writeAscetIndexStatusFile } from "../search-index-sqlite/status-file.ts";
import type { AscetSqliteSearchIndexBuildInput } from "../search-index-sqlite/types.ts";
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
});

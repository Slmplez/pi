import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { ingestAscetSearchIndexSqlite, refreshAscetSearchIndexSqliteAreas } from "./search-index-sqlite/ingest.ts";
import {
	queryAscetComponentIndexSqlite,
	queryAscetComponentReferenceIndexSqlite,
	queryAscetElementReferenceIndexSqlite,
	queryAscetListComponentsIndexSqlite,
	queryAscetMessageIndexSqlite,
	queryAscetMethodDeclarationIndexSqlite,
	queryAscetProjectFormulaIndexSqlite,
	queryAscetSearchIndexSqlite,
	queryAscetTextCodeIndexSqlite,
} from "./search-index-sqlite/query.ts";
import { getAscetSqliteIndexStatus, markAscetSqliteIndexAreasStale } from "./search-index-sqlite/status.ts";
import type { AscetSearchIndexBuildInput } from "./search-index-store.ts";

function createTempCwd(): { cwd: string; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-sqlite-index-"));
	return {
		cwd,
		cleanup: () => rmSync(cwd, { recursive: true, force: true }),
	};
}

function matches(result: unknown): Record<string, unknown>[] {
	const envelope = result as { data?: { result?: { matches?: unknown } } };
	const resultMatches = envelope.data?.result?.matches;
	return Array.isArray(resultMatches) ? (resultMatches as Record<string, unknown>[]) : [];
}

function fixtureInput(): AscetSearchIndexBuildInput {
	return {
		databaseName: "AEB",
		databasePath: "d:/ETASData/ASCET6.4/Database",
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
				parentPath: "PlatformLibrary\\AEB",
				ownerKind: "folder",
				targetKind: "component",
				objectKind: "class",
			},
			{
				path: "PlatformLibrary\\AEB\\AEB_Project",
				name: "AEB_Project",
				kind: "project",
				languageKind: "",
				displayName: "AEB_Project",
				parentPath: "PlatformLibrary\\AEB",
				ownerKind: "folder",
				targetKind: "project",
				objectKind: "project",
			},
		],
		folders: [
			{
				path: "PlatformLibrary",
				name: "PlatformLibrary",
				parentPath: "",
				ordinal: 0,
				payload: {
					path: "PlatformLibrary",
					name: "PlatformLibrary",
					kind: "folder",
					languageKind: "Unknown",
					parentPath: "",
				},
			},
			{
				path: "PlatformLibrary\\AEB",
				name: "AEB",
				parentPath: "PlatformLibrary",
				ordinal: 1,
				payload: {
					path: "PlatformLibrary\\AEB",
					name: "AEB",
					kind: "folder",
					languageKind: "Unknown",
					parentPath: "PlatformLibrary",
				},
			},
			{
				path: "PlatformLibrary\\AEB\\Private",
				name: "Private",
				parentPath: "PlatformLibrary\\AEB",
				ordinal: 3,
				payload: {
					path: "PlatformLibrary\\AEB\\Private",
					name: "Private",
					kind: "folder",
					languageKind: "Unknown",
					parentPath: "PlatformLibrary\\AEB",
				},
			},
		],
		folderItems: [
			{
				folderPath: "PlatformLibrary\\AEB",
				itemPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				itemName: "AEB_pDriverIBooster",
				itemKind: "class",
				languageKind: "BDE",
				ordinal: 2,
				payload: {
					path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
					name: "AEB_pDriverIBooster",
					kind: "class",
					languageKind: "BDE",
					displayName: "AEB_pDriverIBooster",
					parentPath: "PlatformLibrary\\AEB",
					ownerKind: "folder",
					targetKind: "component",
					objectKind: "class",
				},
			},
			{
				folderPath: "PlatformLibrary\\AEB\\Private",
				itemPath: "PlatformLibrary\\AEB\\Private\\AEB_Helper",
				itemName: "AEB_Helper",
				itemKind: "module",
				languageKind: "ESDL",
				ordinal: 4,
				payload: {
					path: "PlatformLibrary\\AEB\\Private\\AEB_Helper",
					name: "AEB_Helper",
					kind: "module",
					languageKind: "ESDL",
					parentPath: "PlatformLibrary\\AEB\\Private",
				},
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
		componentRefs: [
			{
				sourceComponentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				sourceElementName: "AEB_SSMReqOut",
				sourceElementKind: "ScalarElement",
				sourceElementScope: "local",
				targetComponentPath: "PlatformLibrary\\Package\\CSM_HoldReq",
				targetComponentName: "CSM_HoldReq",
				targetComponentKind: "enumeration",
				targetLanguageKind: "",
				resolved: true,
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::AEB_SSMReqOut->PlatformLibrary\\Package\\CSM_HoldReq",
			},
		],
		elementRefs: [
			{
				sourceComponentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				sourceElementName: "AEB_SSMReqOut",
				sourceElementKind: "ScalarElement",
				sourceElementScope: "local",
				targetComponentPath: "PlatformLibrary\\Package\\CSM_HoldReq",
				targetComponentName: "CSM_HoldReq",
				targetComponentKind: "enumeration",
				targetLanguageKind: "",
				resolved: true,
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::AEB_SSMReqOut->PlatformLibrary\\Package\\CSM_HoldReq",
				elementName: "AEB_SSMReqOut",
			},
		],
		projectFormulas: [
			{
				projectPath: "PlatformLibrary\\AEB\\AEB_Project",
				name: "RPM",
				runtimeType: "Formula",
			},
		],
		projectItems: [
			{
				projectPath: "PlatformLibrary\\AEB\\AEB_Project",
				name: "dT",
				itemKind: "global",
				runtimeType: "DeltaTElement",
				sourceApi: "Project.GetAllGlobals",
			},
		],
		dbItemDependencies: [
			{
				sourcePath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				targetPath: "PlatformLibrary\\Package\\CSM_HoldReq",
				targetName: "CSM_HoldReq",
				targetKind: "enumeration",
			},
		],
		textCodeEntries: [
			{
				componentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				componentKind: "class",
				componentLanguageKind: "ESDL",
				section: "body",
				methodName: "calc",
				methodKind: "AbstractMethod",
				text: "C_AEB_IB_MaxVelocityDrop_Curve.getAt(AEB_v_Init);",
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::calc#body",
			},
		],
		messages: [
			{
				group: "primitive",
				componentPath: "PlatformLibrary\\AEB\\AEB_pDriverIBooster",
				componentKind: "class",
				componentLanguageKind: "ESDL",
				elementName: "Msg_Brake",
				elementKind: "SendReceiveMessageElement",
				displayType: "SendReceiveMessageElement",
				displayScope: "exported",
				referencedComponentPath: "",
				path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::Msg_Brake",
				messageDirection: "send_receive",
			},
		],
		diagramMetadata: [],
	};
}

describe("ASCET SQLite search index", () => {
	let cleanup = () => {};

	afterEach(() => {
		cleanup();
		cleanup = () => {};
	});

	test("ingests a P0 generation and serves indexed searches", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const input = fixtureInput();
		const ingest = ingestAscetSearchIndexSqlite(temp.cwd, input);
		assert.equal(ingest.areas.length, 13);
		const status = getAscetSqliteIndexStatus(temp.cwd);
		assert.equal(status.status, "ready");
		assert.equal(status.areas.map((area) => area.area).includes("method_process_elements" as never), false);
		assert.equal(status.areas.find((area) => area.area === "project_formulas")?.itemCount, 1);
		assert.equal(status.areas.find((area) => area.area === "messages")?.itemCount, 1);
		assert.equal(
			matches(queryAscetComponentIndexSqlite({ query: "AEB_pDriver", match: "contains" }, { cwd: temp.cwd })).length,
			1,
		);
		assert.equal(
			matches(
				queryAscetSearchIndexSqlite({ query: "P_AEB_IB_MaxVelocityDrop_Curve", match: "exact" }, { cwd: temp.cwd }),
			).length,
			1,
		);
		assert.equal(
			matches(queryAscetMethodDeclarationIndexSqlite({ query: "calc", match: "exact" }, { cwd: temp.cwd })).length,
			1,
		);
		assert.equal(
			matches(queryAscetComponentReferenceIndexSqlite({ query: "CSM_HoldReq", match: "exact" }, { cwd: temp.cwd }))
				.length,
			2,
		);
		assert.equal(
			matches(queryAscetElementReferenceIndexSqlite({ query: "getAt", match: "contains" }, { cwd: temp.cwd }))
				.length,
			1,
		);
		assert.equal(
			matches(queryAscetTextCodeIndexSqlite({ query: "getAt", match: "contains" }, { cwd: temp.cwd })).length,
			1,
		);
		assert.equal(
			matches(queryAscetProjectFormulaIndexSqlite({ query: "RPM", match: "exact" }, { cwd: temp.cwd })).length,
			1,
		);
		assert.equal(
			matches(
				queryAscetMessageIndexSqlite(
					{ query: "Msg_Brake", match: "exact", direction: "sender" },
					{ cwd: temp.cwd },
				),
			).length,
			1,
		);
		assert.equal(
			matches(
				queryAscetMessageIndexSqlite(
					{ query: "Msg_Brake", match: "exact", direction: "receiver" },
					{ cwd: temp.cwd },
				),
			).length,
			1,
		);
	});

	test("marks active SQLite areas stale after write invalidation", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());
		markAscetSqliteIndexAreasStale(
			temp.cwd,
			["elements", "code_blocks", "code_terms"],
			"write_succeeded:set_method_code",
		);
		const status = getAscetSqliteIndexStatus(temp.cwd);
		assert.equal(status.status, "stale");
		assert.equal(status.areas.find((area) => area.area === "elements")?.status, "stale");
		assert.equal(status.areas.find((area) => area.area === "code_terms")?.errorCode, "invalidated");
		const result = queryAscetSearchIndexSqlite(
			{ query: "P_AEB_IB_MaxVelocityDrop_Curve", match: "exact" },
			{ cwd: temp.cwd },
		);
		assert.ok(result);
		const envelope = result.data as {
			result?: {
				indexStatus?: string;
				staleAreas?: string[];
				warning?: string;
				searchComplete?: boolean;
				authoritative?: boolean;
				truncationReason?: string;
			};
		};
		assert.equal(envelope.result?.indexStatus, "stale");
		assert.deepEqual(envelope.result?.staleAreas, ["code_blocks", "code_terms", "elements"]);
		assert.match(envelope.result?.warning ?? "", /stale ASCET SQLite search index/);
		assert.equal(envelope.result?.searchComplete, false);
		assert.equal(envelope.result?.authoritative, false);
		assert.equal(envelope.result?.truncationReason, "stale_index");
		assert.equal(matches(result).length, 1);
	});

	test("refreshes a stale area into a new generation without rebuilding untouched areas", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const original = fixtureInput();
		ingestAscetSearchIndexSqlite(temp.cwd, original);
		const before = getAscetSqliteIndexStatus(temp.cwd);
		markAscetSqliteIndexAreasStale(temp.cwd, ["elements"], "write_succeeded:set_element_spec");

		const replacementEntry = {
			...(original.entries?.[0] ?? {}),
			elementName: "P_AEB_IB_MaxVelocityDrop_Curve_Updated",
			path: "PlatformLibrary\\AEB\\AEB_pDriverIBooster::P_AEB_IB_MaxVelocityDrop_Curve_Updated",
		};
		const refreshed = refreshAscetSearchIndexSqliteAreas(temp.cwd, { ...original, entries: [replacementEntry] }, [
			"elements",
		]);
		const after = getAscetSqliteIndexStatus(temp.cwd);

		assert.notEqual(after.runId, before.runId);
		assert.equal(after.status, "ready");
		assert.equal(after.areas.find((area) => area.area === "elements")?.status, "ready");
		assert.equal(after.areas.find((area) => area.area === "elements")?.errorCode, "");
		assert.equal(refreshed.clearedAreas.includes("elements"), true);
		assert.equal(refreshed.generationBefore, before.runId);
		assert.equal(refreshed.generationAfter, after.runId);
		assert.equal(refreshed.transactionCommitted, true);
		assert.deepEqual(refreshed.clearedInvalidations, ["elements"]);
		assert.equal(refreshed.postRefreshState.areas.find((area) => area.area === "elements")?.status, "ready");
		assert.equal(
			matches(queryAscetComponentIndexSqlite({ query: "AEB_pDriver", match: "contains" }, { cwd: temp.cwd })).length,
			1,
		);
		assert.equal(
			matches(
				queryAscetSearchIndexSqlite(
					{ query: "P_AEB_IB_MaxVelocityDrop_Curve_Updated", match: "exact" },
					{ cwd: temp.cwd },
				),
			).length,
			1,
		);
		assert.equal(
			matches(
				queryAscetSearchIndexSqlite({ query: "P_AEB_IB_MaxVelocityDrop_Curve", match: "exact" }, { cwd: temp.cwd }),
			).length,
			0,
		);
	});

	test("keeps the stale active generation when a targeted refresh fails", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const original = fixtureInput();
		ingestAscetSearchIndexSqlite(temp.cwd, original);
		markAscetSqliteIndexAreasStale(temp.cwd, ["elements"], "write_succeeded:set_element_spec");
		const before = getAscetSqliteIndexStatus(temp.cwd);
		const invalidEntry = { ...(original.entries?.[0] ?? {}), elementName: null as unknown as string };

		assert.throws(() =>
			refreshAscetSearchIndexSqliteAreas(temp.cwd, { ...original, entries: [invalidEntry] }, ["elements"]),
		);

		const after = getAscetSqliteIndexStatus(temp.cwd);
		assert.equal(after.runId, before.runId);
		assert.equal(after.status, "stale");
		assert.equal(after.areas.find((area) => area.area === "elements")?.status, "stale");
	});

	test("lists the P0 folder tree with live ordering and typed filters", () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());

		const direct = queryAscetListComponentsIndexSqlite(
			{ folderPath: "PlatformLibrary\\AEB", kind: "all", recursive: false },
			{ cwd: temp.cwd },
		);
		const directPayload = (direct?.data as { result?: { items?: Array<{ name?: string }> } }).result;
		assert.deepEqual(
			directPayload?.items?.map((item) => item.name),
			["AEB_pDriverIBooster", "Private"],
		);

		const recursive = queryAscetListComponentsIndexSqlite(
			{
				folderPath: "PlatformLibrary\\AEB",
				kind: "class",
				languageKind: "BDE",
				recursive: true,
			},
			{ cwd: temp.cwd },
		);
		const recursivePayload = (recursive?.data as { result?: { items?: Array<Record<string, unknown>> } }).result;
		assert.deepEqual(
			recursivePayload?.items?.map((item) => item.name),
			["AEB_pDriverIBooster"],
		);
		assert.equal(recursivePayload?.items?.[0]?.languageKind, "BDE");

		markAscetSqliteIndexAreasStale(temp.cwd, ["folder_items"], "write_succeeded:create_component");
		assert.equal(
			queryAscetListComponentsIndexSqlite({ folderPath: "PlatformLibrary\\AEB" }, { cwd: temp.cwd }),
			undefined,
		);
	});

	test("serves concurrent readers from the active SQLite generation", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		ingestAscetSearchIndexSqlite(temp.cwd, fixtureInput());

		const results = await Promise.all([
			Promise.resolve(
				queryAscetComponentIndexSqlite({ query: "AEB_pDriver", match: "contains" }, { cwd: temp.cwd }),
			),
			Promise.resolve(
				queryAscetSearchIndexSqlite({ query: "P_AEB_IB_MaxVelocityDrop_Curve", match: "exact" }, { cwd: temp.cwd }),
			),
			Promise.resolve(queryAscetMethodDeclarationIndexSqlite({ query: "calc", match: "exact" }, { cwd: temp.cwd })),
			Promise.resolve(
				queryAscetComponentReferenceIndexSqlite({ query: "CSM_HoldReq", match: "exact" }, { cwd: temp.cwd }),
			),
			Promise.resolve(queryAscetTextCodeIndexSqlite({ query: "getAt", match: "contains" }, { cwd: temp.cwd })),
			Promise.resolve(queryAscetProjectFormulaIndexSqlite({ query: "RPM", match: "exact" }, { cwd: temp.cwd })),
		]);

		assert.deepEqual(
			results.map((result) => matches(result).length),
			[1, 1, 1, 2, 1, 1],
		);
	});
});

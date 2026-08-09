import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AscetObservationStore } from "../observation-store.ts";
import { executeDatabaseCatalog, isDatabaseCatalogParameterClassCandidate } from "./catalog-service.ts";
import type { DatabaseCatalogLiveRequest } from "./types.ts";

function createCatalogStore(root: string): AscetObservationStore {
	const store = new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => "obs-tree-source" });
	store.create({
		domain: "tree",
		target: {},
		items: [
			{ path: "DB\\Project", oid: "project-1", kind: "project" },
			{ path: "DB\\Project::Module", oid: "module-1", kind: "module" },
			{ path: "DB\\Modules\\Module", oid: "module-1", kind: "module" },
			{ path: "DB\\Enums\\Mode", oid: "enum-1", kind: "enumeration" },
			{ path: "DB\\Classes\\Parameters", oid: "class-1", kind: "class" },
		],
		coverage: { status: "complete_for_scope" },
		truncated: false,
		delivery: "stored",
	});
	return store;
}

test("matches the frozen Parameter Class structural candidate rules", () => {
	for (const path of [
		"DB\\Parameter\\PlainClass",
		"DB\\Calibrations\\PlainClass",
		"DB\\Constants\\PlainClass",
		"DB\\Component\\_ADCMain_Calibration",
		"DB\\Component\\Feature_Param_Private",
		"DB\\public\\IDs\\_LdmId_CDD",
		"DB\\Enumerations\\CRB_Internal_Enumeration_Settings",
	]) {
		assert.equal(isDatabaseCatalogParameterClassCandidate(path), true, path);
	}
	for (const path of [
		"DB\\Parameterization\\PlainClass",
		"DB\\Component\\Reconstruction",
		"DB\\Enumeration\\Mode",
		"DB\\Identifiers\\_LdmId_CDD",
	]) {
		assert.equal(isDatabaseCatalogParameterClassCandidate(path), false, path);
	}
});

test("Enumeration and Module Catalog requests stay local and produce independent result IDs", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-catalog-service-"));
	try {
		const store = createCatalogStore(root);
		let liveCallCount = 0;
		const first = await executeDatabaseCatalog(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-source",
				include: ["enumeration"],
				delivery: "stored",
			},
			{
				store,
				scanLive: async () => {
					liveCallCount++;
					return {};
				},
			},
		);
		const second = await executeDatabaseCatalog(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-source",
				include: ["module", "enumeration"],
				delivery: "stored",
			},
			{ store },
		);

		assert.equal(liveCallCount, 0);
		assert.notEqual(first.catalog.resultId, second.catalog.resultId);
		assert.equal(first.catalog.artifacts.enumerations?.itemCount, 1);
		assert.equal(first.catalog.artifacts.modules, undefined);
		assert.equal(second.catalog.artifacts.modules?.itemCount, 1);
		assert.equal(existsSync(second.catalog.artifacts.modules?.dataPath ?? ""), true);
		const module = JSON.parse(readFileSync(second.catalog.artifacts.modules?.dataPath ?? "", "utf8")) as {
			path: string;
			projectCount: number;
			messageCounts: { status: string };
		};
		assert.equal(module.path, "DB\\Modules\\Module");
		assert.equal(module.projectCount, 1);
		assert.equal(module.messageCounts.status, "not_scanned");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("Parameter Class and Message includes share one live scan with OID-deduplicated inputs", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-catalog-service-"));
	try {
		const store = createCatalogStore(root);
		const requests: DatabaseCatalogLiveRequest[] = [];
		const result = await executeDatabaseCatalog(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-source",
				include: ["parameter_class", "module", "message", "enumeration"],
				messageDepth: 0,
				delivery: "stored",
			},
			{
				store,
				scanLive: async (request) => {
					requests.push(request);
					return {
						parameterClasses: [{ path: "DB\\Classes\\Parameters", oid: "class-1", methodCount: 0 }],
						messages: [
							{
								path: "DB\\Modules\\Module::ModeMessage",
								id: "message-1",
								moduleOid: "module-1",
								messageKind: "send_message",
							},
						],
						moduleMessageEdges: [{ moduleOid: "module-1", messageId: "message-1" }],
						parameterEnumEdges: [{ parameterClassOid: "class-1", enumerationOid: "enum-1" }],
						messageEnumEdges: [{ messageId: "message-1", enumerationOid: "enum-1" }],
						coverage: { status: "complete_for_scope" },
						timings: { sessionOpenMs: 1, projectScanMs: 2, moduleScanMs: 3 },
					};
				},
			},
		);

		assert.equal(requests.length, 1);
		assert.equal(requests[0]?.projects.length, 1);
		assert.equal(requests[0]?.scanParameterEnumerationUsage, true);
		assert.equal(requests[0]?.scanMessageEnumerationUsage, true);
		assert.equal(requests[0]?.classCandidates.length, 1);
		assert.deepEqual(requests[0]?.modules, [{ path: "DB\\Modules\\Module", oid: "module-1" }]);
		assert.equal(result.catalog.artifacts.parameterClasses?.itemCount, 1);
		assert.equal(result.catalog.artifacts.messages?.itemCount, 1);
		const parameterEnumArtifact = result.catalog.artifacts.relations.parameterEnumEdges;
		const messageEnumArtifact = result.catalog.artifacts.relations.messageEnumEdges;
		assert.equal(
			parameterEnumArtifact && "itemCount" in parameterEnumArtifact ? parameterEnumArtifact.itemCount : undefined,
			1,
		);
		assert.equal(
			messageEnumArtifact && "itemCount" in messageEnumArtifact ? messageEnumArtifact.itemCount : undefined,
			1,
		);
		const enumeration = JSON.parse(readFileSync(result.catalog.artifacts.enumerations?.dataPath ?? "", "utf8")) as {
			parameterUsage: { status: string; count: number };
			messageUsage: { status: string; count: number };
		};
		assert.deepEqual(enumeration.parameterUsage, { status: "used", count: 1 });
		assert.deepEqual(enumeration.messageUsage, { status: "used", count: 1 });
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

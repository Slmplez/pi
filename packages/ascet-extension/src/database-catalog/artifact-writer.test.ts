import assert from "node:assert/strict";
import { mkdtempSync, readdirSync, readFileSync, renameSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AscetObservationStore } from "../observation-store.ts";
import { writeDatabaseCatalogArtifacts } from "./artifact-writer.ts";
import { loadDatabaseCatalogTreeSource } from "./tree-source.ts";
import { DatabaseCatalogError } from "./types.ts";

async function createTree(root: string) {
	const store = new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => "obs-tree-source" });
	store.create({
		domain: "tree",
		target: {},
		sourceIdentity: {
			database: { name: "DB", path: "C:/Repo/DB", status: "consistent", issues: [], fingerprint: "a".repeat(64) },
		},
		items: [
			{ path: "DB\\Project", oid: "project-1", kind: "project" },
			{ path: "DB\\Modules\\Module", oid: "module-1", kind: "module" },
			{ path: "DB\\Enums\\Mode", oid: "enum-1", kind: "enumeration" },
		],
		coverage: {
			status: "complete_for_scope",
			scopeKind: "database",
			scopeId: "database:DB",
			completeness: "complete",
			truncated: false,
			collectors: {
				projects: { completed: true },
				folders: { completed: true },
				components: { completed: true },
				enumerations: { completed: true },
			},
		},
		truncated: false,
		delivery: "stored",
	});
	return { store, tree: await loadDatabaseCatalogTreeSource(store, "obs-tree-source") };
}

test("writes compact include-dependent NDJSON and preserves Enumeration usage three-state semantics", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-catalog-writer-"));
	try {
		const { store, tree } = await createTree(root);
		const localOnly = writeDatabaseCatalogArtifacts(
			store,
			{
				request: {
					action: "database_catalog",
					sourceTreeResultId: "obs-tree-source",
					include: ["enumeration"],
				},
				tree,
			},
			{ generateResultId: () => "obs-database-catalog-local" },
		);
		const localEnumeration = JSON.parse(
			readFileSync(localOnly.catalog.artifacts.enumerations?.dataPath ?? "", "utf8"),
		) as { parameterUsage: { status: string }; messageUsage: { status: string } };
		assert.equal(localEnumeration.parameterUsage.status, "not_scanned");
		assert.equal(localEnumeration.messageUsage.status, "not_scanned");
		assert.equal(localOnly.catalog.artifacts.parameterClasses, undefined);
		assert.deepEqual(localOnly.catalog.artifacts.relations.parameterEnumEdges, {
			notCreatedReason: "scan_not_requested",
		});

		const scanned = writeDatabaseCatalogArtifacts(
			store,
			{
				request: {
					action: "database_catalog",
					sourceTreeResultId: "obs-tree-source",
					include: ["parameter_class", "enumeration"],
				},
				tree,
				livePayload: { parameterClasses: [] },
			},
			{ generateResultId: () => "obs-database-catalog-scanned" },
		);
		const scannedText = readFileSync(scanned.catalog.artifacts.enumerations?.dataPath ?? "", "utf8");
		assert.equal(scannedText.trimEnd().split(/\r?\n/u).length, 1);
		const scannedEnumeration = JSON.parse(scannedText) as {
			parameterUsage: { status: string; count: number };
			messageUsage: { status: string };
		};
		assert.deepEqual(scannedEnumeration.parameterUsage, { status: "scanned_not_used", count: 0 });
		assert.equal(scannedEnumeration.messageUsage.status, "not_scanned");
		assert.deepEqual(scanned.catalog.artifacts.relations.parameterEnumEdges, {
			notCreatedReason: "no_relations_found",
		});
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("cleans temporary and already-published Catalog files when atomic publication fails", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-catalog-writer-"));
	try {
		const { store, tree } = await createTree(root);
		let renameCount = 0;
		assert.throws(
			() =>
				writeDatabaseCatalogArtifacts(
					store,
					{
						request: {
							action: "database_catalog",
							sourceTreeResultId: "obs-tree-source",
							include: ["module", "enumeration"],
						},
						tree,
					},
					{
						generateResultId: () => "obs-database-catalog-failed",
						rename: (oldPath, newPath) => {
							renameCount++;
							if (renameCount === 2) {
								throw new Error("injected rename failure");
							}
							renameSync(oldPath, newPath);
						},
					},
				),
			(error) => {
				assert.equal(error instanceof DatabaseCatalogError, true);
				assert.equal((error as DatabaseCatalogError).code, "catalog_artifact_write_failed");
				return true;
			},
		);
		assert.deepEqual(
			readdirSync(root).filter((name) => name.startsWith("obs-database-catalog-failed")),
			[],
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

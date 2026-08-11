import assert from "node:assert/strict";
import { mkdtempSync, rmSync, unlinkSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { AscetObservationStore } from "../observation-store.ts";
import { loadDatabaseCatalogTreeSource } from "./tree-source.ts";
import { DatabaseCatalogError } from "./types.ts";

const completeDatabaseCollectors = {
	projects: { completed: true },
	folders: { completed: true },
	components: { completed: true },
	enumerations: { completed: true },
};

function createRoot(): string {
	return mkdtempSync(join(tmpdir(), "pi-ascet-catalog-tree-"));
}

function expectCode(error: unknown, code: string): boolean {
	assert.equal(error instanceof DatabaseCatalogError, true);
	assert.equal((error as DatabaseCatalogError).code, code);
	return true;
}

test("loads a full Tree once and deduplicates Module and Enumeration identities by OID", async () => {
	const root = createRoot();
	try {
		const store = new AscetObservationStore({ root, thresholdBytes: 1, generateResultId: () => "obs-tree-full" });
		store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [
				{ path: "DB\\Project", oid: "project-1", kind: "project" },
				{ path: "DB\\Project::Module", oid: "module-1", kind: "module" },
				{ path: "DB\\Modules\\Module", oid: "module-1", kind: "module" },
				{ path: "DB\\Enums\\Mode", oid: "enum-1", kind: "enumeration" },
				{ path: "DB\\Project::Mode", oid: "enum-1", kind: "enumeration" },
				{ path: "DB\\Classes\\Parameter", oid: "class-1", kind: "class" },
				{ path: "DB\\Broken", kind: "class" },
			],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
				truncated: false,
				collectors: completeDatabaseCollectors,
			},
			truncated: false,
			delivery: "stored",
		});

		const source = await loadDatabaseCatalogTreeSource(store, "obs-tree-full");
		assert.equal(source.databaseIdentity.fingerprint, "a".repeat(64));
		assert.deepEqual(source.projects, [{ path: "DB\\Project", oid: "project-1" }]);
		assert.deepEqual(source.modules, [
			{
				path: "DB\\Modules\\Module",
				oid: "module-1",
				aliases: ["DB\\Project::Module"],
			},
		]);
		assert.deepEqual(source.enumerations, [{ path: "DB\\Enums\\Mode", oid: "enum-1" }]);
		assert.equal(source.projectModuleEdges.length, 1);
		assert.deepEqual(source.counts, {
			sourceTreeRowCount: 7,
			projectCount: 1,
			moduleRowCount: 2,
			uniqueModuleCount: 1,
			moduleAliasCount: 1,
			enumerationCount: 1,
			classRowCount: 1,
			invalidRowCount: 1,
		});
		assert.equal(source.warnings[0]?.code, "invalid_tree_row");
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects non-Tree, bounded, partial, truncated, and missing-data observations with explicit codes", async () => {
	const root = createRoot();
	try {
		let counter = 0;
		const store = new AscetObservationStore({
			root,
			thresholdBytes: 1,
			generateResultId: () => `obs-${String(++counter)}`,
		});
		const nonTree = store.create({
			domain: "elements",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
			},
			delivery: "stored",
		});
		const implicitRoot = store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: { status: "complete_for_scope" },
			delivery: "stored",
		});
		const bounded = store.create({
			domain: "tree",
			target: { targetPathPrefix: "DB\\Project" },
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
			},
			delivery: "stored",
		});
		const partial = store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "partial",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
			},
			delivery: "stored",
		});
		const truncated = store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
			},
			truncated: true,
			delivery: "stored",
		});
		const missingIdentity = store.create({
			domain: "tree",
			target: {},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
			},
			delivery: "stored",
		});
		const incompleteCollectors = store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
				collectors: {
					...completeDatabaseCollectors,
					projects: { completed: false },
				},
			},
			delivery: "stored",
		});
		const missingData = store.create({
			domain: "tree",
			target: {},
			sourceIdentity: {
				database: { name: "DB", path: "C:/Repo/DB", fingerprint: "a".repeat(64) },
			},
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
				collectors: completeDatabaseCollectors,
			},
			delivery: "stored",
		});
		assert.equal(nonTree.delivery, "stored");
		assert.equal(implicitRoot.delivery, "stored");
		assert.equal(bounded.delivery, "stored");
		assert.equal(partial.delivery, "stored");
		assert.equal(truncated.delivery, "stored");
		assert.equal(missingIdentity.delivery, "stored");
		assert.equal(incompleteCollectors.delivery, "stored");
		assert.equal(missingData.delivery, "stored");
		unlinkSync(missingData.observation.dataPath);

		await assert.rejects(loadDatabaseCatalogTreeSource(store, "missing"), (error) =>
			expectCode(error, "source_tree_not_found"),
		);
		await assert.rejects(loadDatabaseCatalogTreeSource(store, nonTree.observation.metadata.resultId), (error) =>
			expectCode(error, "source_tree_domain_invalid"),
		);
		await assert.rejects(loadDatabaseCatalogTreeSource(store, implicitRoot.observation.metadata.resultId), (error) =>
			expectCode(error, "database_scope_required"),
		);
		for (const observation of [bounded, partial, truncated]) {
			await assert.rejects(
				loadDatabaseCatalogTreeSource(store, observation.observation.metadata.resultId),
				(error) => expectCode(error, "full_tree_required"),
			);
		}
		await assert.rejects(
			loadDatabaseCatalogTreeSource(store, missingIdentity.observation.metadata.resultId),
			(error) => expectCode(error, "database_identity_required"),
		);
		await assert.rejects(
			loadDatabaseCatalogTreeSource(store, incompleteCollectors.observation.metadata.resultId),
			(error) => expectCode(error, "database_collector_incomplete"),
		);
		await assert.rejects(loadDatabaseCatalogTreeSource(store, missingData.observation.metadata.resultId), (error) =>
			expectCode(error, "source_tree_data_missing"),
		);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

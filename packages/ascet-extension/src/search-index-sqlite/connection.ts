import { DatabaseSync } from "node:sqlite";
import { ensureAscetSearchIndexSqliteDir, getAscetSearchIndexSqlitePath } from "./paths.ts";
import { ASCET_SEARCH_SQLITE_SCHEMA_SQL, ASCET_SEARCH_SQLITE_SCHEMA_VERSION } from "./schema.ts";

export type AscetSearchSqliteConnectionMode = "reader" | "writer";

export interface AscetSearchSqliteConnection {
	db: DatabaseSync;
	path: string;
	close: () => void;
}

function applyCommonPragmas(db: DatabaseSync): void {
	db.exec(`
pragma busy_timeout = 5000;
pragma temp_store = MEMORY;
pragma foreign_keys = ON;
`);
}

function applyWriterPragmas(db: DatabaseSync): void {
	db.exec(`
pragma journal_mode = WAL;
pragma synchronous = NORMAL;
`);
}

function applyReaderPragmas(db: DatabaseSync): void {
	db.exec("pragma query_only = ON;");
}

export function openAscetSearchSqlite(cwd: string, mode: AscetSearchSqliteConnectionMode): AscetSearchSqliteConnection {
	ensureAscetSearchIndexSqliteDir(cwd);
	const path = getAscetSearchIndexSqlitePath(cwd);
	const db = new DatabaseSync(path);
	applyCommonPragmas(db);
	if (mode === "writer") {
		applyWriterPragmas(db);
		migrateAscetSearchSqlite(db);
	} else {
		applyReaderPragmas(db);
	}
	return {
		db,
		path,
		close: () => {
			if (db.isOpen) {
				db.close();
			}
		},
	};
}

export function migrateAscetSearchSqlite(db: DatabaseSync): void {
	if (requiresSchemaReset(db)) {
		db.exec(`
drop table if exists ascet_code_terms;
drop table if exists ascet_code_blocks;
drop table if exists ascet_dbitem_dependencies;
drop table if exists ascet_element_refs;
drop table if exists ascet_project_items;
drop table if exists ascet_project_formulas;
drop table if exists ascet_methods;
drop table if exists ascet_elements;
drop table if exists ascet_folder_items;
drop table if exists ascet_folders;
drop table if exists ascet_components;
drop table if exists ascet_search_documents;
drop table if exists ascet_index_areas;
drop table if exists ascet_index_runs;
`);
	}
	db.exec(ASCET_SEARCH_SQLITE_SCHEMA_SQL);
}

function requiresSchemaReset(db: DatabaseSync): boolean {
	try {
		const run = db.prepare("select max(schema_version) as schema_version from ascet_index_runs").get() as
			| { schema_version?: unknown }
			| undefined;
		const schemaVersion = typeof run?.schema_version === "number" ? run.schema_version : 0;
		const folderColumns = db.prepare("pragma table_info(ascet_folders)").all() as Array<{ name?: unknown }>;
		const folderItemColumns = db.prepare("pragma table_info(ascet_folder_items)").all() as Array<{ name?: unknown }>;
		const hasFolderTreeColumns =
			folderColumns.some((column) => column.name === "parent_path_norm") &&
			folderColumns.some((column) => column.name === "ordinal") &&
			folderItemColumns.some((column) => column.name === "language_kind") &&
			folderItemColumns.some((column) => column.name === "ordinal");
		return schemaVersion > 0 && (schemaVersion !== ASCET_SEARCH_SQLITE_SCHEMA_VERSION || !hasFolderTreeColumns);
	} catch {
		return false;
	}
}

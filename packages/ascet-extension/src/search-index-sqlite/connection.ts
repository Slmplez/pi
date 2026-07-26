import { DatabaseSync } from "node:sqlite";
import { ensureAscetSearchIndexSqliteDir, getAscetSearchIndexSqlitePath } from "./paths.ts";
import { ASCET_SEARCH_SQLITE_SCHEMA_SQL } from "./schema.ts";

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
	db.exec(ASCET_SEARCH_SQLITE_SCHEMA_SQL);
}

import { mkdirSync } from "node:fs";
import { resolve } from "node:path";

export const ASCET_SQLITE_INDEX_DIR = ".ascet/index";
export const ASCET_SQLITE_INDEX_FILE = "ascet-search.sqlite";

export function getAscetSearchIndexSqlitePath(cwd: string): string {
	return resolve(cwd, ASCET_SQLITE_INDEX_DIR, ASCET_SQLITE_INDEX_FILE);
}

export function ensureAscetSearchIndexSqliteDir(cwd: string): string {
	const dir = resolve(cwd, ASCET_SQLITE_INDEX_DIR);
	mkdirSync(dir, { recursive: true });
	return dir;
}

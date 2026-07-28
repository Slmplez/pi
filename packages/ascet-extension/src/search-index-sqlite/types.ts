import type {
	AscetComponentSearchIndexEntry,
	AscetReferenceIndexEntry,
	AscetSearchIndexBuildInput,
	AscetSearchIndexMatchMode,
	AscetTextCodeSearchIndexEntry,
} from "../search-index-store.ts";
import type { AscetP0IndexArea } from "./schema.ts";

export type AscetSearchSqliteMatchMode = AscetSearchIndexMatchMode;

export interface AscetFolderIndexEntry {
	path: string;
	name: string;
	parentPath: string;
	ordinal?: number;
	payload?: Record<string, unknown>;
}

export interface AscetFolderItemIndexEntry {
	folderPath: string;
	itemPath: string;
	itemName: string;
	itemKind: string;
	languageKind?: string;
	ordinal?: number;
	payload?: Record<string, unknown>;
}

export interface AscetProjectFormulaIndexEntry {
	projectPath: string;
	name: string;
	path?: string;
	runtimeType?: string;
	sourceApi?: string;
}

export interface AscetProjectItemIndexEntry {
	projectPath: string;
	name: string;
	itemKind: string;
	runtimeType?: string;
	sourceApi?: string;
}

export interface AscetDbItemDependencyIndexEntry {
	sourcePath: string;
	targetPath: string;
	targetName?: string;
	targetKind?: string;
	sourceApi?: string;
}

export interface AscetSqliteSearchIndexBuildInput extends AscetSearchIndexBuildInput {
	folders?: readonly AscetFolderIndexEntry[];
	folderItems?: readonly AscetFolderItemIndexEntry[];
	projectFormulas?: readonly AscetProjectFormulaIndexEntry[];
	projectItems?: readonly AscetProjectItemIndexEntry[];
	dbItemDependencies?: readonly AscetDbItemDependencyIndexEntry[];
}

export interface AscetSqliteAreaStatus {
	area: AscetP0IndexArea;
	status: "ready" | "stale" | "failed" | "building" | "missing";
	itemCount: number;
	elapsedMs: number;
	scanComplete: boolean;
	errorCode: string;
	errorMessage: string;
}

export interface AscetSqliteIndexStatus {
	status: "ready" | "missing" | "building" | "failed" | "stale";
	runId: string;
	databaseName: string;
	databasePath: string;
	generatedAtMs: number;
	completedAtMs: number;
	elapsedMs: number;
	areas: AscetSqliteAreaStatus[];
}

export interface AscetSqlitePagedQueryParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	match?: AscetSearchSqliteMatchMode;
	limit?: number;
	cursor?: string;
}

export type AscetSqliteReferenceEntry = AscetReferenceIndexEntry;
export type AscetSqliteComponentEntry = AscetComponentSearchIndexEntry;
export type AscetSqliteTextCodeEntry = AscetTextCodeSearchIndexEntry;

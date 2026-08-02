import { createHash, randomUUID } from "node:crypto";
import type { DatabaseSync, StatementSync } from "node:sqlite";
import type {
	AscetMessageIndexEntry,
	AscetMethodDeclarationIndexEntry,
	AscetSearchIndexEntry,
	AscetSearchIndexPartition,
} from "../search-index-store.ts";
import { openAscetSearchSqlite } from "./connection.ts";
import { ASCET_REQUIRED_P0_INDEX_AREAS, ASCET_SEARCH_SQLITE_SCHEMA_VERSION, type AscetP0IndexArea } from "./schema.ts";
import type {
	AscetDbItemDependencyIndexEntry,
	AscetFolderIndexEntry,
	AscetFolderItemIndexEntry,
	AscetProjectFormulaIndexEntry,
	AscetProjectItemIndexEntry,
	AscetSqliteSearchIndexBuildInput,
} from "./types.ts";

interface AreaBuildState {
	area: AscetP0IndexArea;
	itemCount: number;
	elapsedMs: number;
	scanComplete: boolean;
	status: "ready" | "failed";
	errorCode: string;
	errorMessage: string;
}

export interface AscetSqliteIngestResult {
	runId: string;
	path: string;
	areas: AreaBuildState[];
	documentCount: number;
	codeTermCount: number;
}

export interface AscetSqliteAreaRefreshResult {
	runId: string;
	previousRunId: string;
	path: string;
	clearedAreas: AscetP0IndexArea[];
	clearedInvalidations: AscetP0IndexArea[];
	transactionCommitted: boolean;
	generationBefore: string;
	generationAfter: string;
	postRefreshState: {
		status: "ready" | "stale";
		areas: Array<{
			area: AscetP0IndexArea;
			status: string;
			errorCode: string;
			errorMessage: string;
		}>;
	};
	status: "ready" | "stale";
}

const CLONE_TABLES = [
	{ name: "ascet_search_documents", idColumns: ["doc_id"] },
	{ name: "ascet_components", idColumns: ["id"] },
	{ name: "ascet_folders", idColumns: ["id"] },
	{ name: "ascet_folder_items", idColumns: ["id"] },
	{ name: "ascet_elements", idColumns: ["id"] },
	{ name: "ascet_methods", idColumns: ["id"] },
	{ name: "ascet_project_formulas", idColumns: ["id"] },
	{ name: "ascet_project_items", idColumns: ["id"] },
	{ name: "ascet_element_refs", idColumns: ["id"] },
	{ name: "ascet_dbitem_dependencies", idColumns: ["id"] },
	{ name: "ascet_code_blocks", idColumns: ["id"] },
	{ name: "ascet_code_terms", idColumns: ["block_id"] },
] as const;

const REFRESH_AREA_DOCUMENT_PARTITIONS: Record<AscetP0IndexArea, readonly string[]> = {
	components: ["components"],
	folders: ["folders"],
	folder_items: ["folder_items"],
	elements: ["elements"],
	methods: ["methods"],
	project_formulas: ["project_formulas"],
	project_items: ["project_items"],
	component_refs: ["component_refs"],
	element_refs: ["element_refs"],
	messages: ["messages"],
	dbitem_dependencies: ["dbitem_dependencies"],
	code_blocks: ["code_blocks"],
	code_terms: ["code_terms"],
};

function cloneRunRows(db: DatabaseSync, sourceRunId: string, targetRunId: string): void {
	for (const table of CLONE_TABLES) {
		const columns = (db.prepare(`pragma table_info(${table.name})`).all() as Array<{ name?: unknown }>).map((row) =>
			typeof row.name === "string" ? row.name : "",
		);
		if (columns.length === 0 || !columns.includes("run_id")) {
			throw new Error(`Cannot clone ASCET index table ${table.name}: run_id column is missing.`);
		}
		const parameters: string[] = [];
		const projection = columns
			.map((column) => {
				if (column === "run_id") {
					parameters.push(targetRunId);
					return "?";
				}
				if (table.idColumns.includes(column as never)) {
					parameters.push(targetRunId);
					return `${column} || ?`;
				}
				return column;
			})
			.join(", ");
		parameters.push(sourceRunId);
		db.prepare(
			`insert into ${table.name} (${columns.join(", ")}) select ${projection} from ${table.name} where run_id = ?`,
		).run(...parameters);
	}
	db.prepare(`
insert into ascet_index_areas
(run_id, area, status, item_count, elapsed_ms, scan_complete, error_code, error_message)
select ?, area, status, item_count, elapsed_ms, scan_complete, error_code, error_message
from ascet_index_areas
where run_id = ?
`).run(targetRunId, sourceRunId);
}

function deleteAreaRows(db: DatabaseSync, runId: string, area: AscetP0IndexArea): void {
	const tableByArea: Partial<Record<AscetP0IndexArea, string>> = {
		components: "ascet_components",
		folders: "ascet_folders",
		folder_items: "ascet_folder_items",
		elements: "ascet_elements",
		methods: "ascet_methods",
		project_formulas: "ascet_project_formulas",
		project_items: "ascet_project_items",
		dbitem_dependencies: "ascet_dbitem_dependencies",
		code_blocks: "ascet_code_blocks",
		code_terms: "ascet_code_terms",
	};
	const table = tableByArea[area];
	if (table) {
		db.prepare(`delete from ${table} where run_id = ?`).run(runId);
	}
	if (area === "component_refs" || area === "element_refs") {
		db.prepare("delete from ascet_element_refs where run_id = ?").run(runId);
	}
	const partitions = REFRESH_AREA_DOCUMENT_PARTITIONS[area];
	const placeholders = partitions.map(() => "?").join(", ");
	db.prepare(`delete from ascet_search_documents where run_id = ? and partition in (${placeholders})`).run(
		runId,
		...partitions,
	);
}

function updateAreaReady(
	db: DatabaseSync,
	runId: string,
	areaName: AscetP0IndexArea,
	itemCount: number,
	scanComplete: boolean,
	elapsedMs: number,
): void {
	db.prepare(`
update ascet_index_areas
set status = 'ready', item_count = ?, elapsed_ms = ?, scan_complete = ?, error_code = '', error_message = ''
where run_id = ? and area = ?
`).run(itemCount, elapsedMs, scanComplete ? 1 : 0, runId, areaName);
}

function finalizeSelectedAreas(
	db: DatabaseSync,
	runId: string,
	selectedAreas: readonly AscetP0IndexArea[],
): Array<{ area: AscetP0IndexArea; status: string; errorCode: string; errorMessage: string }> {
	const rows = db
		.prepare(
			`select area, status, error_code, error_message
from ascet_index_areas
where run_id = ? and area in (${selectedAreas.map(() => "?").join(", ")})`,
		)
		.all(runId, ...selectedAreas) as Array<{
		area?: unknown;
		status?: unknown;
		error_code?: unknown;
		error_message?: unknown;
	}>;
	const byArea = new Map(rows.map((row) => [String(row.area ?? ""), row]));
	const state = selectedAreas.map((area) => {
		const row = byArea.get(area);
		return {
			area,
			status: String(row?.status ?? "missing"),
			errorCode: String(row?.error_code ?? ""),
			errorMessage: String(row?.error_message ?? ""),
		};
	});
	const invalid = state.filter(
		(entry) => entry.status !== "ready" || entry.errorCode.length > 0 || entry.errorMessage.length > 0,
	);
	if (invalid.length > 0) {
		throw new Error(
			`ASCET SQLite area refresh finalizer rejected ${invalid.map((entry) => `${entry.area}:${entry.status}`).join(", ")}.`,
		);
	}
	return state;
}

function normalizeRefreshAreas(areas: readonly AscetP0IndexArea[]): AscetP0IndexArea[] {
	const normalized = [...new Set(areas)];
	if (normalized.includes("component_refs") !== normalized.includes("element_refs")) {
		throw new Error("ASCET reference area refresh requires component_refs and element_refs together.");
	}
	return normalized;
}

export function refreshAscetSearchIndexSqliteAreas(
	cwd: string,
	input: AscetSqliteSearchIndexBuildInput,
	areas: readonly AscetP0IndexArea[],
): AscetSqliteAreaRefreshResult {
	const selectedAreas = normalizeRefreshAreas(areas);
	if (selectedAreas.length === 0) {
		throw new Error("ASCET SQLite area refresh requires at least one area.");
	}
	const startedAtMs = Date.now();
	const runId = randomUUID();
	const connection = openAscetSearchSqlite(cwd, "writer");
	const db = connection.db;
	try {
		db.exec("begin immediate");
		const activeRun = db.prepare("select id from ascet_index_runs where active = 1 limit 1").get() as
			| { id?: unknown }
			| undefined;
		const previousRunId = typeof activeRun?.id === "string" ? activeRun.id : "";
		if (!previousRunId) {
			throw new Error("ASCET SQLite index has no active generation; a full build is required.");
		}
		const previousAreaRows = db
			.prepare("select area, status, error_code from ascet_index_areas where run_id = ?")
			.all(previousRunId) as Array<{ area?: unknown; status?: unknown; error_code?: unknown }>;
		const previousAreaState = new Map(
			previousAreaRows.map((row) => [
				String(row.area ?? ""),
				{ status: String(row.status ?? ""), errorCode: String(row.error_code ?? "") },
			]),
		);
		db.prepare(`
insert into ascet_index_runs
(id, schema_version, database_name, database_path, api_version, source_fingerprint, component_list_hash, status, active, started_at_ms, generated_at_ms, completed_at_ms, elapsed_ms, error_json)
select ?, schema_version, ?, ?, api_version, ?, ?, 'building', 0, ?, ?, 0, ?, ''
from ascet_index_runs
where id = ?
`).run(
			runId,
			input.databaseName,
			input.databasePath,
			sourceFingerprint(input),
			componentListHash(input),
			startedAtMs,
			input.generatedAtMs ?? startedAtMs,
			input.elapsedMs,
			previousRunId,
		);
		cloneRunRows(db, previousRunId, runId);

		for (const areaName of selectedAreas) {
			deleteAreaRows(db, runId, areaName);
		}

		const refreshed = new Map<AscetP0IndexArea, { itemCount: number; scanComplete: boolean }>();
		if (selectedAreas.includes("components")) {
			refreshed.set("components", {
				itemCount: insertComponents(db, runId, input),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("folders")) {
			refreshed.set("folders", {
				itemCount: insertFolders(db, runId, input.folders),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("folder_items")) {
			refreshed.set("folder_items", {
				itemCount: insertFolderItems(db, runId, input.folderItems),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("elements")) {
			refreshed.set("elements", {
				itemCount: insertElements(db, runId, input.entries),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("methods")) {
			refreshed.set("methods", {
				itemCount: insertMethods(db, runId, input.methodDeclarations),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("project_formulas")) {
			refreshed.set("project_formulas", {
				itemCount: insertProjectFormulas(db, runId, input.projectFormulas),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("project_items")) {
			refreshed.set("project_items", {
				itemCount: insertProjectItems(db, runId, input.projectItems),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("component_refs") && selectedAreas.includes("element_refs")) {
			const counts = insertReferences(db, runId, input.componentRefs, input.elementRefs);
			refreshed.set("component_refs", { itemCount: counts.componentRefs, scanComplete: input.scanComplete });
			refreshed.set("element_refs", { itemCount: counts.elementRefs, scanComplete: input.scanComplete });
		}
		if (selectedAreas.includes("dbitem_dependencies")) {
			refreshed.set("dbitem_dependencies", {
				itemCount: insertDbItemDependencies(db, runId, input.dbItemDependencies),
				scanComplete: input.scanComplete,
			});
		}
		if (selectedAreas.includes("code_blocks") || selectedAreas.includes("code_terms")) {
			const counts = insertCodeBlocks(db, runId, input);
			const scanComplete = input.textCodeScanComplete ?? input.scanComplete;
			if (selectedAreas.includes("code_blocks")) {
				refreshed.set("code_blocks", { itemCount: counts.blocks, scanComplete });
			}
			if (selectedAreas.includes("code_terms")) {
				refreshed.set("code_terms", { itemCount: counts.terms, scanComplete });
			}
		}
		if (selectedAreas.includes("messages")) {
			refreshed.set("messages", {
				itemCount: insertMessages(db, runId, input.messages),
				scanComplete: input.scanComplete,
			});
		}

		for (const [areaName, value] of refreshed) {
			updateAreaReady(db, runId, areaName, value.itemCount, value.scanComplete, input.elapsedMs);
		}
		const selectedAreaState = finalizeSelectedAreas(db, runId, selectedAreas);
		const remaining = db
			.prepare("select count(*) as count from ascet_index_areas where run_id = ? and status <> 'ready'")
			.get(runId) as { count?: unknown } | undefined;
		const status = Number(remaining?.count ?? 0) === 0 ? "ready" : "stale";
		const completedAtMs = Date.now();
		db.prepare("update ascet_index_runs set active = 0 where active = 1").run();
		db.prepare(`
update ascet_index_runs
set active = 1, status = ?, completed_at_ms = ?, elapsed_ms = ?
where id = ?
`).run(status, completedAtMs, Math.max(input.elapsedMs, completedAtMs - startedAtMs), runId);
		db.exec("commit");
		return {
			runId,
			previousRunId,
			path: connection.path,
			clearedAreas: [...refreshed.keys()],
			clearedInvalidations: selectedAreas.filter((area) => {
				const previous = previousAreaState.get(area);
				return previous?.status !== "ready" || previous.errorCode.length > 0;
			}),
			transactionCommitted: true,
			generationBefore: previousRunId,
			generationAfter: runId,
			postRefreshState: {
				status,
				areas: selectedAreaState,
			},
			status,
		};
	} catch (error) {
		if (db.isTransaction) {
			db.exec("rollback");
		}
		throw error;
	} finally {
		connection.close();
	}
}

function normalizeName(value: string | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function normalizePath(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "")
		.toLowerCase();
}

function outputPath(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function leafName(path: string): string {
	return outputPath(path).split("/").filter(Boolean).at(-1) ?? "";
}

function stableId(...parts: string[]): string {
	return createHash("sha1").update(parts.join("\0")).digest("hex");
}

function payloadJson(value: Record<string, unknown>): string {
	return JSON.stringify(value);
}

function sourceFingerprint(input: AscetSqliteSearchIndexBuildInput): string {
	const componentPaths = (input.components ?? []).map((entry) => outputPath(entry.path)).sort();
	return createHash("sha1")
		.update(
			JSON.stringify({
				databaseName: input.databaseName,
				databasePath: input.databasePath,
				components: componentPaths,
				counts: input.counts ?? {},
			}),
		)
		.digest("hex");
}

function componentListHash(input: AscetSqliteSearchIndexBuildInput): string {
	return createHash("sha1")
		.update(JSON.stringify((input.components ?? []).map((entry) => outputPath(entry.path)).sort()))
		.digest("hex");
}

function bindPayload(entry: Record<string, unknown>): string {
	return payloadJson(entry);
}

function insertDocument(
	stmt: StatementSync,
	runId: string,
	partition: string,
	kind: string,
	name: string,
	path: string,
	ownerPath: string,
	scope: string,
	runtimeType: string,
	languageKind: string,
	sourceApi: string,
	rankBase: number,
	payload: Record<string, unknown>,
): void {
	stmt.run(
		stableId(runId, kind, path, name, ownerPath, scope),
		runId,
		partition,
		kind,
		name,
		normalizeName(name),
		outputPath(path),
		normalizePath(path),
		outputPath(ownerPath),
		normalizePath(ownerPath),
		scope,
		runtimeType,
		languageKind,
		sourceApi,
		rankBase,
		bindPayload(payload),
	);
}

function insertComponents(db: DatabaseSync, runId: string, input: AscetSqliteSearchIndexBuildInput): number {
	const insert = db.prepare(`
insert into ascet_components
(id, run_id, path, path_norm, name, name_norm, component_kind, language_kind, runtime_type, parent_path, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of input.components ?? []) {
		const path = outputPath(entry.path);
		const name = entry.name || leafName(path);
		const kind = normalizeName(entry.objectKind || entry.kind) === "project" ? "project" : "component";
		insert.run(
			stableId(runId, "component", path),
			runId,
			path,
			normalizePath(path),
			name,
			normalizeName(name),
			entry.kind,
			entry.languageKind,
			entry.objectKind,
			outputPath(entry.parentPath),
			bindPayload({ ...entry, path }),
		);
		insertDocument(
			doc,
			runId,
			"components",
			kind,
			name,
			path,
			entry.parentPath,
			"",
			entry.objectKind,
			entry.languageKind,
			"GetAllComponentsOfType",
			kind === "project" ? 95 : 100,
			{ ...entry, path },
		);
	}
	return input.components?.length ?? 0;
}

function insertFolders(db: DatabaseSync, runId: string, folders: readonly AscetFolderIndexEntry[] | undefined): number {
	const insert = db.prepare(`
insert into ascet_folders
(id, run_id, path, path_norm, name, name_norm, parent_path, parent_path_norm, ordinal, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of folders ?? []) {
		const path = outputPath(entry.path);
		const name = entry.name || leafName(path);
		insert.run(
			stableId(runId, "folder", path),
			runId,
			path,
			normalizePath(path),
			name,
			normalizeName(name),
			outputPath(entry.parentPath),
			normalizePath(entry.parentPath),
			entry.ordinal ?? 0,
			bindPayload({ ...entry, path, payload: entry.payload }),
		);
		insertDocument(
			doc,
			runId,
			"folders",
			"folder",
			name,
			path,
			entry.parentPath,
			"",
			"folder",
			"",
			"GetAllAscetFolders",
			50,
			{
				...entry,
				path,
			},
		);
	}
	return folders?.length ?? 0;
}

function insertFolderItems(
	db: DatabaseSync,
	runId: string,
	folderItems: readonly AscetFolderItemIndexEntry[] | undefined,
): number {
	const insert = db.prepare(`
insert into ascet_folder_items
(id, run_id, folder_path, folder_path_norm, item_path, item_path_norm, item_name, item_name_norm, item_kind, language_kind, ordinal, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of folderItems ?? []) {
		const itemPath = outputPath(entry.itemPath);
		const folderPath = outputPath(entry.folderPath);
		const itemName = entry.itemName || leafName(itemPath);
		insert.run(
			stableId(runId, "folder_item", folderPath, itemPath),
			runId,
			folderPath,
			normalizePath(folderPath),
			itemPath,
			normalizePath(itemPath),
			itemName,
			normalizeName(itemName),
			entry.itemKind,
			entry.languageKind ?? "",
			entry.ordinal ?? 0,
			bindPayload({ ...entry, folderPath, itemPath, payload: entry.payload }),
		);
		insertDocument(
			doc,
			runId,
			"folder_items",
			"folder_item",
			itemName,
			itemPath,
			folderPath,
			"",
			entry.itemKind,
			entry.languageKind ?? "",
			"folder.GetAllDataBaseItems",
			60,
			{ ...entry, folderPath, itemPath },
		);
	}
	return folderItems?.length ?? 0;
}

function insertElements(db: DatabaseSync, runId: string, entries: readonly AscetSearchIndexEntry[]): number {
	const insert = db.prepare(`
insert into ascet_elements
(id, run_id, owner_path, owner_path_norm, name, name_norm, scope, runtime_type, group_name, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of entries) {
		const ownerPath = outputPath(entry.componentPath);
		const path = outputPath(entry.path || `${entry.componentPath}::${entry.elementName}`);
		insert.run(
			stableId(runId, "element", ownerPath, entry.elementName, entry.displayScope),
			runId,
			ownerPath,
			normalizePath(ownerPath),
			entry.elementName,
			normalizeName(entry.elementName),
			entry.displayScope,
			entry.displayType,
			entry.group,
			"GetAllModelElements",
			bindPayload({ ...entry, componentPath: ownerPath, path }),
		);
		insertDocument(
			doc,
			runId,
			"elements",
			"element",
			entry.elementName,
			path,
			ownerPath,
			entry.displayScope,
			entry.displayType || entry.elementKind,
			entry.componentLanguageKind,
			"GetAllModelElements",
			entry.group === "primitive" ? 90 : 80,
			{ ...entry, componentPath: ownerPath, path },
		);
	}
	return entries.length;
}

function insertMethods(
	db: DatabaseSync,
	runId: string,
	methods: readonly AscetMethodDeclarationIndexEntry[] | undefined,
): number {
	const insert = db.prepare(`
insert into ascet_methods
(id, run_id, owner_path, owner_path_norm, name, name_norm, method_kind, diagram_name, diagram_kind, runtime_type, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of methods ?? []) {
		const ownerPath = outputPath(entry.componentPath);
		const path = outputPath(entry.path || `${entry.componentPath}::${entry.methodName}`);
		insert.run(
			stableId(runId, "method", ownerPath, entry.methodName, entry.methodKind),
			runId,
			ownerPath,
			normalizePath(ownerPath),
			entry.methodName,
			normalizeName(entry.methodName),
			entry.methodKind,
			"",
			"",
			entry.methodKind,
			"GetAllMethods/GetAllProcesses/GetAllTriggers",
			bindPayload({ ...entry, componentPath: ownerPath, path }),
		);
		insertDocument(
			doc,
			runId,
			"methods",
			"method",
			entry.methodName,
			path,
			ownerPath,
			"",
			entry.methodKind,
			entry.componentLanguageKind,
			"GetAllMethods/GetAllProcesses/GetAllTriggers",
			85,
			{ ...entry, componentPath: ownerPath, path },
		);
	}
	return methods?.length ?? 0;
}

function insertProjectFormulas(
	db: DatabaseSync,
	runId: string,
	formulas: readonly AscetProjectFormulaIndexEntry[] | undefined,
): number {
	const insert = db.prepare(`
insert into ascet_project_formulas
(id, run_id, project_path, project_path_norm, name, name_norm, runtime_type, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of formulas ?? []) {
		const projectPath = outputPath(entry.projectPath);
		const path = outputPath(entry.path || `${projectPath}::formula::${entry.name}`);
		const runtimeType = entry.runtimeType ?? "Formula";
		const sourceApi = entry.sourceApi ?? "Project.GetAllFormulas";
		insert.run(
			stableId(runId, "project_formula", projectPath, entry.name),
			runId,
			projectPath,
			normalizePath(projectPath),
			entry.name,
			normalizeName(entry.name),
			runtimeType,
			sourceApi,
			bindPayload({ ...entry, projectPath, path, runtimeType, sourceApi }),
		);
		insertDocument(
			doc,
			runId,
			"project_formulas",
			"project_formula",
			entry.name,
			path,
			projectPath,
			"",
			runtimeType,
			"",
			sourceApi,
			75,
			{
				...entry,
				projectPath,
				path,
				runtimeType,
				sourceApi,
			},
		);
	}
	return formulas?.length ?? 0;
}

function insertProjectItems(
	db: DatabaseSync,
	runId: string,
	items: readonly AscetProjectItemIndexEntry[] | undefined,
): number {
	const insert = db.prepare(`
insert into ascet_project_items
(id, run_id, project_path, project_path_norm, name, name_norm, item_kind, runtime_type, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of items ?? []) {
		const projectPath = outputPath(entry.projectPath);
		const path = outputPath(`${projectPath}::${entry.itemKind}::${entry.name}`);
		const runtimeType = entry.runtimeType ?? "";
		const sourceApi = entry.sourceApi ?? "";
		insert.run(
			stableId(runId, "project_item", projectPath, entry.itemKind, entry.name),
			runId,
			projectPath,
			normalizePath(projectPath),
			entry.name,
			normalizeName(entry.name),
			entry.itemKind,
			runtimeType,
			sourceApi,
			bindPayload({ ...entry, projectPath, runtimeType, sourceApi }),
		);
		insertDocument(
			doc,
			runId,
			"project_items",
			"project_item",
			entry.name,
			path,
			projectPath,
			entry.itemKind,
			runtimeType,
			"",
			sourceApi,
			55,
			{
				...entry,
				projectPath,
				runtimeType,
				sourceApi,
			},
		);
	}
	return items?.length ?? 0;
}

function insertReferences(
	db: DatabaseSync,
	runId: string,
	componentRefs: AscetSqliteSearchIndexBuildInput["componentRefs"],
	elementRefs: AscetSqliteSearchIndexBuildInput["elementRefs"],
): { componentRefs: number; elementRefs: number } {
	const insert = db.prepare(`
insert into ascet_element_refs
(id, run_id, source_component_path, source_component_path_norm, source_element_name, source_element_name_norm, source_element_kind, source_element_scope, target_component_path, target_component_path_norm, target_component_name, target_component_name_norm, target_component_kind, target_language_kind, reference_kind, resolved, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const seen = new Set<string>();
	const insertOne = (
		entry: NonNullable<AscetSqliteSearchIndexBuildInput["elementRefs"]>[number],
		partition: "component_refs" | "element_refs",
	): void => {
		const sourceComponentPath = outputPath(entry.sourceComponentPath);
		const targetComponentPath = outputPath(entry.targetComponentPath);
		const path = outputPath(
			entry.path || `${sourceComponentPath}::${entry.sourceElementName}->${targetComponentPath}`,
		);
		const key = stableId(
			runId,
			partition,
			sourceComponentPath,
			entry.sourceElementName,
			targetComponentPath,
			entry.targetComponentName,
		);
		if (seen.has(key)) {
			return;
		}
		seen.add(key);
		insert.run(
			key,
			runId,
			sourceComponentPath,
			normalizePath(sourceComponentPath),
			entry.sourceElementName,
			normalizeName(entry.sourceElementName),
			entry.sourceElementKind,
			entry.sourceElementScope,
			targetComponentPath,
			normalizePath(targetComponentPath),
			entry.targetComponentName,
			normalizeName(entry.targetComponentName),
			entry.targetComponentKind,
			entry.targetLanguageKind,
			entry.referenceKind ?? "",
			entry.resolved ? 1 : 0,
			bindPayload({ ...entry, sourceComponentPath, targetComponentPath, path }),
		);
		const name =
			partition === "component_refs"
				? entry.targetComponentName || leafName(targetComponentPath)
				: entry.elementName || entry.sourceElementName;
		insertDocument(
			doc,
			runId,
			partition,
			partition === "component_refs" ? "component_ref" : "element_ref",
			name,
			path,
			sourceComponentPath,
			entry.sourceElementScope,
			entry.sourceElementKind,
			entry.targetLanguageKind,
			"GetAllReferencedModelElements",
			65,
			{ ...entry, sourceComponentPath, targetComponentPath, path },
		);
	};
	for (const entry of componentRefs ?? []) {
		insertOne(entry, "component_refs");
	}
	for (const entry of elementRefs ?? []) {
		insertOne(entry, "element_refs");
	}
	return { componentRefs: componentRefs?.length ?? 0, elementRefs: elementRefs?.length ?? 0 };
}

function insertDbItemDependencies(
	db: DatabaseSync,
	runId: string,
	dependencies: readonly AscetDbItemDependencyIndexEntry[] | undefined,
): number {
	const insert = db.prepare(`
insert into ascet_dbitem_dependencies
(id, run_id, source_path, source_path_norm, target_path, target_path_norm, target_name, target_name_norm, target_kind, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of dependencies ?? []) {
		const sourcePath = outputPath(entry.sourcePath);
		const targetPath = outputPath(entry.targetPath);
		const targetName = entry.targetName || leafName(targetPath);
		const sourceApi = entry.sourceApi ?? "GetAllReferecedDataBaseItems";
		const path = `${sourcePath}->${targetPath}`;
		insert.run(
			stableId(runId, "dbitem_dependency", sourcePath, targetPath),
			runId,
			sourcePath,
			normalizePath(sourcePath),
			targetPath,
			normalizePath(targetPath),
			targetName,
			normalizeName(targetName),
			entry.targetKind ?? "",
			sourceApi,
			bindPayload({ ...entry, sourcePath, targetPath, targetName, sourceApi }),
		);
		insertDocument(
			doc,
			runId,
			"dbitem_dependencies",
			"dbitem_dependency",
			targetName,
			path,
			sourcePath,
			"",
			entry.targetKind ?? "",
			"",
			sourceApi,
			45,
			{ ...entry, sourcePath, targetPath, targetName, sourceApi },
		);
	}
	return dependencies?.length ?? 0;
}

function tokenizeCode(text: string): Map<string, number[]> {
	const result = new Map<string, number[]>();
	const pattern = /[A-Za-z_][A-Za-z0-9_]*/g;
	for (const match of text.matchAll(pattern)) {
		const term = normalizeName(match[0]);
		if (term.length < 2) {
			continue;
		}
		const positions = result.get(term);
		if (positions) {
			positions.push(match.index);
		} else {
			result.set(term, [match.index]);
		}
	}
	return result;
}

function insertCodeBlocks(
	db: DatabaseSync,
	runId: string,
	input: AscetSqliteSearchIndexBuildInput,
): { blocks: number; terms: number } {
	const blockInsert = db.prepare(`
insert into ascet_code_blocks
(id, run_id, owner_path, owner_path_norm, block_kind, block_name, block_name_norm, language, section, text, text_norm, line_count, char_count, source_api, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	const termInsert = db.prepare(`
insert into ascet_code_terms
(run_id, term_norm, block_id, positions_json)
values (?, ?, ?, ?)
`);
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	let termCount = 0;
	for (const entry of input.textCodeEntries ?? []) {
		const ownerPath = outputPath(entry.componentPath);
		const blockName = entry.methodName || entry.section;
		const path = outputPath(entry.path || `${entry.componentPath}::${blockName}#${entry.section}`);
		const blockId = stableId(runId, "code_block", path, entry.section);
		const lineCount = entry.text.length === 0 ? 0 : entry.text.split(/\r?\n/).length;
		blockInsert.run(
			blockId,
			runId,
			ownerPath,
			normalizePath(ownerPath),
			entry.methodKind || entry.section,
			blockName,
			normalizeName(blockName),
			entry.componentLanguageKind,
			entry.section,
			entry.text,
			normalizeName(entry.text),
			lineCount,
			entry.text.length,
			"GetCode/read_text_code",
			bindPayload({ ...entry, componentPath: ownerPath, path }),
		);
		insertDocument(
			doc,
			runId,
			"code_blocks",
			"code",
			blockName,
			path,
			ownerPath,
			entry.section,
			entry.methodKind,
			entry.componentLanguageKind,
			"GetCode/read_text_code",
			40,
			{ ...entry, componentPath: ownerPath, path },
		);
		for (const [term, positions] of tokenizeCode(entry.text)) {
			termInsert.run(runId, term, blockId, JSON.stringify(positions));
			termCount += 1;
		}
	}
	return { blocks: input.textCodeEntries?.length ?? 0, terms: termCount };
}

function insertMessages(
	db: DatabaseSync,
	runId: string,
	messages: readonly AscetMessageIndexEntry[] | undefined,
): number {
	const doc = db.prepare(`
insert into ascet_search_documents
(doc_id, run_id, partition, kind, name, name_norm, path, path_norm, owner_path, owner_path_norm, scope, runtime_type, language_kind, source_api, rank_base, payload_json)
values (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of messages ?? []) {
		const ownerPath = outputPath(entry.componentPath);
		const path = outputPath(entry.path || `${entry.componentPath}::${entry.elementName}`);
		if (entry.messageDirection === "sender" || entry.messageDirection === "send_receive") {
			insertDocument(
				doc,
				runId,
				"messages",
				"message_sender",
				entry.elementName,
				path,
				ownerPath,
				entry.displayScope,
				entry.displayType,
				entry.componentLanguageKind,
				"GetAllModelElements",
				70,
				{
					...entry,
					componentPath: ownerPath,
					path,
				},
			);
		}
		if (entry.messageDirection === "receiver" || entry.messageDirection === "send_receive") {
			insertDocument(
				doc,
				runId,
				"messages",
				"message_receiver",
				entry.elementName,
				path,
				ownerPath,
				entry.displayScope,
				entry.displayType,
				entry.componentLanguageKind,
				"GetAllModelElements",
				70,
				{ ...entry, componentPath: ownerPath, path },
			);
		}
	}
	return messages?.length ?? 0;
}

function area(area: AscetP0IndexArea, itemCount: number, scanComplete = true): AreaBuildState {
	return {
		area,
		itemCount,
		elapsedMs: 0,
		scanComplete,
		status: "ready",
		errorCode: "",
		errorMessage: "",
	};
}

function insertAreaRows(db: DatabaseSync, runId: string, areas: readonly AreaBuildState[]): void {
	const insert = db.prepare(`
insert into ascet_index_areas
(run_id, area, status, item_count, elapsed_ms, scan_complete, error_code, error_message)
values (?, ?, ?, ?, ?, ?, ?, ?)
`);
	for (const entry of areas) {
		insert.run(
			runId,
			entry.area,
			entry.status,
			entry.itemCount,
			entry.elapsedMs,
			entry.scanComplete ? 1 : 0,
			entry.errorCode,
			entry.errorMessage,
		);
	}
}

function assertAllRequiredAreas(areas: readonly AreaBuildState[]): void {
	const ready = new Set(areas.filter((entry) => entry.status === "ready").map((entry) => entry.area));
	for (const required of ASCET_REQUIRED_P0_INDEX_AREAS) {
		if (!ready.has(required)) {
			throw new Error(`Missing ready P0 index area: ${required}`);
		}
	}
}

export function ingestAscetSearchIndexSqlite(
	cwd: string,
	input: AscetSqliteSearchIndexBuildInput,
	_partitions: readonly AscetSearchIndexPartition[] = ["all"],
): AscetSqliteIngestResult {
	const startedAtMs = Date.now();
	const runId = randomUUID();
	const connection = openAscetSearchSqlite(cwd, "writer");
	const db = connection.db;
	try {
		db.exec("begin immediate");
		db.prepare(`
insert into ascet_index_runs
(id, schema_version, database_name, database_path, api_version, source_fingerprint, component_list_hash, status, active, started_at_ms, generated_at_ms, completed_at_ms, elapsed_ms, error_json)
values (?, ?, ?, ?, ?, ?, ?, 'building', 0, ?, ?, 0, ?, '')
`).run(
			runId,
			ASCET_SEARCH_SQLITE_SCHEMA_VERSION,
			input.databaseName,
			input.databasePath,
			"",
			sourceFingerprint(input),
			componentListHash(input),
			startedAtMs,
			input.generatedAtMs ?? startedAtMs,
			input.elapsedMs,
		);
		const componentCount = insertComponents(db, runId, input);
		const folderCount = insertFolders(db, runId, input.folders);
		const folderItemCount = insertFolderItems(db, runId, input.folderItems);
		const elementCount = insertElements(db, runId, input.entries);
		const methodCount = insertMethods(db, runId, input.methodDeclarations);
		const formulaCount = insertProjectFormulas(db, runId, input.projectFormulas);
		const projectItemCount = insertProjectItems(db, runId, input.projectItems);
		const referenceCounts = insertReferences(db, runId, input.componentRefs, input.elementRefs);
		const dbItemDependencyCount = insertDbItemDependencies(db, runId, input.dbItemDependencies);
		const codeCounts = insertCodeBlocks(db, runId, input);
		const messageCount = insertMessages(db, runId, input.messages);
		const areas = [
			area("components", componentCount, input.scanComplete),
			area("folders", folderCount, input.scanComplete),
			area("folder_items", folderItemCount, input.scanComplete),
			area("elements", elementCount, input.scanComplete),
			area("methods", methodCount, input.scanComplete),
			area("project_formulas", formulaCount, input.scanComplete),
			area("project_items", projectItemCount, input.scanComplete),
			area("component_refs", referenceCounts.componentRefs, input.scanComplete),
			area("element_refs", referenceCounts.elementRefs, input.scanComplete),
			area("messages", messageCount, input.scanComplete),
			area("dbitem_dependencies", dbItemDependencyCount, input.scanComplete),
			area("code_blocks", codeCounts.blocks, input.textCodeScanComplete ?? input.scanComplete),
			area("code_terms", codeCounts.terms, input.textCodeScanComplete ?? input.scanComplete),
		];
		assertAllRequiredAreas(areas);
		insertAreaRows(db, runId, areas);
		const documentCountRow = db
			.prepare("select count(*) as count from ascet_search_documents where run_id = ?")
			.get(runId);
		const documentCount = Number(documentCountRow?.count ?? 0);
		const completedAtMs = Date.now();
		db.prepare("update ascet_index_runs set active = 0 where active = 1").run();
		db.prepare(`
update ascet_index_runs
set active = 1, status = 'ready', completed_at_ms = ?, elapsed_ms = ?
where id = ?
`).run(completedAtMs, Math.max(input.elapsedMs, completedAtMs - startedAtMs), runId);
		db.exec("commit");
		return {
			runId,
			path: connection.path,
			areas,
			documentCount,
			codeTermCount: codeCounts.terms,
		};
	} catch (error) {
		if (db.isTransaction) {
			db.exec("rollback");
		}
		throw error;
	} finally {
		connection.close();
	}
}

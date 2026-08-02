import { existsSync } from "node:fs";
import type { AscetCliJsonResult } from "../cli.ts";
import type {
	AscetComponentIndexQueryParams,
	AscetProjectIndexQueryParams,
	AscetReferenceIndexQueryParams,
	AscetSearchIndexMatchMode,
	AscetSearchIndexQueryOptions,
	AscetSearchIndexQueryParams,
	AscetTextCodeIndexQueryParams,
} from "../search-index-store.ts";
import { openAscetSearchSqlite } from "./connection.ts";
import { getAscetSearchIndexSqlitePath } from "./paths.ts";
import { runAscetSqliteReadQuery } from "./read-pool.ts";
import { ASCET_SEARCH_SQLITE_SCHEMA_VERSION } from "./schema.ts";

interface RunRow {
	id?: unknown;
	schema_version?: unknown;
	database_name?: unknown;
	database_path?: unknown;
	status?: unknown;
	generated_at_ms?: unknown;
	elapsed_ms?: unknown;
}

interface DocumentRow {
	kind?: unknown;
	name?: unknown;
	path?: unknown;
	owner_path?: unknown;
	scope?: unknown;
	runtime_type?: unknown;
	language_kind?: unknown;
	source_api?: unknown;
	payload_json?: unknown;
}

interface CodeBlockRow {
	id?: unknown;
	owner_path?: unknown;
	block_kind?: unknown;
	block_name?: unknown;
	language?: unknown;
	section?: unknown;
	text?: unknown;
	source_api?: unknown;
	payload_json?: unknown;
}

interface ReferenceRow {
	source_component_path?: unknown;
	source_element_name?: unknown;
	source_element_kind?: unknown;
	source_element_scope?: unknown;
	target_component_path?: unknown;
	target_component_name?: unknown;
	target_component_kind?: unknown;
	target_language_kind?: unknown;
	reference_kind?: unknown;
	resolved?: unknown;
	payload_json?: unknown;
}

interface DbItemDependencyRow {
	source_path?: unknown;
	target_path?: unknown;
	target_name?: unknown;
	target_kind?: unknown;
	source_api?: unknown;
	payload_json?: unknown;
}

interface FolderRow {
	path?: unknown;
	name?: unknown;
	parent_path?: unknown;
	ordinal?: unknown;
	payload_json?: unknown;
}

interface FolderItemRow {
	folder_path?: unknown;
	item_path?: unknown;
	item_name?: unknown;
	item_kind?: unknown;
	language_kind?: unknown;
	ordinal?: unknown;
	payload_json?: unknown;
}

export interface AscetListComponentsIndexQueryParams {
	folderPath: string;
	kind?: "all" | "folder" | "class" | "module" | "statemachine";
	languageKind?: "all" | "BDE" | "ESDL" | "C" | "Unknown";
	query?: string;
	limit?: number;
	recursive?: boolean;
}

const DEFAULT_LIMIT = 20;

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asRecord(value: unknown): Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: {};
}

function normalizeMatchMode(value: string | undefined): AscetSearchIndexMatchMode {
	return value === "exact" || value === "glob" || value === "contains" ? value : "contains";
}

function normalizeCursor(value: string | undefined): number {
	const parsed = Number.parseInt(value?.trim() || "0", 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeLimit(value: number | undefined): number {
	return Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : DEFAULT_LIMIT;
}

function normalizeAscetPath(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\//g, "\\")
		.replace(/^\\+|\\+$/g, "");
}

function normalizeOutputPath(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function normalizePathForMatching(value: string): string {
	return value.replace(/\\/g, "/");
}

function lowerPath(value: string | undefined): string {
	return normalizeAscetPath(value).toLowerCase();
}

function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`, "i");
}

function matchesNamePath(
	name: string,
	path: string,
	query: string,
	matchMode: AscetSearchIndexMatchMode,
	extraText = "",
): boolean {
	const normalizedPath = normalizePathForMatching(path);
	const normalizedQuery = query ?? "";
	const normalizedSlashQuery = normalizePathForMatching(normalizedQuery);
	const haystack = `${name}\n${path}\n${normalizedPath}\n${extraText}`;
	if (matchMode === "exact") {
		const loweredQuery = normalizedQuery.toLowerCase();
		const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
		return (
			name.toLowerCase() === loweredQuery ||
			path.toLowerCase() === loweredQuery ||
			normalizedPath.toLowerCase() === loweredSlashQuery ||
			extraText.toLowerCase() === loweredQuery
		);
	}
	if (matchMode === "glob") {
		const queryPattern = globToRegExp(normalizedQuery);
		const slashPattern = globToRegExp(normalizedSlashQuery);
		return (
			queryPattern.test(name) ||
			queryPattern.test(path) ||
			slashPattern.test(normalizedPath) ||
			queryPattern.test(extraText)
		);
	}
	return haystack.toLowerCase().includes(normalizedQuery.toLowerCase());
}

function scopeMatches(path: string, scopePath: string): boolean {
	if (!scopePath) {
		return true;
	}
	const normalizedPath = lowerPath(path);
	const scope = lowerPath(scopePath);
	return normalizedPath === scope || normalizedPath.startsWith(`${scope}\\`);
}

function parsePayload(value: unknown): Record<string, unknown> {
	if (typeof value !== "string" || !value.trim()) {
		return {};
	}
	try {
		const parsed = JSON.parse(value) as unknown;
		return parsed !== null && typeof parsed === "object" && !Array.isArray(parsed)
			? (parsed as Record<string, unknown>)
			: {};
	} catch {
		return {};
	}
}

function activeRun(cwd: string): RunRow | undefined {
	if (!existsSync(getAscetSearchIndexSqlitePath(cwd))) {
		return undefined;
	}
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			const run = connection.db
				.prepare(
					"select id, schema_version, database_name, database_path, status, generated_at_ms, elapsed_ms from ascet_index_runs where active = 1 and status in ('ready', 'stale') limit 1",
				)
				.get() as RunRow | undefined;
			return asNumber(run?.schema_version) === ASCET_SEARCH_SQLITE_SCHEMA_VERSION ? run : undefined;
		} catch {
			return undefined;
		} finally {
			connection.close();
		}
	});
}

function loadStaleAreas(cwd: string, runId: string): string[] {
	if (!existsSync(getAscetSearchIndexSqlitePath(cwd)) || !runId) {
		return [];
	}
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			const rows = connection.db
				.prepare("select area from ascet_index_areas where run_id = ? and status <> 'ready' order by area asc")
				.all(runId) as Array<{ area?: unknown }>;
			return rows.map((row) => asString(row.area)).filter(Boolean);
		} catch {
			return [];
		} finally {
			connection.close();
		}
	});
}

function requiredAreasForOperation(operation: string): readonly string[] | undefined {
	switch (operation) {
		case "search_components":
			return ["components"];
		case "search_projects":
			return ["project_items", "project_formulas"];
		case "search_elements":
			return ["elements"];
		case "declarations_of_method_process":
			return ["methods"];
		case "references_to_component":
			return ["component_refs", "dbitem_dependencies"];
		case "references_to_element":
			return ["element_refs", "code_blocks", "code_terms"];
		case "senders_of_message":
		case "receivers_of_message":
			return ["messages"];
		case "search_text_code":
			return ["code_blocks", "code_terms"];
		case "search_project_formulas":
			return ["project_formulas"];
		default:
			return undefined;
	}
}

function loadDocuments(cwd: string, runId: string, kinds: readonly string[]): DocumentRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			const placeholders = kinds.map(() => "?").join(", ");
			return connection.db
				.prepare(
					`select kind, name, path, owner_path, scope, runtime_type, language_kind, source_api, payload_json
from ascet_search_documents
where run_id = ? and kind in (${placeholders})
order by rank_base desc, name_norm asc, path_norm asc`,
				)
				.all(runId, ...kinds) as DocumentRow[];
		} finally {
			connection.close();
		}
	});
}

function makeIndexMeta(run: RunRow, scanComplete: boolean, counts: Record<string, unknown>): Record<string, unknown> {
	const generatedAtMs = asNumber(run.generated_at_ms);
	return {
		databaseName: asString(run.database_name),
		databasePath: asString(run.database_path),
		generatedAtUtc: generatedAtMs > 0 ? new Date(generatedAtMs).toISOString() : "",
		ageMs: generatedAtMs > 0 ? Math.max(0, Date.now() - generatedAtMs) : 0,
		scanComplete,
		elapsedMs: asNumber(run.elapsed_ms),
		storage: "sqlite",
		...counts,
	};
}

function makePagedResult(
	operation: string,
	params: {
		query: string;
		componentPath?: string;
		scopePath?: string;
		match?: string;
		limit?: number;
		cursor?: string;
	},
	matches: Array<Record<string, unknown>>,
	totalCandidates: number,
	run: RunRow,
	scanComplete: boolean,
	indexCounts: Record<string, unknown>,
	options: AscetSearchIndexQueryOptions,
): AscetCliJsonResult {
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const page = matches.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, matches.length);
	const pageComplete = nextCursor >= matches.length;
	const cwd = options.cwd ?? process.cwd();
	const runId = asString(run.id);
	const staleAreas = loadStaleAreas(cwd, runId);
	const requiredAreas = requiredAreasForOperation(operation);
	const relevantStaleAreas = requiredAreas ? staleAreas.filter((area) => requiredAreas.includes(area)) : staleAreas;
	const indexStatus = staleAreas.length > 0 || asString(run.status) === "stale" ? "stale" : "ready";
	const authoritative = relevantStaleAreas.length === 0;
	const searchComplete = scanComplete && pageComplete && authoritative;
	const warning =
		relevantStaleAreas.length > 0
			? "Results come from a stale ASCET SQLite search index and may not include the latest writes."
			: "";
	const payload = {
		query,
		componentPath: normalizeAscetPath(params.componentPath),
		scopePath: normalizeAscetPath(params.scopePath),
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete
			? ""
			: relevantStaleAreas.length > 0
				? "stale_index"
				: scanComplete
					? "result_limit"
					: "partial_index",
		filters: {
			limit,
		},
		counts: {
			matches: page.length,
			totalCandidates,
			candidatesVisited: totalCandidates,
		},
		matches: page,
		source: "quick_search_index",
		indexStatus,
		staleAreas,
		freshness: relevantStaleAreas.length > 0 ? "stale" : "ready",
		authoritative,
		warning,
		index: makeIndexMeta(run, scanComplete, indexCounts),
	};
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: {
			mode: "index",
			operation,
			source: "quick_search_index",
		},
	};
	return {
		ok: true,
		data,
		request: {
			cwd,
			cliPath: "quick_search_index",
			args: ["index", operation, params.query],
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function activeAreaScanComplete(cwd: string, runId: string, areas: readonly string[]): boolean {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			const rows = connection.db
				.prepare(
					`select scan_complete from ascet_index_areas where run_id = ? and area in (${areas.map(() => "?").join(", ")})`,
				)
				.all(runId, ...areas) as Array<{ scan_complete?: unknown }>;
			return rows.length === areas.length && rows.every((row) => row.scan_complete === 1);
		} catch {
			return false;
		} finally {
			connection.close();
		}
	});
}

function loadTreeFolders(cwd: string, runId: string): FolderRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			return connection.db
				.prepare(
					"select path, name, parent_path, ordinal, payload_json from ascet_folders where run_id = ? order by ordinal asc, path_norm asc",
				)
				.all(runId) as FolderRow[];
		} finally {
			connection.close();
		}
	});
}

function loadTreeFolderItems(cwd: string, runId: string): FolderItemRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			return connection.db
				.prepare(
					"select folder_path, item_path, item_name, item_kind, language_kind, ordinal, payload_json from ascet_folder_items where run_id = ? order by ordinal asc, item_path_norm asc",
				)
				.all(runId) as FolderItemRow[];
		} finally {
			connection.close();
		}
	});
}

function folderToTreeItem(row: FolderRow): Record<string, unknown> {
	const entry = parsePayload(row.payload_json);
	const payload = asRecord(entry.payload);
	const path = asString(payload.path) || asString(row.path);
	const name = asString(payload.name) || asString(row.name) || path.split(/[\\/]/).filter(Boolean).at(-1) || "";
	const parentPath = asString(payload.parentPath) || asString(row.parent_path);
	return {
		path: normalizeOutputPath(path),
		name,
		kind: asString(payload.kind) || "folder",
		languageKind: asString(payload.languageKind) || "Unknown",
		displayName: asString(payload.displayName) || name,
		parentPath: normalizeOutputPath(parentPath),
		ownerKind: asString(payload.ownerKind) || (parentPath ? "folder" : "unknown"),
		targetKind: asString(payload.targetKind) || "container",
		objectKind: asString(payload.objectKind) || "folder",
	};
}

function folderItemToTreeItem(row: FolderItemRow): Record<string, unknown> {
	const entry = parsePayload(row.payload_json);
	const payload = asRecord(entry.payload);
	const path = asString(payload.path) || asString(row.item_path);
	const name = asString(payload.name) || asString(row.item_name) || path.split(/[\\/]/).filter(Boolean).at(-1) || "";
	const parentPath = asString(payload.parentPath) || asString(row.folder_path);
	return {
		path: normalizeOutputPath(path),
		name,
		kind: asString(payload.kind) || asString(row.item_kind),
		languageKind: asString(payload.languageKind) || asString(row.language_kind) || "Unknown",
		displayName: asString(payload.displayName) || name,
		parentPath: normalizeOutputPath(parentPath),
		ownerKind: asString(payload.ownerKind) || (parentPath ? "folder" : "unknown"),
		targetKind: asString(payload.targetKind) || "component",
		objectKind: asString(payload.objectKind) || asString(payload.kind) || asString(row.item_kind),
	};
}

function normalizeTreeKind(value: string | undefined): string {
	const normalized = (value ?? "all").trim().toLowerCase();
	return normalized === "all" ||
		normalized === "folder" ||
		normalized === "class" ||
		normalized === "module" ||
		normalized === "statemachine"
		? normalized
		: "all";
}

function matchesTreeItem(item: Record<string, unknown>, kind: string, languageKind: string, query: string): boolean {
	const itemKind = asString(item.kind).toLowerCase();
	if (kind !== "all" && itemKind !== kind) {
		return false;
	}
	if (languageKind !== "all" && asString(item.languageKind).toLowerCase() !== languageKind.toLowerCase()) {
		return false;
	}
	return matchesNamePath(asString(item.name), asString(item.path), query, "contains", asString(item.displayName));
}

function buildTreeCounts(items: readonly Record<string, unknown>[]): Record<string, number> {
	const counts: Record<string, number> = {
		items: items.length,
		classes: 0,
		modules: 0,
		stateMachines: 0,
		projects: 0,
		continuousTimeBlocks: 0,
		enumerations: 0,
		records: 0,
		icons: 0,
		signals: 0,
		containers: 0,
		folders: 0,
	};
	for (const item of items) {
		switch (asString(item.kind)) {
			case "class":
				counts.classes++;
				break;
			case "module":
				counts.modules++;
				break;
			case "stateMachine":
				counts.stateMachines++;
				break;
			case "project":
				counts.projects++;
				break;
			case "continuousTimeBlock":
				counts.continuousTimeBlocks++;
				break;
			case "enumeration":
				counts.enumerations++;
				break;
			case "record":
				counts.records++;
				break;
			case "icon":
				counts.icons++;
				break;
			case "signal":
				counts.signals++;
				break;
			case "container":
				counts.containers++;
				break;
			case "folder":
				counts.folders++;
				break;
		}
	}
	return counts;
}

export function queryAscetListComponentsIndexSqlite(
	params: AscetListComponentsIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const cwd = options.cwd ?? process.cwd();
	const run = activeRun(cwd);
	if (!run?.id || !["ready", "stale"].includes(asString(run.status))) {
		return undefined;
	}
	const runId = asString(run.id);
	if (!activeAreaScanComplete(cwd, runId, ["folders", "folder_items"])) {
		return undefined;
	}

	const requestedFolderPath = normalizeAscetPath(params.folderPath);
	const staleAreas = loadStaleAreas(cwd, runId);
	const requiredAreas = ["folders", "folder_items"];
	const relevantStaleAreas = staleAreas.filter((area) => requiredAreas.includes(area));
	const scanComplete = activeAreaScanComplete(cwd, runId, requiredAreas);
	if (relevantStaleAreas.length > 0) {
		return undefined;
	}
	const folders = loadTreeFolders(cwd, runId).map(folderToTreeItem);
	const folderItems = loadTreeFolderItems(cwd, runId).map(folderItemToTreeItem);
	const foldersByParent = new Map<string, Record<string, unknown>[]>();
	const itemsByFolder = new Map<string, Record<string, unknown>[]>();
	const foldersByPath = new Map<string, Record<string, unknown>>();
	for (const folder of folders) {
		const pathKey = lowerPath(asString(folder.path));
		foldersByPath.set(pathKey, folder);
		const parentKey = lowerPath(asString(folder.parentPath));
		const children = foldersByParent.get(parentKey) ?? [];
		children.push(folder);
		foldersByParent.set(parentKey, children);
	}
	for (const item of folderItems) {
		const folderKey = lowerPath(asString(item.parentPath));
		const children = itemsByFolder.get(folderKey) ?? [];
		children.push(item);
		itemsByFolder.set(folderKey, children);
	}
	if (requestedFolderPath && !foldersByPath.has(lowerPath(requestedFolderPath))) {
		return undefined;
	}

	const kind = normalizeTreeKind(params.kind);
	const languageKind = params.languageKind?.trim() || "all";
	const query = params.query?.trim() ?? "";
	const limit =
		Number.isFinite(params.limit) && (params.limit ?? 0) > 0
			? Math.floor(params.limit ?? 0)
			: Number.MAX_SAFE_INTEGER;
	const recursive = params.recursive === true;
	const items: Record<string, unknown>[] = [];
	const add = (item: Record<string, unknown>) => {
		if (items.length < limit && matchesTreeItem(item, kind, languageKind, query)) {
			items.push(item);
		}
	};
	const visitFolderContents = (folderPath: string) => {
		if (items.length >= limit) {
			return;
		}
		for (const item of itemsByFolder.get(lowerPath(folderPath)) ?? []) {
			add(item);
			if (items.length >= limit) {
				return;
			}
		}
		for (const child of foldersByParent.get(lowerPath(folderPath)) ?? []) {
			add(child);
			if (items.length >= limit) {
				return;
			}
			if (recursive) {
				visitFolderContents(asString(child.path));
				if (items.length >= limit) {
					return;
				}
			}
		}
	};
	if (!requestedFolderPath) {
		for (const topFolder of foldersByParent.get("") ?? []) {
			add(topFolder);
			if (items.length >= limit) {
				break;
			}
			visitFolderContents(asString(topFolder.path));
			if (items.length >= limit) {
				break;
			}
		}
	} else {
		visitFolderContents(requestedFolderPath);
	}

	const payload = {
		folderPath: normalizeOutputPath(requestedFolderPath),
		filters: { kind, languageKind, query, limit: params.limit ?? 0, recursive },
		counts: buildTreeCounts(items),
		items,
		source: "quick_search_index",
		indexStatus: relevantStaleAreas.length > 0 ? "stale" : "ready",
		staleAreas,
		freshness: relevantStaleAreas.length > 0 ? "stale" : "ready",
		authoritative: relevantStaleAreas.length === 0,
		searchComplete: scanComplete && relevantStaleAreas.length === 0,
		truncated: !(scanComplete && relevantStaleAreas.length === 0),
		truncationReason: relevantStaleAreas.length > 0 ? "stale_index" : scanComplete ? "" : "partial_index",
		warning:
			relevantStaleAreas.length > 0
				? "Results come from a stale ASCET SQLite search index and may not include the latest writes."
				: "",
		index: makeIndexMeta(run, scanComplete, { folderCount: folders.length, folderItemCount: folderItems.length }),
	};
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: { mode: "index", operation: "list_components", source: "quick_search_index" },
	};
	return {
		ok: true,
		data,
		request: { cwd, cliPath: "quick_search_index", args: ["index", "list_components", requestedFolderPath] },
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function documentToComponent(row: DocumentRow): Record<string, unknown> {
	const payload = parsePayload(row.payload_json);
	return {
		path: normalizeOutputPath(asString(row.path)),
		name: asString(row.name),
		kind: asString(payload.kind) || asString(row.runtime_type),
		languageKind: asString(row.language_kind),
		displayName: asString(payload.displayName) || asString(row.name),
		parentPath: normalizeOutputPath(asString(payload.parentPath)),
		ownerKind: asString(payload.ownerKind),
		targetKind: asString(payload.targetKind),
		objectKind: asString(payload.objectKind) || asString(row.kind),
	};
}

function documentToElement(row: DocumentRow): Record<string, unknown> {
	const payload = parsePayload(row.payload_json);
	return {
		group: asString(payload.group),
		componentPath: normalizeOutputPath(asString(row.owner_path)),
		componentKind: asString(payload.componentKind),
		componentLanguageKind: asString(row.language_kind),
		elementName: asString(row.name),
		elementKind: asString(payload.elementKind),
		displayType: asString(row.runtime_type),
		displayScope: asString(row.scope),
		referencedComponentPath: normalizeOutputPath(asString(payload.referencedComponentPath)),
		path: normalizeOutputPath(asString(row.path)),
	};
}

export function queryAscetComponentIndexSqlite(
	params: AscetComponentIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const scopePath = normalizeAscetPath(params.scopePath);
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), ["component", "project"]);
	const filtered = rows.filter((row) => {
		const component = documentToComponent(row);
		const kind = asString(component.kind).toLowerCase();
		const objectKind = asString(component.objectKind).toLowerCase();
		return (
			asString(row.kind) === "component" &&
			(!params.kind || kind === params.kind || objectKind === params.kind) &&
			scopeMatches(asString(row.path), scopePath) &&
			matchesNamePath(asString(row.name), asString(row.path), query, matchMode)
		);
	});
	return makePagedResult(
		"search_components",
		params,
		filtered.map(documentToComponent),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["components"]),
		{ componentCount: rows.filter((row) => asString(row.kind) === "component").length },
		options,
	);
}

export function queryAscetProjectIndexSqlite(
	params: AscetProjectIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const scopePath = normalizeAscetPath(params.scopePath);
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), ["project"]);
	const filtered = rows.filter(
		(row) =>
			scopeMatches(asString(row.path), scopePath) &&
			matchesNamePath(asString(row.name), asString(row.path), query, matchMode),
	);
	const pageResult = makePagedResult(
		"search_projects",
		params,
		filtered.map((row) => ({
			path: normalizeOutputPath(asString(row.path)),
			name: asString(row.name),
			kind: "project",
		})),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["project_items", "project_formulas"]),
		{ projectCount: rows.length },
		options,
	);
	const payload = (pageResult.data as { result: Record<string, unknown> }).result;
	pageResult.data = {
		ok: true,
		result: {
			total: filtered.length,
			items: payload.matches,
			nextCursor: payload.nextCursor,
			searchComplete: payload.searchComplete,
			truncated: payload.truncated,
			truncationReason: payload.truncationReason,
			indexStatus: payload.indexStatus,
			staleAreas: payload.staleAreas,
			freshness: payload.freshness,
			authoritative: payload.authoritative,
			warning: payload.warning,
			index: payload.index,
		},
		error: null,
		meta: {
			mode: "index",
			operation: "search_projects",
			source: "quick_search_index",
		},
	};
	pageResult.stdout = JSON.stringify(pageResult.data);
	return pageResult;
}

export function queryAscetSearchIndexSqlite(
	params: AscetSearchIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = lowerPath(params.componentPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const group =
		params.group === "primitive" || params.group === "complex" || params.group === "referenced"
			? params.group
			: "all";
	const kind = params.kind?.trim().toLowerCase() ?? "";
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), ["element"]);
	const filtered = rows.filter((row) => {
		const payload = parsePayload(row.payload_json);
		if (componentPath && lowerPath(asString(row.owner_path)) !== componentPath) {
			return false;
		}
		const payloadGroup = asString(payload.group);
		const referenced = asString(payload.referencedComponentPath);
		const groupMatches = group === "all" || (group === "referenced" ? referenced.length > 0 : payloadGroup === group);
		const kindMatches = !kind || asString(payload.elementKind).toLowerCase().includes(kind);
		return (
			groupMatches &&
			kindMatches &&
			scopeMatches(asString(row.owner_path), scopePath) &&
			matchesNamePath(
				asString(row.name),
				asString(row.path),
				query,
				matchMode,
				`${asString(row.runtime_type)}\n${asString(row.scope)}`,
			)
		);
	});
	return makePagedResult(
		"search_elements",
		params,
		filtered.map(documentToElement),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["elements"]),
		{ entryCount: rows.length },
		options,
	);
}

export function queryAscetMethodDeclarationIndexSqlite(
	params: AscetSqliteMethodQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = lowerPath(params.componentPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), ["method"]);
	const filtered = rows.filter((row) => {
		if (componentPath && lowerPath(asString(row.owner_path)) !== componentPath) {
			return false;
		}
		return (
			scopeMatches(asString(row.owner_path), scopePath) &&
			matchesNamePath(asString(row.name), asString(row.path), query, matchMode, asString(row.runtime_type))
		);
	});
	return makePagedResult(
		"declarations_of_method_process",
		params,
		filtered.map((row) => ({
			...parsePayload(row.payload_json),
			name: asString(row.name),
			kind: "method",
			type: asString(row.runtime_type),
			componentPath: normalizeOutputPath(asString(row.owner_path)),
			path: normalizeOutputPath(asString(row.path)),
		})),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["methods"]),
		{ methodDeclarationCount: rows.length },
		options,
	);
}

export type AscetSqliteMethodQueryParams = {
	query: string;
	componentPath?: string;
	scopePath?: string;
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
};

function loadReferences(cwd: string, runId: string): ReferenceRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			return connection.db
				.prepare(`
select source_component_path, source_element_name, source_element_kind, source_element_scope, target_component_path,
target_component_name, target_component_kind, target_language_kind, reference_kind, resolved, payload_json
from ascet_element_refs
where run_id = ?
order by source_component_path_norm asc, source_element_name_norm asc, target_component_path_norm asc
`)
				.all(runId) as ReferenceRow[];
		} finally {
			connection.close();
		}
	});
}

function loadDbItemDependencies(cwd: string, runId: string): DbItemDependencyRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			return connection.db
				.prepare(`
select source_path, target_path, target_name, target_kind, source_api, payload_json
from ascet_dbitem_dependencies
where run_id = ?
order by source_path_norm asc, target_path_norm asc
`)
				.all(runId) as DbItemDependencyRow[];
		} finally {
			connection.close();
		}
	});
}

export function queryAscetComponentReferenceIndexSqlite(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return queryReferenceIndex(params, options, "references_to_component", "component");
}

export function queryAscetElementReferenceIndexSqlite(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return queryReferenceIndex(params, options, "references_to_element", "element");
}

function queryReferenceIndex(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions,
	operation: "references_to_component" | "references_to_element",
	target: "component" | "element",
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = lowerPath(params.componentPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const rows = loadReferences(options.cwd ?? process.cwd(), asString(run.id));
	const dedupedRows = rows.filter((row, index) => {
		const key = [
			asString(row.source_component_path).toLowerCase(),
			asString(row.source_element_name).toLowerCase(),
			asString(row.target_component_path).toLowerCase(),
			asString(row.target_component_name).toLowerCase(),
		].join("\0");
		return (
			rows.findIndex(
				(candidate) =>
					[
						asString(candidate.source_component_path).toLowerCase(),
						asString(candidate.source_element_name).toLowerCase(),
						asString(candidate.target_component_path).toLowerCase(),
						asString(candidate.target_component_name).toLowerCase(),
					].join("\0") === key,
			) === index
		);
	});
	const filtered = dedupedRows.filter((row) => {
		if (componentPath && lowerPath(asString(row.source_component_path)) !== componentPath) {
			return false;
		}
		const name = target === "component" ? asString(row.target_component_name) : asString(row.source_element_name);
		const path = `${asString(row.source_component_path)}::${asString(row.source_element_name)}->${asString(row.target_component_path)}`;
		return (
			scopeMatches(asString(row.source_component_path), scopePath) &&
			matchesNamePath(
				name,
				path,
				query,
				matchMode,
				`${asString(row.source_element_kind)}\n${asString(row.source_element_scope)}\n${asString(row.target_component_path)}`,
			)
		);
	});
	const matches: Array<Record<string, unknown>> = filtered.map((row) => {
		if (target === "component") {
			return {
				path: `${normalizeOutputPath(asString(row.source_component_path))}::${asString(row.source_element_name)}->${normalizeOutputPath(asString(row.target_component_path))}`,
				source: {
					component: normalizeOutputPath(asString(row.source_component_path)),
					name: asString(row.source_element_name),
					type: asString(row.source_element_kind),
					scope: asString(row.source_element_scope),
				},
				target: {
					component: normalizeOutputPath(asString(row.target_component_path)),
					name: asString(row.target_component_name),
					type: asString(row.target_component_kind),
					language: asString(row.target_language_kind),
				},
				resolved: row.resolved === 1,
			};
		}
		return {
			path: `${normalizeOutputPath(asString(row.source_component_path))}::${asString(row.source_element_name)}->${normalizeOutputPath(asString(row.target_component_path))}`,
			name: asString(row.source_element_name),
			kind: "reference",
			type: asString(row.source_element_kind),
			scope: asString(row.source_element_scope),
			source: {
				component: normalizeOutputPath(asString(row.source_component_path)),
				name: asString(row.source_element_name),
			},
			target: {
				component: normalizeOutputPath(asString(row.target_component_path)),
				name: asString(row.target_component_name),
			},
			resolved: row.resolved === 1,
		};
	});
	let extraCandidateCount = 0;
	if (target === "component") {
		const dependencyRows = loadDbItemDependencies(options.cwd ?? process.cwd(), asString(run.id));
		extraCandidateCount = dependencyRows.length;
		const dependencyMatches = dependencyRows.filter((row) => {
			if (componentPath && lowerPath(asString(row.source_path)) !== componentPath) {
				return false;
			}
			return (
				scopeMatches(asString(row.source_path), scopePath) &&
				matchesNamePath(
					asString(row.target_name),
					asString(row.target_path),
					query,
					matchMode,
					`${asString(row.target_kind)}\n${asString(row.source_api)}`,
				)
			);
		});
		for (const row of dependencyMatches) {
			matches.push({
				path: `${normalizeOutputPath(asString(row.source_path))}->${normalizeOutputPath(asString(row.target_path))}`,
				source: {
					component: normalizeOutputPath(asString(row.source_path)),
					name: "",
					type: "database_item",
					scope: "",
				},
				target: {
					component: normalizeOutputPath(asString(row.target_path)),
					name: asString(row.target_name),
					type: asString(row.target_kind),
					language: "",
				},
				resolved: true,
				relation: "dbitem_dependency",
				sourceApi: asString(row.source_api) || "GetAllReferecedDataBaseItems",
			});
		}
	} else {
		const codeRows = loadCodeBlocks(
			options.cwd ?? process.cwd(),
			asString(run.id),
			query.toLowerCase(),
			matchMode !== "glob" && /^[a-z_][a-z0-9_]*$/i.test(query),
		);
		extraCandidateCount = codeRows.length;
		const codeMatches = codeRows.filter((row) => {
			if (componentPath && lowerPath(asString(row.owner_path)) !== componentPath) {
				return false;
			}
			return (
				scopeMatches(asString(row.owner_path), scopePath) &&
				matchesNamePath(asString(row.block_name), asString(row.owner_path), query, matchMode, asString(row.text))
			);
		});
		for (const row of codeMatches) {
			matches.push({
				path: normalizeOutputPath(asString(row.owner_path)),
				name: query,
				kind: "text_reference",
				type: asString(row.block_kind),
				scope: asString(row.section),
				source: {
					component: normalizeOutputPath(asString(row.owner_path)),
					name: asString(row.block_name),
				},
				target: {
					component: "",
					name: query,
				},
				resolved: false,
				relation: "code_term",
				...findTextSnippet(asString(row.text), query, matchMode),
			});
		}
	}
	return makePagedResult(
		operation,
		params,
		matches,
		matches.length,
		run,
		activeAreaScanComplete(
			options.cwd ?? process.cwd(),
			asString(run.id),
			target === "component"
				? ["component_refs", "dbitem_dependencies"]
				: ["element_refs", "code_blocks", "code_terms"],
		),
		target === "component"
			? { componentRefCount: dedupedRows.length, dbItemDependencyCount: extraCandidateCount }
			: { elementRefCount: dedupedRows.length, codeBlockCount: extraCandidateCount },
		options,
	);
}

export function queryAscetMessageIndexSqlite(
	params: AscetReferenceIndexQueryParams & { direction?: "sender" | "receiver" },
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const direction = params.direction === "receiver" ? "receiver" : "sender";
	const kind = direction === "receiver" ? "message_receiver" : "message_sender";
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), [kind]);
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = lowerPath(params.componentPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = rows.filter((row) => {
		if (componentPath && lowerPath(asString(row.owner_path)) !== componentPath) {
			return false;
		}
		return (
			scopeMatches(asString(row.owner_path), scopePath) &&
			matchesNamePath(asString(row.name), asString(row.path), query, matchMode, asString(row.runtime_type))
		);
	});
	return makePagedResult(
		direction === "receiver" ? "receivers_of_message" : "senders_of_message",
		params,
		filtered.map((row) => ({
			...documentToElement(row),
			name: asString(row.name),
			kind: "message",
			type: asString(row.runtime_type),
			scope: asString(row.scope),
			direction,
		})),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["messages"]),
		{ messageCount: rows.length },
		options,
	);
}

function loadCodeBlocks(cwd: string, runId: string, term: string, useTermFilter: boolean): CodeBlockRow[] {
	return runAscetSqliteReadQuery(() => {
		const connection = openAscetSearchSqlite(cwd, "reader");
		try {
			if (useTermFilter) {
				return connection.db
					.prepare(`
select b.id, b.owner_path, b.block_kind, b.block_name, b.language, b.section, b.text, b.source_api, b.payload_json
from ascet_code_terms t
join ascet_code_blocks b on b.id = t.block_id and b.run_id = t.run_id
where t.run_id = ? and t.term_norm = ?
order by b.owner_path_norm asc, b.block_name_norm asc
`)
					.all(runId, term) as CodeBlockRow[];
			}
			return connection.db
				.prepare(`
select id, owner_path, block_kind, block_name, language, section, text, source_api, payload_json
from ascet_code_blocks
where run_id = ?
order by owner_path_norm asc, block_name_norm asc
`)
				.all(runId) as CodeBlockRow[];
		} finally {
			connection.close();
		}
	});
}

function findTextSnippet(
	text: string,
	query: string,
	matchMode: AscetSearchIndexMatchMode,
): { lineNumber: number; snippet: string } {
	const lines = text.split(/\r?\n/);
	const pattern = matchMode === "glob" ? globToRegExp(query) : undefined;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const matches =
			matchMode === "exact"
				? line.trim().toLowerCase() === query.toLowerCase()
				: matchMode === "glob"
					? (pattern?.test(line) ?? false)
					: line.toLowerCase().includes(query.toLowerCase());
		if (matches) {
			return { lineNumber: i + 1, snippet: line.trim() };
		}
	}
	return { lineNumber: 0, snippet: (lines.find((line) => line.trim()) ?? "").trim().slice(0, 240) };
}

export function queryAscetTextCodeIndexSqlite(
	params: AscetTextCodeIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const term = query.toLowerCase();
	const useTermFilter = matchMode !== "glob" && /^[a-z_][a-z0-9_]*$/i.test(query);
	const rows = loadCodeBlocks(options.cwd ?? process.cwd(), asString(run.id), term, useTermFilter);
	const componentPath = lowerPath(params.componentPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const methodName = params.methodName?.trim().toLowerCase() ?? "";
	const section = params.section?.trim().toLowerCase() ?? "";
	const filtered = rows.filter((row) => {
		if (componentPath && lowerPath(asString(row.owner_path)) !== componentPath) {
			return false;
		}
		if (methodName && asString(row.block_name).toLowerCase() !== methodName) {
			return false;
		}
		if (section && section !== "auto" && section !== "all" && asString(row.section).toLowerCase() !== section) {
			return false;
		}
		return (
			scopeMatches(asString(row.owner_path), scopePath) &&
			matchesNamePath(asString(row.block_name), asString(row.owner_path), query, matchMode, asString(row.text))
		);
	});
	return makePagedResult(
		"search_text_code",
		params,
		filtered.map((row) => {
			const payload = parsePayload(row.payload_json);
			const text = asString(row.text);
			return {
				componentPath: normalizeOutputPath(asString(row.owner_path)),
				componentKind: asString(payload.componentKind),
				componentLanguageKind: asString(row.language),
				section: asString(row.section),
				methodName: asString(row.block_name),
				methodKind: asString(row.block_kind),
				text: "",
				path: normalizeOutputPath(asString(payload.path)),
				...findTextSnippet(text, query, matchMode),
			};
		}),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["code_blocks", "code_terms"]),
		{ textCodeEntryCount: rows.length },
		options,
	);
}

export function queryAscetProjectFormulaIndexSqlite(
	params: AscetProjectIndexQueryParams & { projectPath?: string },
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	const run = activeRun(options.cwd ?? process.cwd());
	if (!run?.id) {
		return undefined;
	}
	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const projectPath = lowerPath(params.projectPath);
	const scopePath = normalizeAscetPath(params.scopePath);
	const rows = loadDocuments(options.cwd ?? process.cwd(), asString(run.id), ["project_formula"]);
	const filtered = rows.filter((row) => {
		if (projectPath && lowerPath(asString(row.owner_path)) !== projectPath) {
			return false;
		}
		return (
			scopeMatches(asString(row.owner_path), scopePath) &&
			matchesNamePath(asString(row.name), asString(row.path), query, matchMode, asString(row.runtime_type))
		);
	});
	return makePagedResult(
		"search_project_formulas",
		params,
		filtered.map((row) => ({
			kind: "project_formula",
			name: asString(row.name),
			projectPath: normalizeOutputPath(asString(row.owner_path)),
			path: normalizeOutputPath(asString(row.path)),
			runtimeType: asString(row.runtime_type) || "Formula",
			sourceApi: asString(row.source_api) || "Project.GetAllFormulas",
		})),
		filtered.length,
		run,
		activeAreaScanComplete(options.cwd ?? process.cwd(), asString(run.id), ["project_formulas"]),
		{ projectFormulaCount: rows.length },
		options,
	);
}

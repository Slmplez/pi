import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	type RunAscetCliJsonOptions,
	runAscetCliJson,
} from "./cli.ts";

export type { AscetFullElementCacheEntry } from "./search-index-store.ts";

import { ingestAscetSearchIndexSqlite } from "./search-index-sqlite/ingest.ts";
import {
	queryAscetComponentIndexSqlite,
	queryAscetComponentReferenceIndexSqlite,
	queryAscetElementReferenceIndexSqlite,
	queryAscetListComponentsIndexSqlite,
	queryAscetMessageIndexSqlite,
	queryAscetMethodDeclarationIndexSqlite,
	queryAscetProjectFormulaIndexSqlite,
	queryAscetProjectIndexSqlite,
	queryAscetSearchIndexSqlite,
	queryAscetTextCodeIndexSqlite,
} from "./search-index-sqlite/query.ts";
import { getAscetSqliteIndexStatus } from "./search-index-sqlite/status.ts";
import { getAscetIndexStatusFilePath, writeAscetIndexStatusFile } from "./search-index-sqlite/status-file.ts";
import type { AscetSqliteSearchIndexBuildInput } from "./search-index-sqlite/types.ts";
import {
	type AscetComponentIndexQueryParams,
	type AscetComponentSearchIndexEntry,
	type AscetDbItemDependencyIndexEntry,
	type AscetDiagramMetadataIndexEntry,
	type AscetDiagramMetadataIndexQueryParams,
	type AscetFolderIndexEntry,
	type AscetFolderItemIndexEntry,
	type AscetMessageIndexEntry,
	type AscetMessageIndexQueryParams,
	type AscetMethodDeclarationIndexEntry,
	type AscetMethodDeclarationIndexQueryParams,
	type AscetMethodProcessElementIndexEntry,
	type AscetMethodProcessElementIndexQueryParams,
	type AscetProjectFormulaIndexEntry,
	type AscetProjectFormulaIndexQueryParams,
	type AscetProjectIndexQueryParams,
	type AscetProjectItemIndexEntry,
	type AscetReferenceIndexEntry,
	type AscetReferenceIndexQueryParams,
	type AscetSearchIndexCounts,
	type AscetSearchIndexEntry,
	type AscetSearchIndexPartition,
	type AscetSearchIndexQueryOptions,
	type AscetSearchIndexQueryParams,
	type AscetTextCodeIndexQueryParams,
	type AscetTextCodeSearchIndexEntry,
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	installAscetSearchIndex,
	markAscetSearchIndexFailed,
	markAscetSearchIndexWarming,
	queryAscetComponentIndex as queryAscetComponentIndexMemory,
	queryAscetComponentReferenceIndex as queryAscetComponentReferenceIndexMemory,
	queryAscetDiagramMetadataIndex as queryAscetDiagramMetadataIndexMemory,
	queryAscetElementReferenceIndex as queryAscetElementReferenceIndexMemory,
	queryAscetMessageIndex as queryAscetMessageIndexMemory,
	queryAscetMethodDeclarationIndex as queryAscetMethodDeclarationIndexMemory,
	queryAscetMethodProcessElementIndex as queryAscetMethodProcessElementIndexMemory,
	queryAscetProjectIndex as queryAscetProjectIndexMemory,
	queryAscetSearchIndex as queryAscetSearchIndexMemory,
	queryAscetTextCodeIndex as queryAscetTextCodeIndexMemory,
} from "./search-index-store.ts";

const DEFAULT_SEARCH_INDEX_TTL_MS = 10 * 60 * 1000;

export type AscetSearchIndexWarmupPartition = AscetSearchIndexPartition | "p0";

export type {
	AscetComponentIndexQueryParams,
	AscetComponentSearchIndexEntry,
	AscetDbItemDependencyIndexEntry,
	AscetDiagramMetadataIndexEntry,
	AscetDiagramMetadataIndexQueryParams,
	AscetFolderIndexEntry,
	AscetFolderItemIndexEntry,
	AscetMessageIndexEntry,
	AscetMessageIndexQueryParams,
	AscetMethodDeclarationIndexEntry,
	AscetMethodDeclarationIndexQueryParams,
	AscetMethodProcessElementIndexEntry,
	AscetMethodProcessElementIndexQueryParams,
	AscetProjectFormulaIndexEntry,
	AscetProjectFormulaIndexQueryParams,
	AscetProjectIndexQueryParams,
	AscetProjectItemIndexEntry,
	AscetReferenceIndexEntry,
	AscetReferenceIndexQueryParams,
	AscetSearchIndexCounts,
	AscetSearchIndexEntry,
	AscetSearchIndexGroup,
	AscetSearchIndexPartition,
	AscetSearchIndexPartitionLifecycleState,
	AscetSearchIndexQueryOptions,
	AscetSearchIndexQueryParams,
	AscetSearchIndexState,
	AscetTextCodeIndexQueryParams,
	AscetTextCodeSearchIndexEntry,
} from "./search-index-store.ts";
export {
	getAscetFullElement,
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	invalidateAscetSearchIndex,
	invalidateAscetSearchIndexPartitions,
	queryAscetFullElements,
	resetAscetSearchIndexForTest,
	upsertAscetElementDeclarations,
	upsertAscetFullElements,
} from "./search-index-store.ts";

export interface AscetSearchIndexWarmupOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	partition?: AscetSearchIndexWarmupPartition;
	forceRefresh?: boolean;
	componentPath?: string;
	maxComponents?: number;
	includeTextCode?: boolean;
	maxTextChars?: number;
	scanTimeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: RunAscetCliJsonOptions["scheduler"];
	toolName?: string;
}

export interface AscetSearchIndexBackgroundRefreshOptions
	extends Pick<
		AscetSearchIndexWarmupOptions,
		"cwd" | "env" | "signal" | "timeoutMs" | "executeCli" | "scheduler" | "scanTimeoutMs"
	> {
	reason?: string;
	delayMs?: number;
}

export interface AscetSearchIndexWarmupResult {
	ok: boolean;
	commandId: "warm_search_index";
	databaseName: string;
	databasePath: string;
	entryCount: number;
	elapsedMs: number;
	scanComplete: boolean;
	fromCache: boolean;
	error?: {
		code: string;
		message: string;
	};
	exitCode: number | null;
	timedOut: boolean;
	stdout: string;
	stderr: string;
}

const inFlightWarmups = new Map<string, Promise<AscetSearchIndexWarmupResult>>();
const scheduledBackgroundRefreshes = new Set<string>();

function getEnvValue(env: Record<string, string | undefined> | undefined, key: string): string | undefined {
	return env?.[key] ?? process.env[key];
}

function isSearchIndexDisabled(env: Record<string, string | undefined> | undefined): boolean {
	return getEnvValue(env, "PI_ASCET_SEARCH_INDEX") === "0";
}

function isForceWarmup(env: Record<string, string | undefined> | undefined): boolean {
	return getEnvValue(env, "PI_ASCET_SEARCH_INDEX_FORCE") === "1";
}

function isTextCodeWarmupEnabled(env: Record<string, string | undefined> | undefined): boolean {
	return getEnvValue(env, "PI_ASCET_SEARCH_INDEX_INCLUDE_TEXT") === "1";
}

function isSqliteStorageEnabled(env: Record<string, string | undefined> | undefined): boolean {
	return getEnvValue(env, "PI_ASCET_SEARCH_INDEX_STORAGE") !== "memory";
}

function isBackgroundRefreshEnabled(
	env: Record<string, string | undefined> | undefined,
	scheduler: AscetSearchIndexWarmupOptions["scheduler"],
): boolean {
	const configured = getEnvValue(env, "PI_ASCET_SEARCH_INDEX_BACKGROUND_REFRESH");
	if (configured === "0") {
		return false;
	}
	if (configured === "1") {
		return true;
	}
	return scheduler !== undefined;
}

function normalizeWarmupPartition(
	options: Pick<AscetSearchIndexWarmupOptions, "partition" | "includeTextCode">,
): AscetSearchIndexWarmupPartition {
	return options.partition ?? "p0";
}

function partitionsForWarmup(partition: AscetSearchIndexWarmupPartition): AscetSearchIndexPartition[] {
	return partition === "p0"
		? ["components", "element_decls", "method_decls", "component_refs", "element_refs", "messages", "text_code"]
		: partition === "all"
			? ["components", "element_decls", "method_decls", "component_refs", "element_refs", "messages", "text_code"]
			: [partition];
}

function getSearchIndexTtlMs(env: Record<string, string | undefined> | undefined): number {
	const configured = getEnvValue(env, "PI_ASCET_SEARCH_INDEX_TTL_MS");
	if (configured === undefined || configured.trim() === "") {
		return DEFAULT_SEARCH_INDEX_TTL_MS;
	}
	const parsed = Number(configured);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : DEFAULT_SEARCH_INDEX_TTL_MS;
}

function getSearchIndexMaxTextChars(env: Record<string, string | undefined> | undefined): number | undefined {
	const configured = getEnvValue(env, "PI_ASCET_SEARCH_INDEX_MAX_TEXT_CHARS");
	if (configured === undefined || configured.trim() === "") {
		return undefined;
	}
	const parsed = Number(configured);
	return Number.isFinite(parsed) && parsed >= 0 ? Math.floor(parsed) : undefined;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function asBoolean(value: unknown, fallback: boolean): boolean {
	return typeof value === "boolean" ? value : fallback;
}

function indexStatusAreasFromInput(
	input: AscetSqliteSearchIndexBuildInput,
): Record<string, { status: "ready"; count: number }> {
	return {
		components: { status: "ready", count: input.components?.length ?? 0 },
		folders: { status: "ready", count: input.folders?.length ?? 0 },
		folder_items: { status: "ready", count: input.folderItems?.length ?? 0 },
		elements: { status: "ready", count: input.entries?.length ?? 0 },
		methods: { status: "ready", count: input.methodDeclarations?.length ?? 0 },
		project_formulas: { status: "ready", count: input.projectFormulas?.length ?? 0 },
		project_items: { status: "ready", count: input.projectItems?.length ?? 0 },
		component_refs: { status: "ready", count: input.componentRefs?.length ?? 0 },
		element_refs: { status: "ready", count: input.elementRefs?.length ?? 0 },
		messages: { status: "ready", count: input.messages?.length ?? 0 },
		dbitem_dependencies: { status: "ready", count: input.dbItemDependencies?.length ?? 0 },
		code_blocks: { status: "ready", count: input.textCodeEntries?.length ?? 0 },
		code_terms: { status: "ready", count: input.textCodeEntries?.length ?? 0 },
	};
}

function writeSqliteCacheStatusFile(
	cwd: string,
	sqliteStatus: ReturnType<typeof getAscetSqliteIndexStatus>,
	totalDocs = sqliteStatus.areas.reduce((total, area) => total + area.itemCount, 0),
): void {
	writeAscetIndexStatusFile(cwd, {
		state: sqliteStatus.status === "stale" ? "stale" : "ready",
		phase: "p0",
		elapsedMs: sqliteStatus.elapsedMs,
		totalDocs,
		staleAreas: sqliteStatus.areas.filter((area) => area.status === "stale").map((area) => area.area),
		areas: Object.fromEntries(
			sqliteStatus.areas.map((area) => [
				area.area,
				{
					status: area.status,
					count: area.itemCount,
					itemCount: area.itemCount,
					elapsedMs: area.elapsedMs,
					errorCode: area.errorCode,
					errorMessage: area.errorMessage,
				},
			]),
		),
	});
}

function normalizeComponentPathForCache(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\//g, "\\")
		.replace(/^\\+|\\+$/g, "")
		.toLowerCase();
}

function normalizeCwdForWarmupKey(value: string): string {
	return value.trim().replace(/\\/g, "/").replace(/\/+$/g, "").toLowerCase();
}

function createWarmupInFlightKey(
	partition: AscetSearchIndexWarmupPartition,
	options: Pick<
		AscetSearchIndexWarmupOptions,
		"componentPath" | "cwd" | "env" | "includeTextCode" | "maxComponents" | "maxTextChars"
	>,
): string {
	const requiresTextCode = options.includeTextCode === true || isTextCodeWarmupEnabled(options.env);
	const maxTextChars = options.maxTextChars ?? getSearchIndexMaxTextChars(options.env) ?? "*";
	return [
		normalizeCwdForWarmupKey(options.cwd),
		partition,
		normalizeComponentPathForCache(options.componentPath) || "*",
		requiresTextCode ? "text" : "decls",
		options.maxComponents ?? "*",
		maxTextChars,
	].join(":");
}

function unwrapPayload(data: unknown): Record<string, unknown> | undefined {
	if (!isRecord(data)) {
		return undefined;
	}
	if (isRecord(data.result)) {
		return data.result;
	}
	return data;
}

function parseGeneratedAtMs(value: unknown): number {
	if (typeof value !== "string") {
		return Date.now();
	}
	const parsed = Date.parse(value);
	return Number.isFinite(parsed) ? parsed : Date.now();
}

function normalizeGroup(value: unknown, referencedComponentPath: string): AscetSearchIndexEntry["group"] {
	if (value === "primitive" || value === "complex" || value === "referenced") {
		return value;
	}
	return referencedComponentPath ? "complex" : "primitive";
}

function normalizeTextCodeSection(value: unknown): string {
	const normalized = asString(value).trim().toLowerCase().replace(/_/g, "-");
	if (normalized === "externalc") {
		return "external-c";
	}
	return normalized || "body";
}

function parseCounts(value: unknown): Partial<AscetSearchIndexCounts> {
	if (!isRecord(value)) {
		return {};
	}
	const result: Partial<AscetSearchIndexCounts> = {};
	for (const key of [
		"entries",
		"components",
		"primitive",
		"complex",
		"referenced",
		"methods",
		"methodProcessElements",
		"componentRefs",
		"elementRefs",
		"messages",
		"senders",
		"receivers",
		"sendReceivers",
		"diagramMetadata",
		"textCodeEntries",
		"textCodeChars",
	] as const) {
		const parsed = asNumber(value[key]);
		if (parsed > 0 || Object.hasOwn(value, key)) {
			result[key] = parsed;
		}
	}
	return result;
}

function parseEntries(value: unknown): AscetSearchIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: AscetSearchIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		if (item.group === "text_code" || item.group === "components") {
			continue;
		}
		const componentPath = asString(item.componentPath);
		const elementName = asString(item.elementName) || asString(item.name);
		const referencedComponentPath = asString(item.referencedComponentPath);
		if (!componentPath || !elementName) {
			continue;
		}
		entries.push({
			group: normalizeGroup(item.group, referencedComponentPath),
			componentPath,
			componentKind: asString(item.componentKind),
			componentLanguageKind: asString(item.componentLanguageKind),
			elementName,
			elementKind: asString(item.elementKind),
			displayType: asString(item.displayType),
			displayScope: asString(item.displayScope),
			referencedComponentPath,
			path: asString(item.path) || `${componentPath}::${elementName}`,
		});
	}
	return entries;
}

function parseComponents(value: unknown): AscetComponentSearchIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const components: AscetComponentSearchIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const path = asString(item.path) || asString(item.componentPath) || asString(item.projectPath);
		const name = asString(item.name) || path.replace(/\//g, "\\").split("\\").filter(Boolean).at(-1) || "";
		if (!path || !name) {
			continue;
		}
		const objectKind = asString(item.objectKind) || asString(item.targetKind);
		const kind = asString(item.kind) || objectKind;
		components.push({
			path,
			name,
			kind,
			languageKind: asString(item.languageKind),
			displayName: asString(item.displayName) || name,
			parentPath: asString(item.parentPath),
			ownerKind: asString(item.ownerKind),
			targetKind: asString(item.targetKind),
			objectKind,
		});
	}
	return components;
}

function parseTextCodeEntries(value: unknown): AscetTextCodeSearchIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}

	const entries: AscetTextCodeSearchIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const componentPath = asString(item.componentPath);
		const text = asString(item.text) || asString(item.searchText);
		if (!componentPath || !text) {
			continue;
		}
		const section = normalizeTextCodeSection(item.section ?? item.partition ?? item.elementKind);
		const name = asString(item.name);
		const methodName = asString(item.methodName) || (section === "body" ? name : "");
		entries.push({
			componentPath,
			componentKind: asString(item.componentKind),
			componentLanguageKind: asString(item.componentLanguageKind),
			section,
			methodName,
			methodKind: asString(item.methodKind) || (section === "body" ? asString(item.displayType) : ""),
			text,
			path: asString(item.path) || `${componentPath}::${methodName}#${section}`,
		});
	}
	return entries;
}

function parseMethodDeclarations(value: unknown): AscetMethodDeclarationIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetMethodDeclarationIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const componentPath = asString(item.componentPath);
		const methodName = asString(item.methodName) || asString(item.name);
		if (!componentPath || !methodName) {
			continue;
		}
		entries.push({
			group: "method",
			componentPath,
			componentKind: asString(item.componentKind),
			componentLanguageKind: asString(item.componentLanguageKind),
			methodName,
			methodKind: asString(item.methodKind) || asString(item.kind),
			path: asString(item.path) || `${componentPath}::${methodName}`,
		});
	}
	return entries;
}

function parseMethodProcessElements(value: unknown): AscetMethodProcessElementIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetMethodProcessElementIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const componentPath = asString(item.componentPath);
		const methodName = asString(item.methodName);
		const elementName = asString(item.elementName) || asString(item.name);
		if (!componentPath || !methodName || !elementName) {
			continue;
		}
		entries.push({
			group: "method_process_element",
			componentPath,
			componentKind: asString(item.componentKind),
			componentLanguageKind: asString(item.componentLanguageKind),
			methodName,
			methodKind: asString(item.methodKind),
			elementName,
			elementKind: asString(item.elementKind),
			displayType: asString(item.displayType),
			displayScope: asString(item.displayScope),
			role: asString(item.role),
			path: asString(item.path) || `${componentPath}::${methodName}::${elementName}`,
		});
	}
	return entries;
}

function parseReferences(value: unknown): AscetReferenceIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetReferenceIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const sourceComponentPath = asString(item.sourceComponentPath) || asString(item.componentPath);
		const sourceElementName = asString(item.sourceElementName) || asString(item.elementName);
		const targetComponentPath = asString(item.targetComponentPath);
		if (!sourceComponentPath || !sourceElementName) {
			continue;
		}
		entries.push({
			sourceComponentPath,
			sourceElementName,
			sourceElementKind: asString(item.sourceElementKind),
			sourceElementScope: asString(item.sourceElementScope),
			targetComponentPath,
			targetComponentName: asString(item.targetComponentName),
			targetComponentKind: asString(item.targetComponentKind),
			targetLanguageKind: asString(item.targetLanguageKind),
			resolved: asBoolean(item.resolved, false),
			path: asString(item.path) || `${sourceComponentPath}::${sourceElementName}->${targetComponentPath}`,
			referenceKind: asString(item.referenceKind) || undefined,
			elementName: asString(item.elementName) || undefined,
		});
	}
	return entries;
}

function parseMessageDirection(value: unknown): AscetMessageIndexEntry["messageDirection"] {
	return value === "sender" || value === "receiver" || value === "send_receive" ? value : "unknown";
}

function parseMessages(value: unknown): AscetMessageIndexEntry[] {
	return parseEntries(value).map((entry) => ({
		...entry,
		messageDirection: parseMessageDirection(
			(value as Array<Record<string, unknown>>).find((item) => item.path === entry.path)?.messageDirection,
		),
	}));
}

function parseDiagramMetadata(value: unknown): AscetDiagramMetadataIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetDiagramMetadataIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const componentPath = asString(item.componentPath);
		const name = asString(item.name);
		if (!componentPath || !name) {
			continue;
		}
		entries.push({
			componentPath,
			componentKind: asString(item.componentKind),
			componentLanguageKind: asString(item.componentLanguageKind),
			name,
			kind: asString(item.kind),
			path: asString(item.path) || `${componentPath}::${name}`,
			isDefault: asBoolean(item.isDefault, false),
			supportsReadBlockDiagram: asBoolean(item.supportsReadBlockDiagram, false),
		});
	}
	return entries;
}

function parseFolders(value: unknown): AscetFolderIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetFolderIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const path = asString(item.path) || asString(item.folderPath);
		if (!path) {
			continue;
		}
		entries.push({
			path,
			name: asString(item.name) || path.replace(/\//g, "\\").split("\\").filter(Boolean).at(-1) || "",
			parentPath: asString(item.parentPath),
			ordinal: typeof item.ordinal === "number" ? asNumber(item.ordinal) : entries.length,
			payload: isRecord(item.payload) ? item.payload : undefined,
		});
	}
	return entries;
}

function parseFolderItems(value: unknown): AscetFolderItemIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetFolderItemIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const folderPath = asString(item.folderPath) || asString(item.parentPath);
		const itemPath = asString(item.itemPath) || asString(item.path) || asString(item.componentPath);
		if (!itemPath) {
			continue;
		}
		entries.push({
			folderPath,
			itemPath,
			itemName:
				asString(item.itemName) ||
				asString(item.name) ||
				itemPath.replace(/\//g, "\\").split("\\").filter(Boolean).at(-1) ||
				"",
			itemKind: asString(item.itemKind) || asString(item.kind) || asString(item.objectKind),
			languageKind: asString(item.languageKind),
			ordinal: typeof item.ordinal === "number" ? asNumber(item.ordinal) : entries.length,
			payload: isRecord(item.payload) ? item.payload : undefined,
		});
	}
	return entries;
}

function parseProjectFormulas(value: unknown): AscetProjectFormulaIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetProjectFormulaIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const projectPath = asString(item.projectPath) || asString(item.componentPath) || asString(item.ownerPath);
		const name = asString(item.name) || asString(item.formulaName);
		if (!projectPath || !name) {
			continue;
		}
		entries.push({
			projectPath,
			name,
			path: asString(item.path),
			runtimeType: asString(item.runtimeType) || asString(item.type),
			sourceApi: asString(item.sourceApi) || "Project.GetAllFormulas",
		});
	}
	return entries;
}

function parseProjectItems(value: unknown): AscetProjectItemIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetProjectItemIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const projectPath = asString(item.projectPath) || asString(item.componentPath) || asString(item.ownerPath);
		const name = asString(item.name) || asString(item.itemName);
		const itemKind = asString(item.itemKind) || asString(item.kind);
		if (!projectPath || !name || !itemKind) {
			continue;
		}
		entries.push({
			projectPath,
			name,
			itemKind,
			runtimeType: asString(item.runtimeType) || asString(item.type),
			sourceApi: asString(item.sourceApi),
		});
	}
	return entries;
}

function parseDbItemDependencies(value: unknown): AscetDbItemDependencyIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	const entries: AscetDbItemDependencyIndexEntry[] = [];
	for (const item of value) {
		if (!isRecord(item)) {
			continue;
		}
		const sourcePath =
			asString(item.sourcePath) || asString(item.sourceComponentPath) || asString(item.componentPath);
		const targetPath = asString(item.targetPath) || asString(item.targetComponentPath);
		if (!sourcePath || !targetPath) {
			continue;
		}
		entries.push({
			sourcePath,
			targetPath,
			targetName: asString(item.targetName) || asString(item.targetComponentName),
			targetKind: asString(item.targetKind) || asString(item.targetComponentKind),
			sourceApi: asString(item.sourceApi) || "GetAllReferecedDataBaseItems",
		});
	}
	return entries;
}

function parseLegacyTextCodeEntries(value: unknown): AscetTextCodeSearchIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return parseTextCodeEntries(value.filter((item) => isRecord(item) && item.group === "text_code"));
}

function buildInputFromPayload(payload: Record<string, unknown>): AscetSqliteSearchIndexBuildInput | undefined {
	const rawEntries = payload.entries;
	const rawComponents = payload.components;
	const rawObjects = payload.objects;
	const rawProjects = payload.projects;
	const entries = parseEntries(rawEntries);
	const methodDeclarations = parseMethodDeclarations(payload.methodDeclarations);
	const methodProcessElements = parseMethodProcessElements(payload.methodProcessElements);
	const componentRefs = parseReferences(payload.componentRefs);
	const elementRefs = parseReferences(payload.elementRefs);
	const messages = parseMessages(payload.messages);
	const diagramMetadata = parseDiagramMetadata(payload.diagramMetadata);
	const folders = parseFolders(payload.folders);
	const folderItems = parseFolderItems(payload.folderItems ?? payload.folder_items);
	const projectFormulas = parseProjectFormulas(payload.projectFormulas ?? payload.formulas);
	const projectItems = [
		...parseProjectItems(payload.projectItems),
		...parseProjectItems(payload.globals).map((entry) => ({
			...entry,
			itemKind: entry.itemKind || "global",
			sourceApi: entry.sourceApi || "Project.GetAllGlobals",
		})),
		...parseProjectItems(payload.modules).map((entry) => ({
			...entry,
			itemKind: entry.itemKind || "module",
			sourceApi: entry.sourceApi || "Project.GetAllModules",
		})),
		...parseProjectItems(payload.tasks).map((entry) => ({
			...entry,
			itemKind: entry.itemKind || "task",
			sourceApi: entry.sourceApi || "Project.GetAllTasks",
		})),
	];
	const dbItemDependencies = parseDbItemDependencies(
		payload.dbItemDependencies ?? payload.databaseItemDependencies ?? payload.dbitemDependencies,
	);
	if (
		!Array.isArray(rawEntries) &&
		!Array.isArray(rawComponents) &&
		!Array.isArray(rawObjects) &&
		!Array.isArray(rawProjects) &&
		methodDeclarations.length === 0 &&
		methodProcessElements.length === 0 &&
		componentRefs.length === 0 &&
		elementRefs.length === 0 &&
		messages.length === 0 &&
		diagramMetadata.length === 0 &&
		folders.length === 0 &&
		folderItems.length === 0 &&
		projectFormulas.length === 0 &&
		projectItems.length === 0 &&
		dbItemDependencies.length === 0 &&
		!Array.isArray(payload.textCodeEntries) &&
		!Array.isArray(payload.textCode)
	) {
		return undefined;
	}
	const database = isRecord(payload.database) ? payload.database : {};
	const explicitTextCodeEntries = parseTextCodeEntries(payload.textCodeEntries ?? payload.textCode);
	const textCodeEntries =
		explicitTextCodeEntries.length > 0 ? explicitTextCodeEntries : parseLegacyTextCodeEntries(payload.entries);
	return {
		databaseName: asString(database.name),
		databasePath: asString(database.path),
		generatedAtMs: parseGeneratedAtMs(payload.generatedAtUtc),
		scopedComponentPath: asString(payload.componentPath),
		elapsedMs: asNumber(payload.elapsedMs),
		scanComplete: asBoolean(payload.scanComplete, true),
		textCodeIncluded:
			asBoolean(payload.textCodeIncluded, false) ||
			Array.isArray(payload.textCodeEntries) ||
			Array.isArray(payload.textCode) ||
			textCodeEntries.length > 0,
		textCodeScanComplete: asBoolean(payload.textCodeScanComplete, false),
		components: [
			...parseComponents(rawComponents),
			...parseComponents(rawObjects),
			...parseComponents(rawProjects).map((entry) => ({
				...entry,
				kind: entry.kind || "project",
				objectKind: entry.objectKind || "project",
				targetKind: entry.targetKind || "project",
			})),
		],
		textCodeEntries,
		entries,
		methodDeclarations,
		methodProcessElements,
		componentRefs,
		elementRefs,
		messages,
		diagramMetadata,
		folders,
		folderItems,
		projectFormulas,
		projectItems,
		dbItemDependencies,
		counts: parseCounts(payload.counts),
	};
}

function countPartitionEntries(
	state: ReturnType<typeof getAscetSearchIndexState>,
	partition: AscetSearchIndexWarmupPartition,
): number {
	if (state.status !== "ready") {
		return 0;
	}
	switch (partition) {
		case "p0":
			return (
				state.components.length +
				state.entries.length +
				state.methodDeclarations.length +
				state.componentRefs.length +
				state.elementRefs.length +
				state.textCodeEntries.length
			);
		case "components":
			return state.components.length;
		case "element_decls":
			return state.entries.length;
		case "method_decls":
			return state.methodDeclarations.length;
		case "method_process_elements":
			return state.methodProcessElements.length;
		case "component_refs":
			return state.componentRefs.length;
		case "element_refs":
			return state.elementRefs.length;
		case "messages":
			return state.messages.length;
		case "diagram_metadata":
			return state.diagramMetadata.length;
		case "text_code":
			return state.textCodeEntries.length;
		case "all":
			return (
				state.components.length +
				state.entries.length +
				state.methodDeclarations.length +
				state.methodProcessElements.length +
				state.componentRefs.length +
				state.elementRefs.length +
				state.messages.length +
				state.diagramMetadata.length +
				state.textCodeEntries.length
			);
	}
}

function readyResultFromCache(
	env: Record<string, string | undefined> | undefined,
	cwd: string,
	requiresTextCode: boolean,
	forceRefresh: boolean,
	partition: AscetSearchIndexWarmupPartition,
	componentPath?: string,
): AscetSearchIndexWarmupResult | undefined {
	if (forceRefresh || isForceWarmup(env)) {
		return undefined;
	}
	if (isSqliteStorageEnabled(env)) {
		const sqliteStatus = getAscetSqliteIndexStatus(cwd);
		if (sqliteStatus.status === "ready" || sqliteStatus.status === "stale") {
			const requiredAreas =
				partition === "p0"
					? [
							"components",
							"folders",
							"folder_items",
							"elements",
							"methods",
							"project_formulas",
							"project_items",
							"component_refs",
							"element_refs",
							"messages",
							"dbitem_dependencies",
							"code_blocks",
							"code_terms",
						]
					: partition === "all"
						? [
								"components",
								"elements",
								"methods",
								"project_formulas",
								"component_refs",
								"element_refs",
								"messages",
								"code_blocks",
								"code_terms",
							]
						: partition === "components"
							? ["components"]
							: partition === "element_decls"
								? ["elements"]
								: partition === "method_decls"
									? ["methods"]
									: partition === "component_refs"
										? ["component_refs"]
										: partition === "element_refs"
											? ["element_refs"]
											: partition === "text_code"
												? ["code_blocks", "code_terms"]
												: [];
			const areaReady = requiredAreas.every((area) => {
				const status = sqliteStatus.areas.find((entry) => entry.area === area);
				return status?.status === "ready" || status?.status === "stale";
			});
			const hasText = sqliteStatus.areas.find((entry) => entry.area === "code_blocks")?.itemCount ?? 0;
			if (areaReady && (!requiresTextCode || hasText > 0 || partition !== "text_code")) {
				writeSqliteCacheStatusFile(cwd, sqliteStatus);
				return {
					ok: true,
					commandId: "warm_search_index",
					databaseName: sqliteStatus.databaseName,
					databasePath: sqliteStatus.databasePath,
					entryCount: sqliteStatus.areas.reduce((total, area) => total + area.itemCount, 0),
					elapsedMs: sqliteStatus.elapsedMs,
					scanComplete: sqliteStatus.areas.every((area) => area.scanComplete),
					fromCache: true,
					exitCode: 0,
					timedOut: false,
					stdout: "",
					stderr: "",
				};
			}
		}
	}
	const state = getAscetSearchIndexState();
	if (state.status !== "ready") {
		return undefined;
	}
	const requiredPartitions = partitionsForWarmup(partition).filter(
		(entry) => entry !== "text_code" || requiresTextCode,
	);
	if (requiredPartitions.some((entry) => getAscetSearchIndexPartitionState(entry)?.status !== "ready")) {
		return undefined;
	}
	const requestedComponentPath = normalizeComponentPathForCache(componentPath);
	if (requestedComponentPath && !state.scanComplete) {
		for (const requiredPartition of requiredPartitions) {
			const partitionState = getAscetSearchIndexPartitionState(requiredPartition);
			if (
				partitionState?.status !== "ready" ||
				(partitionState.scanComplete !== true &&
					normalizeComponentPathForCache(partitionState.componentPath) !== requestedComponentPath)
			) {
				return undefined;
			}
		}
	}
	if (requiresTextCode && (!state.textCodeIncluded || !state.textCodeScanComplete)) {
		return undefined;
	}
	const ageMs = Math.max(0, Date.now() - state.warmedAtMs);
	if (ageMs >= getSearchIndexTtlMs(env)) {
		return undefined;
	}
	return {
		ok: true,
		commandId: "warm_search_index",
		databaseName: state.databaseName,
		databasePath: state.databasePath,
		entryCount: countPartitionEntries(state, partition),
		elapsedMs: state.elapsedMs,
		scanComplete: state.scanComplete,
		fromCache: true,
		exitCode: 0,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

function disabledResult(partition: AscetSearchIndexWarmupPartition): AscetSearchIndexWarmupResult {
	const error = {
		code: "search_index_disabled",
		message: "ASCET quick-search index warmup is disabled by PI_ASCET_SEARCH_INDEX=0.",
	};
	markAscetSearchIndexFailed(error, Date.now(), partitionsForWarmup(partition));
	return {
		ok: false,
		commandId: "warm_search_index",
		databaseName: "",
		databasePath: "",
		entryCount: 0,
		elapsedMs: 0,
		scanComplete: false,
		fromCache: false,
		error,
		exitCode: null,
		timedOut: false,
		stdout: "",
		stderr: "",
	};
}

function failureResult(
	result: AscetCliJsonResult,
	partition: AscetSearchIndexWarmupPartition,
	code?: string,
	message?: string,
): AscetSearchIndexWarmupResult {
	const error = {
		code: code ?? result.error?.code ?? "warm_search_index_failed",
		message: message ?? result.error?.message ?? "ASCET quick-search index warmup failed.",
	};
	markAscetSearchIndexFailed(error, Date.now(), partitionsForWarmup(partition));
	return {
		ok: false,
		commandId: "warm_search_index",
		databaseName: "",
		databasePath: "",
		entryCount: 0,
		elapsedMs: 0,
		scanComplete: false,
		fromCache: false,
		error,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

function successResult(
	result: AscetCliJsonResult,
	input: AscetSqliteSearchIndexBuildInput,
	partition: AscetSearchIndexWarmupPartition,
	componentScoped: boolean,
	options: Pick<AscetSearchIndexWarmupOptions, "cwd" | "env">,
): AscetSearchIndexWarmupResult {
	const effectiveInput = componentScoped
		? {
				...input,
				scanComplete: false,
				textCodeScanComplete: input.textCodeIncluded ? false : input.textCodeScanComplete,
			}
		: input;
	const ready = installAscetSearchIndex(effectiveInput, partitionsForWarmup(partition));
	if ((partition === "all" || partition === "p0") && !componentScoped && isSqliteStorageEnabled(options.env)) {
		try {
			writeAscetIndexStatusFile(options.cwd, {
				state: "writing",
				phase: partition,
				elapsedMs: effectiveInput.elapsedMs,
				totalDocs: countPartitionEntries(ready, partition),
			});
			ingestAscetSearchIndexSqlite(options.cwd, effectiveInput, partitionsForWarmup(partition));
		} catch (error) {
			markAscetSearchIndexFailed(
				{
					code: "sqlite_search_index_ingest_failed",
					message:
						error instanceof Error ? error.message : "Failed to persist ASCET quick-search index to SQLite.",
				},
				Date.now(),
				partitionsForWarmup(partition),
			);
		}
	}
	if (partition === "all" || partition === "p0") {
		const sqliteStatus = isSqliteStorageEnabled(options.env) ? getAscetSqliteIndexStatus(options.cwd) : undefined;
		if (sqliteStatus?.status === "ready" || sqliteStatus?.status === "stale") {
			writeSqliteCacheStatusFile(options.cwd, sqliteStatus);
		} else {
			writeAscetIndexStatusFile(options.cwd, {
				state: "ready",
				phase: partition,
				elapsedMs: ready.status === "ready" ? ready.elapsedMs : effectiveInput.elapsedMs,
				totalDocs: countPartitionEntries(ready, partition),
				areas: indexStatusAreasFromInput(effectiveInput),
			});
		}
	} else if (isSqliteStorageEnabled(options.env)) {
		const sqliteStatus = getAscetSqliteIndexStatus(options.cwd);
		if (sqliteStatus.status === "ready" || sqliteStatus.status === "stale") {
			writeSqliteCacheStatusFile(options.cwd, sqliteStatus);
		}
	} else {
		writeAscetIndexStatusFile(options.cwd, {
			state: "ready",
			phase: partition,
			elapsedMs: ready.status === "ready" ? ready.elapsedMs : effectiveInput.elapsedMs,
			totalDocs: countPartitionEntries(ready, partition),
			areas: indexStatusAreasFromInput(effectiveInput),
		});
	}
	return {
		ok: true,
		commandId: "warm_search_index",
		databaseName: ready.status === "ready" ? ready.databaseName : "",
		databasePath: ready.status === "ready" ? ready.databasePath : "",
		entryCount: countPartitionEntries(ready, partition),
		elapsedMs: ready.status === "ready" ? ready.elapsedMs : effectiveInput.elapsedMs,
		scanComplete: ready.status === "ready" && ready.scanComplete,
		fromCache: false,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stdout: result.stdout,
		stderr: result.stderr,
	};
}

async function warmSearchIndex(options: AscetSearchIndexWarmupOptions): Promise<AscetSearchIndexWarmupResult> {
	const partition = normalizeWarmupPartition(options);
	markAscetSearchIndexWarming(Date.now(), partitionsForWarmup(partition));
	writeAscetIndexStatusFile(options.cwd, {
		state: options.forceRefresh ? "refreshing" : "building",
		phase: partition,
		currentArea: partition,
		startedAt: new Date().toISOString(),
		elapsedMs: 0,
	});
	const timeoutMs = options.timeoutMs ?? 60_000;
	const args = ["exec", "warm_search_index"];
	if (partition !== "all" || options.partition) {
		args.push("--partition", partition);
	}
	if (options.forceRefresh) {
		args.push("--force");
	}
	if (options.componentPath) {
		args.push("--component", options.componentPath);
	}
	args.push("--json");
	if (options.maxComponents !== undefined) {
		args.push("--max-components", String(options.maxComponents));
	}
	const includeTextCode =
		partition === "p0" ||
		partition === "all" ||
		options.includeTextCode === true ||
		isTextCodeWarmupEnabled(options.env);
	if (includeTextCode) {
		args.push("--include-text-code");
	}
	const maxTextChars = includeTextCode ? (options.maxTextChars ?? getSearchIndexMaxTextChars(options.env)) : undefined;
	if (includeTextCode && maxTextChars !== undefined) {
		args.push("--max-text-chars", String(maxTextChars));
	}
	if (options.scanTimeoutMs !== undefined) {
		args.push("--timeout-ms", String(options.scanTimeoutMs));
	}
	args.push("--progress-file", getAscetIndexStatusFilePath(options.cwd));
	const result = await runAscetCliJson(args, {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs,
		executeCli: options.executeCli,
		scheduler: options.scheduler,
		commandId: "warm_search_index",
		toolName: options.toolName ?? "ascet_search_index",
		jobKind: "read",
		queueTimeoutMs: Math.min(timeoutMs, 60_000),
	});

	if (!result.ok) {
		writeAscetIndexStatusFile(options.cwd, {
			state: "failed",
			phase: partition,
			currentArea: partition,
			error: result.error,
		});
		return failureResult(result, partition);
	}

	const payload = unwrapPayload(result.data);
	const input = payload ? buildInputFromPayload(payload) : undefined;
	if (!input) {
		writeAscetIndexStatusFile(options.cwd, {
			state: "failed",
			phase: partition,
			currentArea: partition,
			error: { code: "invalid_search_index_payload", message: "warm_search_index returned invalid JSON shape." },
		});
		return failureResult(
			result,
			partition,
			"invalid_search_index_payload",
			"warm_search_index returned invalid JSON shape: expected at least one index partition array.",
		);
	}

	return successResult(result, input, partition, Boolean(options.componentPath), options);
}

export async function ensureAscetSearchIndex(
	options: AscetSearchIndexWarmupOptions,
): Promise<AscetSearchIndexWarmupResult> {
	const partition = normalizeWarmupPartition(options);
	if (isSearchIndexDisabled(options.env)) {
		return disabledResult(partition);
	}

	const cached = readyResultFromCache(
		options.env,
		options.cwd,
		partition === "p0" ||
			partition === "all" ||
			options.includeTextCode === true ||
			isTextCodeWarmupEnabled(options.env),
		options.forceRefresh === true,
		partition,
		options.componentPath,
	);
	if (cached) {
		return cached;
	}

	const inFlightKey = createWarmupInFlightKey(partition, options);
	const inFlightWarmup = inFlightWarmups.get(inFlightKey);
	if (inFlightWarmup) {
		return inFlightWarmup;
	}

	const nextWarmup = warmSearchIndex(options);
	inFlightWarmups.set(inFlightKey, nextWarmup);
	try {
		return await nextWarmup;
	} finally {
		inFlightWarmups.delete(inFlightKey);
	}
}

export function scheduleAscetSearchIndexBackgroundRefresh(options: AscetSearchIndexBackgroundRefreshOptions): boolean {
	if (isSearchIndexDisabled(options.env) || !isBackgroundRefreshEnabled(options.env, options.scheduler)) {
		return false;
	}
	const refreshKey = `${normalizeCwdForWarmupKey(options.cwd)}:p0`;
	if (scheduledBackgroundRefreshes.has(refreshKey)) {
		return false;
	}
	scheduledBackgroundRefreshes.add(refreshKey);
	writeAscetIndexStatusFile(options.cwd, {
		state: "refreshing",
		phase: "p0",
		currentArea: "p0",
		startedAt: new Date().toISOString(),
		elapsedMs: 0,
		staleAreas: [],
		error: options.reason ? { code: "index_refresh_scheduled", message: options.reason } : undefined,
	});
	const timer = setTimeout(() => {
		void ensureAscetSearchIndex({
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs ?? 120_000,
			partition: "p0",
			forceRefresh: true,
			includeTextCode: true,
			scanTimeoutMs: options.scanTimeoutMs ?? 90_000,
			executeCli: options.executeCli,
			scheduler: options.scheduler,
			toolName: "ascet_index_refresh",
		})
			.catch(() => undefined)
			.finally(() => {
				scheduledBackgroundRefreshes.delete(refreshKey);
			});
	}, options.delayMs ?? 250);
	timer.unref?.();
	return true;
}

function shouldQuerySqlite(env: Record<string, string | undefined> | undefined): boolean {
	return getEnvValue(env, "PI_ASCET_SEARCH_INDEX_STORAGE") !== "memory";
}

export function isUsableSqliteSearchResult(result: AscetCliJsonResult): boolean {
	if (!result.ok) {
		return false;
	}
	const data = result.data;
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return false;
	}
	const payload = (data as { result?: unknown }).result;
	if (payload === null || typeof payload !== "object" || Array.isArray(payload)) {
		return false;
	}
	const index = (payload as { index?: unknown }).index;
	if (index === null || typeof index !== "object" || Array.isArray(index)) {
		return false;
	}
	const sqliteIndex = index as { storage?: unknown; scanComplete?: unknown };
	return sqliteIndex.storage === "sqlite" && sqliteIndex.scanComplete !== false;
}

export function queryAscetComponentIndex(
	params: AscetComponentIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetComponentIndexSqlite(params, options) ?? queryAscetComponentIndexMemory(params, options))
		: queryAscetComponentIndexMemory(params, options);
}

export function queryAscetListComponentsIndex(
	params: import("./search-index-sqlite/query.ts").AscetListComponentsIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env) ? queryAscetListComponentsIndexSqlite(params, options) : undefined;
}

export function queryAscetProjectIndex(
	params: AscetProjectIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetProjectIndexSqlite(params, options) ?? queryAscetProjectIndexMemory(params, options))
		: queryAscetProjectIndexMemory(params, options);
}

export function queryAscetSearchIndex(
	params: AscetSearchIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetSearchIndexSqlite(params, options) ?? queryAscetSearchIndexMemory(params, options))
		: queryAscetSearchIndexMemory(params, options);
}

export function queryAscetMethodDeclarationIndex(
	params: AscetMethodDeclarationIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetMethodDeclarationIndexSqlite(params, options) ??
				queryAscetMethodDeclarationIndexMemory(params, options))
		: queryAscetMethodDeclarationIndexMemory(params, options);
}

export function queryAscetMethodProcessElementIndex(
	params: AscetMethodProcessElementIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return queryAscetMethodProcessElementIndexMemory(params, options);
}

export function queryAscetComponentReferenceIndex(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetComponentReferenceIndexSqlite(params, options) ??
				queryAscetComponentReferenceIndexMemory(params, options))
		: queryAscetComponentReferenceIndexMemory(params, options);
}

export function queryAscetElementReferenceIndex(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetElementReferenceIndexSqlite(params, options) ??
				queryAscetElementReferenceIndexMemory(params, options))
		: queryAscetElementReferenceIndexMemory(params, options);
}

export function queryAscetMessageIndex(
	params: AscetMessageIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetMessageIndexSqlite(params, options) ?? queryAscetMessageIndexMemory(params, options))
		: queryAscetMessageIndexMemory(params, options);
}

export function queryAscetDiagramMetadataIndex(
	params: AscetDiagramMetadataIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return queryAscetDiagramMetadataIndexMemory(params, options);
}

export function queryAscetTextCodeIndex(
	params: AscetTextCodeIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env)
		? (queryAscetTextCodeIndexSqlite(params, options) ?? queryAscetTextCodeIndexMemory(params, options))
		: queryAscetTextCodeIndexMemory(params, options);
}

export function queryAscetProjectFormulaIndex(
	params: AscetProjectFormulaIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	return shouldQuerySqlite(options.env) ? queryAscetProjectFormulaIndexSqlite(params, options) : undefined;
}

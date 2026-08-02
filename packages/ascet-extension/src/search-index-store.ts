import type { AscetCliJsonResult } from "./cli.ts";

export type AscetSearchIndexGroup = "primitive" | "complex" | "referenced";
export type AscetSearchIndexMatchMode = "exact" | "glob" | "contains";
export type AscetSearchIndexPartition =
	| "components"
	| "element_decls"
	| "method_decls"
	| "method_process_elements"
	| "component_refs"
	| "element_refs"
	| "messages"
	| "diagram_metadata"
	| "text_code"
	| "all";

export type AscetSearchIndexPartitionLifecycleState =
	| {
			partition: AscetSearchIndexPartition;
			status: "empty";
			invalidatedReason?: string;
			invalidatedAtMs?: number;
	  }
	| {
			partition: AscetSearchIndexPartition;
			status: "warming";
			startedAtMs: number;
	  }
	| {
			partition: AscetSearchIndexPartition;
			status: "ready";
			warmedAtMs: number;
			generatedAtMs: number;
			scanComplete: boolean;
			componentPath?: string;
	  }
	| {
			partition: AscetSearchIndexPartition;
			status: "stale";
			invalidatedReason: string;
			invalidatedAtMs: number;
	  }
	| {
			partition: AscetSearchIndexPartition;
			status: "failed";
			failedAtMs: number;
			error: {
				code: string;
				message: string;
			};
	  };

export interface AscetSearchIndexEntry {
	group: AscetSearchIndexGroup;
	componentPath: string;
	componentKind: string;
	componentLanguageKind: string;
	elementName: string;
	elementKind: string;
	displayType: string;
	displayScope: string;
	referencedComponentPath: string;
	path: string;
}

export interface AscetComponentSearchIndexEntry {
	path: string;
	name: string;
	kind: string;
	languageKind: string;
	displayName: string;
	parentPath: string;
	ownerKind: string;
	targetKind: string;
	objectKind: string;
}

export interface AscetTextCodeSearchIndexEntry {
	componentPath: string;
	componentKind: string;
	componentLanguageKind: string;
	section: string;
	methodName: string;
	methodKind: string;
	text: string;
	path: string;
}

export interface AscetMethodDeclarationIndexEntry {
	group: "method";
	componentPath: string;
	componentKind: string;
	componentLanguageKind: string;
	methodName: string;
	methodKind: string;
	path: string;
}

export interface AscetMethodProcessElementIndexEntry {
	group: "method_process_element";
	componentPath: string;
	componentKind: string;
	componentLanguageKind: string;
	methodName: string;
	methodKind: string;
	elementName: string;
	elementKind: string;
	displayType: string;
	displayScope: string;
	role: string;
	path: string;
}

export interface AscetReferenceIndexEntry {
	sourceComponentPath: string;
	sourceElementName: string;
	sourceElementKind: string;
	sourceElementScope: string;
	targetComponentPath: string;
	targetComponentName: string;
	targetComponentKind: string;
	targetLanguageKind: string;
	resolved: boolean;
	path: string;
	referenceKind?: string;
	elementName?: string;
}

export interface AscetMessageIndexEntry extends AscetSearchIndexEntry {
	messageDirection: "sender" | "receiver" | "send_receive" | "unknown";
}

export interface AscetDiagramMetadataIndexEntry {
	componentPath: string;
	componentKind: string;
	componentLanguageKind: string;
	name: string;
	kind: string;
	path: string;
	isDefault: boolean;
	supportsReadBlockDiagram: boolean;
}

export interface AscetFullElementCacheEntry {
	componentPath: string;
	name: string;
	kind: string;
	type?: string;
	scope?: string;
	path: string;
	source: "live_readback";
	updatedAtMs: number;
	data: Record<string, unknown>;
}

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

export interface AscetSearchIndexCounts {
	entries: number;
	components: number;
	primitive: number;
	complex: number;
	referenced: number;
	methods: number;
	methodProcessElements: number;
	componentRefs: number;
	elementRefs: number;
	messages: number;
	senders: number;
	receivers: number;
	sendReceivers: number;
	diagramMetadata: number;
	textCodeEntries: number;
	textCodeChars: number;
}

export type AscetSearchIndexState =
	| {
			status: "empty";
			invalidatedReason?: string;
			invalidatedAtMs?: number;
	  }
	| {
			status: "warming";
			startedAtMs: number;
	  }
	| {
			status: "ready";
			databaseName: string;
			databasePath: string;
			generatedAtMs: number;
			warmedAtMs: number;
			elapsedMs: number;
			scanComplete: boolean;
			textCodeIncluded: boolean;
			textCodeScanComplete: boolean;
			components: AscetComponentSearchIndexEntry[];
			textCodeEntries: AscetTextCodeSearchIndexEntry[];
			entries: AscetSearchIndexEntry[];
			methodDeclarations: AscetMethodDeclarationIndexEntry[];
			methodProcessElements: AscetMethodProcessElementIndexEntry[];
			componentRefs: AscetReferenceIndexEntry[];
			elementRefs: AscetReferenceIndexEntry[];
			messages: AscetMessageIndexEntry[];
			diagramMetadata: AscetDiagramMetadataIndexEntry[];
			byExactComponentName: Map<string, AscetComponentSearchIndexEntry[]>;
			byExactName: Map<string, AscetSearchIndexEntry[]>;
			counts: AscetSearchIndexCounts;
	  }
	| {
			status: "failed";
			failedAtMs: number;
			error: {
				code: string;
				message: string;
			};
	  };

export interface AscetSearchIndexBuildInput {
	databaseName: string;
	databasePath: string;
	generatedAtMs?: number;
	scopedComponentPath?: string;
	elapsedMs: number;
	scanComplete: boolean;
	textCodeIncluded?: boolean;
	textCodeScanComplete?: boolean;
	components?: readonly AscetComponentSearchIndexEntry[];
	textCodeEntries?: readonly AscetTextCodeSearchIndexEntry[];
	entries: readonly AscetSearchIndexEntry[];
	methodDeclarations?: readonly AscetMethodDeclarationIndexEntry[];
	methodProcessElements?: readonly AscetMethodProcessElementIndexEntry[];
	componentRefs?: readonly AscetReferenceIndexEntry[];
	elementRefs?: readonly AscetReferenceIndexEntry[];
	messages?: readonly AscetMessageIndexEntry[];
	diagramMetadata?: readonly AscetDiagramMetadataIndexEntry[];
	folders?: readonly AscetFolderIndexEntry[];
	folderItems?: readonly AscetFolderItemIndexEntry[];
	projectFormulas?: readonly AscetProjectFormulaIndexEntry[];
	projectItems?: readonly AscetProjectItemIndexEntry[];
	dbItemDependencies?: readonly AscetDbItemDependencyIndexEntry[];
	counts?: Partial<AscetSearchIndexCounts>;
}

export interface AscetSearchIndexQueryParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	group?: "all" | AscetSearchIndexGroup;
	kind?: string;
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetComponentIndexQueryParams {
	query: string;
	scopePath?: string;
	kind?: "class" | "module" | "statemachine";
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetProjectIndexQueryParams {
	query: string;
	scopePath?: string;
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetProjectFormulaIndexQueryParams extends AscetProjectIndexQueryParams {
	projectPath?: string;
}

export interface AscetTextCodeIndexQueryParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	methodName?: string;
	section?: "auto" | "body" | "all" | "header" | "external-c";
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetMethodDeclarationIndexQueryParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetMethodProcessElementIndexQueryParams extends AscetMethodDeclarationIndexQueryParams {
	methodName?: string;
}

export interface AscetReferenceIndexQueryParams {
	query: string;
	componentPath?: string;
	scopePath?: string;
	match?: AscetSearchIndexMatchMode;
	limit?: number;
	cursor?: string;
}

export interface AscetMessageIndexQueryParams extends AscetReferenceIndexQueryParams {
	direction?: "sender" | "receiver";
}

export interface AscetDiagramMetadataIndexQueryParams {
	componentPath: string;
	diagramKind?: "all" | "block" | "block_diagram" | "state" | "state_machine" | "sequence" | "unknown";
	limit?: number;
	cursor?: string;
}

export interface AscetSearchIndexQueryOptions {
	cwd?: string;
	env?: Record<string, string | undefined>;
}

const DEFAULT_LIMIT = 20;
const ALL_INDEX_PARTITIONS: readonly Exclude<AscetSearchIndexPartition, "all">[] = [
	"components",
	"element_decls",
	"method_decls",
	"method_process_elements",
	"component_refs",
	"element_refs",
	"messages",
	"diagram_metadata",
	"text_code",
];
let state: AscetSearchIndexState = { status: "empty" };
const partitionStates = new Map<AscetSearchIndexPartition, AscetSearchIndexPartitionLifecycleState>();
const fullElementCache = new Map<string, AscetFullElementCacheEntry>();

function normalizePartition(partition: AscetSearchIndexPartition): AscetSearchIndexPartition {
	return partition === "all" ? "all" : partition;
}

function expandPartitions(partitions: readonly AscetSearchIndexPartition[] | undefined): AscetSearchIndexPartition[] {
	if (!partitions || partitions.length === 0 || partitions.includes("all")) {
		return [...ALL_INDEX_PARTITIONS];
	}
	return [...new Set(partitions.map(normalizePartition))];
}

function isPartitionReady(partition: AscetSearchIndexPartition): boolean {
	return partitionStates.get(partition)?.status === "ready";
}

function isPartitionScanComplete(partition: AscetSearchIndexPartition): boolean {
	const partitionState = partitionStates.get(partition);
	return partitionState?.status === "ready" && partitionState.scanComplete;
}

function hasAnyReadyPartition(): boolean {
	return ALL_INDEX_PARTITIONS.some((partition) => isPartitionReady(partition));
}

function markPartitionsReady(
	partitions: readonly AscetSearchIndexPartition[],
	input: AscetSearchIndexBuildInput,
	warmedAtMs = Date.now(),
): void {
	for (const partition of expandPartitions(partitions)) {
		partitionStates.set(partition, {
			partition,
			status: "ready",
			warmedAtMs,
			generatedAtMs: input.generatedAtMs ?? warmedAtMs,
			scanComplete:
				partition === "text_code" ? (input.textCodeScanComplete ?? input.scanComplete) : input.scanComplete,
			componentPath: input.scopedComponentPath,
		});
	}
}

function normalizeKey(value: string): string {
	return value.trim().toLowerCase();
}

function normalizeMatchMode(value: string | undefined): AscetSearchIndexMatchMode {
	return value === "exact" || value === "glob" || value === "contains" ? value : "contains";
}

function normalizeGroup(value: string | undefined): "all" | AscetSearchIndexGroup {
	return value === "primitive" || value === "complex" || value === "referenced" ? value : "all";
}

function normalizeCursor(value: string | undefined): number {
	const normalized = value?.trim() || "0";
	const parsed = Number.parseInt(normalized, 10);
	return Number.isFinite(parsed) && parsed >= 0 ? parsed : 0;
}

function normalizeLimit(value: number | undefined): number {
	return Number.isFinite(value) && value !== undefined && value > 0 ? Math.floor(value) : DEFAULT_LIMIT;
}

function normalizePathForMatching(value: string): string {
	return value.replace(/\\/g, "/");
}

function normalizeAscetPath(value: string | undefined): string {
	const normalized = (value ?? "").trim().replace(/\//g, "\\");
	return normalized.replace(/^\\+|\\+$/g, "");
}

function normalizeOutputPath(value: string): string {
	return value
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function fullElementCacheKey(params: { componentPath?: string; name: string; scope?: string }): string {
	return [
		normalizeAscetPath(params.componentPath).toLowerCase(),
		params.name.trim().toLowerCase(),
		(params.scope ?? "").trim().toLowerCase(),
	].join("\0");
}

function elementDeclarationKey(entry: AscetSearchIndexEntry): string {
	return [
		normalizeAscetPath(entry.componentPath).toLowerCase(),
		entry.elementName.trim().toLowerCase(),
		entry.displayScope.trim().toLowerCase(),
	].join("\0");
}

function isPartitionScopedToComponent(
	partition: AscetSearchIndexPartition,
	componentPath: string | undefined,
): boolean {
	if (!componentPath) {
		return false;
	}
	const partitionState = partitionStates.get(partition);
	return (
		partitionState?.status === "ready" &&
		partitionState.componentPath !== undefined &&
		normalizeAscetPath(partitionState.componentPath).toLowerCase() === normalizeAscetPath(componentPath).toLowerCase()
	);
}

function globToRegExp(pattern: string): RegExp {
	const escaped = pattern
		.replace(/[.+^${}()|[\]\\]/g, "\\$&")
		.replace(/\*/g, ".*")
		.replace(/\?/g, ".");
	return new RegExp(`^${escaped}$`, "i");
}

function matchesQuery(entry: AscetSearchIndexEntry, query: string, matchMode: AscetSearchIndexMatchMode): boolean {
	const elementName = entry.elementName;
	const path = entry.path || `${entry.componentPath}::${entry.elementName}`;
	const normalizedPath = normalizePathForMatching(path);
	const normalizedQuery = query ?? "";
	const normalizedSlashQuery = normalizePathForMatching(normalizedQuery);

	if (matchMode === "exact") {
		const loweredQuery = normalizedQuery.toLowerCase();
		const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
		return (
			elementName.toLowerCase() === loweredQuery ||
			path.toLowerCase() === loweredQuery ||
			normalizedPath.toLowerCase() === loweredSlashQuery
		);
	}

	if (matchMode === "glob") {
		return (
			globToRegExp(normalizedQuery).test(elementName) ||
			globToRegExp(normalizedQuery).test(path) ||
			globToRegExp(normalizedSlashQuery).test(normalizedPath)
		);
	}

	const loweredQuery = normalizedQuery.toLowerCase();
	const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
	return (
		elementName.toLowerCase().includes(loweredQuery) ||
		path.toLowerCase().includes(loweredQuery) ||
		normalizedPath.toLowerCase().includes(loweredSlashQuery)
	);
}

function matchesComponentQuery(
	entry: AscetComponentSearchIndexEntry,
	query: string,
	matchMode: AscetSearchIndexMatchMode,
): boolean {
	const path = entry.path;
	const normalizedPath = normalizePathForMatching(path);
	const normalizedQuery = query ?? "";
	const normalizedSlashQuery = normalizePathForMatching(normalizedQuery);

	if (matchMode === "exact") {
		const loweredQuery = normalizedQuery.toLowerCase();
		const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
		return (
			entry.name.toLowerCase() === loweredQuery ||
			path.toLowerCase() === loweredQuery ||
			normalizedPath.toLowerCase() === loweredSlashQuery
		);
	}

	if (matchMode === "glob") {
		return (
			globToRegExp(normalizedQuery).test(entry.name) ||
			globToRegExp(normalizedQuery).test(path) ||
			globToRegExp(normalizedSlashQuery).test(normalizedPath)
		);
	}

	const loweredQuery = normalizedQuery.toLowerCase();
	const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
	return (
		entry.name.toLowerCase().includes(loweredQuery) ||
		path.toLowerCase().includes(loweredQuery) ||
		normalizedPath.toLowerCase().includes(loweredSlashQuery)
	);
}

function matchesTextCodeQuery(
	entry: AscetTextCodeSearchIndexEntry,
	query: string,
	matchMode: AscetSearchIndexMatchMode,
): boolean {
	const text = entry.text ?? "";
	const methodName = entry.methodName ?? "";
	const path = entry.path || `${entry.componentPath}::${methodName}#${entry.section}`;
	const normalizedPath = normalizePathForMatching(path);
	const normalizedQuery = query ?? "";
	const normalizedSlashQuery = normalizePathForMatching(normalizedQuery);

	if (matchMode === "exact") {
		const loweredQuery = normalizedQuery.toLowerCase();
		const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
		if (
			methodName.toLowerCase() === loweredQuery ||
			path.toLowerCase() === loweredQuery ||
			normalizedPath.toLowerCase() === loweredSlashQuery ||
			text.trim().toLowerCase() === loweredQuery
		) {
			return true;
		}
		return text.split(/\r?\n/).some((line) => line.trim().toLowerCase() === loweredQuery);
	}

	if (matchMode === "glob") {
		const queryPattern = globToRegExp(normalizedQuery);
		const slashPattern = globToRegExp(normalizedSlashQuery);
		return (
			queryPattern.test(methodName) ||
			queryPattern.test(path) ||
			slashPattern.test(normalizedPath) ||
			text.split(/\r?\n/).some((line) => queryPattern.test(line))
		);
	}

	const loweredQuery = normalizedQuery.toLowerCase();
	const loweredSlashQuery = normalizedSlashQuery.toLowerCase();
	return (
		methodName.toLowerCase().includes(loweredQuery) ||
		path.toLowerCase().includes(loweredQuery) ||
		normalizedPath.toLowerCase().includes(loweredSlashQuery) ||
		text.toLowerCase().includes(loweredQuery)
	);
}

function groupMatches(entry: AscetSearchIndexEntry, group: "all" | AscetSearchIndexGroup): boolean {
	if (group === "all") {
		return true;
	}
	if (group === "referenced") {
		return entry.referencedComponentPath.trim().length > 0;
	}
	return entry.group === group;
}

function scopeMatches(entry: AscetSearchIndexEntry, scopePath: string): boolean {
	if (!scopePath) {
		return true;
	}
	const componentPath = normalizeAscetPath(entry.componentPath).toLowerCase();
	const scope = normalizeAscetPath(scopePath).toLowerCase();
	return componentPath === scope || componentPath.startsWith(`${scope}\\`);
}

function componentScopeMatches(entry: AscetComponentSearchIndexEntry, scopePath: string): boolean {
	if (!scopePath) {
		return true;
	}
	const path = normalizeAscetPath(entry.path).toLowerCase();
	const scope = normalizeAscetPath(scopePath).toLowerCase();
	return path === scope || path.startsWith(`${scope}\\`);
}

function textCodeScopeMatches(entry: AscetTextCodeSearchIndexEntry, scopePath: string): boolean {
	if (!scopePath) {
		return true;
	}
	const componentPath = normalizeAscetPath(entry.componentPath).toLowerCase();
	const scope = normalizeAscetPath(scopePath).toLowerCase();
	return componentPath === scope || componentPath.startsWith(`${scope}\\`);
}

function componentPathScopeMatches(componentPathValue: string, scopePath: string): boolean {
	if (!scopePath) {
		return true;
	}
	const componentPath = normalizeAscetPath(componentPathValue).toLowerCase();
	const scope = normalizeAscetPath(scopePath).toLowerCase();
	return componentPath === scope || componentPath.startsWith(`${scope}\\`);
}

function kindMatches(entry: AscetSearchIndexEntry, kind: string | undefined): boolean {
	const normalized = kind?.trim().toLowerCase() ?? "";
	if (!normalized) {
		return true;
	}
	return entry.elementKind.toLowerCase().includes(normalized);
}

function componentKindMatches(entry: AscetComponentSearchIndexEntry, kind: string | undefined): boolean {
	const normalized = kind?.trim().toLowerCase() ?? "";
	if (!normalized) {
		return true;
	}
	return entry.kind.toLowerCase() === normalized || entry.objectKind.toLowerCase() === normalized;
}

function isProjectObject(entry: AscetComponentSearchIndexEntry): boolean {
	return componentKindMatches(entry, "project");
}

function methodNameMatches(entry: AscetTextCodeSearchIndexEntry, methodName: string | undefined): boolean {
	const normalized = methodName?.trim().toLowerCase() ?? "";
	if (!normalized) {
		return true;
	}
	return entry.methodName.toLowerCase() === normalized;
}

function sectionMatches(entry: AscetTextCodeSearchIndexEntry, section: string | undefined): boolean {
	const normalized = section?.trim().toLowerCase() ?? "";
	if (!normalized || normalized === "auto" || normalized === "all") {
		return true;
	}
	return entry.section.toLowerCase() === normalized;
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
	const haystack = extraText
		? `${name}\n${path}\n${normalizedPath}\n${extraText}`
		: `${name}\n${path}\n${normalizedPath}`;

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

function buildByExactName(entries: readonly AscetSearchIndexEntry[]): Map<string, AscetSearchIndexEntry[]> {
	const byName = new Map<string, AscetSearchIndexEntry[]>();
	for (const entry of entries) {
		const key = normalizeKey(entry.elementName);
		const bucket = byName.get(key);
		if (bucket) {
			bucket.push(entry);
		} else {
			byName.set(key, [entry]);
		}
	}
	return byName;
}

function buildByExactComponentName(
	components: readonly AscetComponentSearchIndexEntry[],
): Map<string, AscetComponentSearchIndexEntry[]> {
	const byName = new Map<string, AscetComponentSearchIndexEntry[]>();
	for (const entry of components) {
		const key = normalizeKey(entry.name);
		const bucket = byName.get(key);
		if (bucket) {
			bucket.push(entry);
		} else {
			byName.set(key, [entry]);
		}
	}
	return byName;
}

function mergeByKey<T extends object>(left: readonly T[], right: readonly T[], keyOf: (entry: T) => string): T[] {
	const merged = new Map<string, T>();
	for (const entry of left) {
		merged.set(keyOf(entry), { ...entry });
	}
	for (const entry of right) {
		merged.set(keyOf(entry), { ...entry });
	}
	return [...merged.values()];
}

function computeCounts(
	entries: readonly AscetSearchIndexEntry[],
	components: readonly AscetComponentSearchIndexEntry[],
	textCodeEntries: readonly AscetTextCodeSearchIndexEntry[],
	methodDeclarations: readonly AscetMethodDeclarationIndexEntry[],
	methodProcessElements: readonly AscetMethodProcessElementIndexEntry[],
	componentRefs: readonly AscetReferenceIndexEntry[],
	elementRefs: readonly AscetReferenceIndexEntry[],
	messages: readonly AscetMessageIndexEntry[],
	diagramMetadata: readonly AscetDiagramMetadataIndexEntry[],
	overrides: Partial<AscetSearchIndexCounts> | undefined,
): AscetSearchIndexCounts {
	const componentPaths = new Set<string>();
	let primitive = 0;
	let complex = 0;
	let referenced = 0;
	let methods = 0;
	for (const entry of entries) {
		if (entry.componentPath) {
			componentPaths.add(entry.componentPath);
		}
		if (entry.group === "primitive") {
			primitive += 1;
		}
		if (entry.group === "complex") {
			complex += 1;
		}
		if (entry.referencedComponentPath) {
			referenced += 1;
		}
		if (/method|process|action|condition|trigger/i.test(entry.elementKind)) {
			methods += 1;
		}
	}
	return {
		entries: overrides?.entries ?? entries.length,
		components: overrides?.components ?? (components.length > 0 ? components.length : componentPaths.size),
		primitive: overrides?.primitive ?? primitive,
		complex: overrides?.complex ?? complex,
		referenced: overrides?.referenced ?? referenced,
		methods: overrides?.methods ?? (methodDeclarations.length > 0 ? methodDeclarations.length : methods),
		methodProcessElements: overrides?.methodProcessElements ?? methodProcessElements.length,
		componentRefs: overrides?.componentRefs ?? componentRefs.length,
		elementRefs: overrides?.elementRefs ?? elementRefs.length,
		messages: overrides?.messages ?? messages.length,
		senders: overrides?.senders ?? messages.filter((entry) => entry.messageDirection === "sender").length,
		receivers: overrides?.receivers ?? messages.filter((entry) => entry.messageDirection === "receiver").length,
		sendReceivers:
			overrides?.sendReceivers ?? messages.filter((entry) => entry.messageDirection === "send_receive").length,
		diagramMetadata: overrides?.diagramMetadata ?? diagramMetadata.length,
		textCodeEntries: overrides?.textCodeEntries ?? textCodeEntries.length,
		textCodeChars: overrides?.textCodeChars ?? textCodeEntries.reduce((total, entry) => total + entry.text.length, 0),
	};
}

function buildSearchArgs(params: AscetSearchIndexQueryParams): string[] {
	const args = ["index", "search_elements", params.query];
	if (params.componentPath) {
		args.push("--component", params.componentPath);
	}
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.group) {
		args.push("--group", params.group);
	}
	if (params.kind) {
		args.push("--kind", params.kind);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	return args;
}

function buildComponentSearchArgs(params: AscetComponentIndexQueryParams): string[] {
	const args = ["index", "search_components", params.query];
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.kind) {
		args.push("--kind", params.kind);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	return args;
}

function buildProjectSearchArgs(params: AscetProjectIndexQueryParams): string[] {
	const args = ["index", "search_projects", params.query];
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	return args;
}

function buildTextCodeSearchArgs(params: AscetTextCodeIndexQueryParams): string[] {
	const args = ["index", "search_text_code", params.query];
	if (params.componentPath) {
		args.push("--component", params.componentPath);
	}
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.methodName) {
		args.push("--method-name", params.methodName);
	}
	if (params.section) {
		args.push("--section", params.section);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	return args;
}

function buildGenericIndexArgs(
	operation: string,
	params: {
		query: string;
		componentPath?: string;
		scopePath?: string;
		match?: string;
		limit?: number;
		cursor?: string;
	},
): string[] {
	const args = ["index", operation, params.query];
	if (params.componentPath) {
		args.push("--component", params.componentPath);
	}
	if (params.scopePath) {
		args.push("--scope", params.scopePath);
	}
	if (params.match) {
		args.push("--match", params.match);
	}
	if (params.limit !== undefined) {
		args.push("--limit", String(params.limit));
	}
	if (params.cursor) {
		args.push("--cursor", params.cursor);
	}
	return args;
}

function makePagedIndexResult(
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
	const searchComplete = scanComplete && pageComplete;
	const payload = {
		query,
		componentPath: normalizeAscetPath(params.componentPath),
		scopePath: normalizeAscetPath(params.scopePath),
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete ? "" : scanComplete ? "result_limit" : "partial_index",
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
		index: {
			databaseName: state.status === "ready" ? state.databaseName : "",
			databasePath: state.status === "ready" ? state.databasePath : "",
			generatedAtUtc: state.status === "ready" ? new Date(state.generatedAtMs).toISOString() : "",
			ageMs: state.status === "ready" ? Math.max(0, Date.now() - state.generatedAtMs) : 0,
			scanComplete,
			elapsedMs: state.status === "ready" ? state.elapsedMs : 0,
			...indexCounts,
		},
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
			cwd: options.cwd ?? process.cwd(),
			cliPath: "quick_search_index",
			args: buildGenericIndexArgs(operation, params),
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function findTextSnippet(entry: AscetTextCodeSearchIndexEntry, query: string, matchMode: AscetSearchIndexMatchMode) {
	const lines = (entry.text ?? "").split(/\r?\n/);
	const normalizedQuery = query ?? "";
	const loweredQuery = normalizedQuery.toLowerCase();
	const pattern = matchMode === "glob" ? globToRegExp(normalizedQuery) : undefined;
	for (let i = 0; i < lines.length; i++) {
		const line = lines[i] ?? "";
		const lineMatches =
			matchMode === "exact"
				? line.trim().toLowerCase() === loweredQuery
				: matchMode === "glob"
					? (pattern?.test(line) ?? false)
					: line.toLowerCase().includes(loweredQuery);
		if (lineMatches) {
			return { lineNumber: i + 1, snippet: line.trim() };
		}
	}
	const firstNonEmpty = lines.find((line) => line.trim().length > 0) ?? "";
	return { lineNumber: 0, snippet: firstNonEmpty.trim().slice(0, 240) };
}

export function getAscetSearchIndexState(): AscetSearchIndexState {
	return state;
}

export function getAscetSearchIndexPartitionState(
	partition: AscetSearchIndexPartition,
): AscetSearchIndexPartitionLifecycleState | undefined {
	return partitionStates.get(normalizePartition(partition));
}

export function getAscetFullElement(params: {
	componentPath: string;
	name: string;
	scope?: string;
}): AscetFullElementCacheEntry | undefined {
	const direct = fullElementCache.get(fullElementCacheKey(params));
	if (direct) {
		return cloneFullElement(direct);
	}
	if (params.scope !== undefined) {
		return undefined;
	}
	const matches = queryAscetFullElements(params);
	return matches.length === 1 ? matches[0] : undefined;
}

export function queryAscetFullElements(params: {
	componentPath?: string;
	name: string;
	scope?: string;
}): AscetFullElementCacheEntry[] {
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const name = params.name.trim().toLowerCase();
	const scope = (params.scope ?? "").trim().toLowerCase();
	const result: AscetFullElementCacheEntry[] = [];
	for (const entry of fullElementCache.values()) {
		if (componentPath && normalizeAscetPath(entry.componentPath).toLowerCase() !== componentPath) {
			continue;
		}
		if (entry.name.trim().toLowerCase() !== name) {
			continue;
		}
		if (scope && (entry.scope ?? "").trim().toLowerCase() !== scope) {
			continue;
		}
		result.push(cloneFullElement(entry));
	}
	return result;
}

export function upsertAscetFullElements(entries: readonly AscetFullElementCacheEntry[]): void {
	for (const entry of entries) {
		if (!entry.name.trim()) {
			continue;
		}
		const normalized = cloneFullElement({
			...entry,
			componentPath: normalizeOutputPath(entry.componentPath),
			path: normalizeOutputPath(entry.path),
		});
		fullElementCache.set(fullElementCacheKey(normalized), normalized);
	}
}

export function upsertAscetElementDeclarations(entries: readonly AscetSearchIndexEntry[]): void {
	if (state.status !== "ready" || entries.length === 0) {
		return;
	}
	const normalizedEntries = entries.map((entry) => ({
		...entry,
		componentPath: normalizeOutputPath(entry.componentPath),
		referencedComponentPath: normalizeOutputPath(entry.referencedComponentPath),
		path: normalizeOutputPath(entry.path),
	}));
	const merged = mergeByKey(state.entries, normalizedEntries, elementDeclarationKey);
	const warmedAtMs = Date.now();
	state = {
		...state,
		warmedAtMs,
		entries: merged,
		byExactName: buildByExactName(merged),
		counts: computeCounts(
			merged,
			state.components,
			state.textCodeEntries,
			state.methodDeclarations,
			state.methodProcessElements,
			state.componentRefs,
			state.elementRefs,
			state.messages,
			state.diagramMetadata,
			undefined,
		),
	};
	partitionStates.set("element_decls", {
		partition: "element_decls",
		status: "ready",
		warmedAtMs,
		generatedAtMs: state.generatedAtMs,
		scanComplete: state.scanComplete,
	});
}

function cloneFullElement(entry: AscetFullElementCacheEntry): AscetFullElementCacheEntry {
	return {
		...entry,
		data: { ...entry.data },
	};
}

export function markAscetSearchIndexWarming(
	startedAtMs = Date.now(),
	partitions: readonly AscetSearchIndexPartition[] = ["all"],
): void {
	const expanded = expandPartitions(partitions);
	for (const partition of expanded) {
		partitionStates.set(partition, { partition, status: "warming", startedAtMs });
	}
	if (partitions.includes("all") || state.status !== "ready") {
		state = { status: "warming", startedAtMs };
	}
}

export function markAscetSearchIndexFailed(
	error: { code: string; message: string },
	failedAtMs = Date.now(),
	partitions: readonly AscetSearchIndexPartition[] = ["all"],
): void {
	for (const partition of expandPartitions(partitions)) {
		partitionStates.set(partition, { partition, status: "failed", failedAtMs, error });
	}
	if (state.status !== "ready" || !hasAnyReadyPartition()) {
		state = {
			status: "failed",
			failedAtMs,
			error,
		};
	}
}

export function installAscetSearchIndex(
	input: AscetSearchIndexBuildInput,
	partitions: readonly AscetSearchIndexPartition[] = ["all"],
): AscetSearchIndexState {
	const previous =
		state.status === "ready"
			? state
			: {
					components: [] as AscetComponentSearchIndexEntry[],
					entries: [] as AscetSearchIndexEntry[],
					textCodeEntries: [] as AscetTextCodeSearchIndexEntry[],
					methodDeclarations: [] as AscetMethodDeclarationIndexEntry[],
					methodProcessElements: [] as AscetMethodProcessElementIndexEntry[],
					componentRefs: [] as AscetReferenceIndexEntry[],
					elementRefs: [] as AscetReferenceIndexEntry[],
					messages: [] as AscetMessageIndexEntry[],
					diagramMetadata: [] as AscetDiagramMetadataIndexEntry[],
					textCodeIncluded: false,
					textCodeScanComplete: false,
				};
	const expanded = expandPartitions(partitions);
	const refreshes = (partition: Exclude<AscetSearchIndexPartition, "all">): boolean =>
		expanded.includes(partition) || partitions.includes("all");
	const inputComponents = (input.components ?? []).map((entry) => ({ ...entry }));
	const components = refreshes("components")
		? inputComponents
		: inputComponents.length > 0
			? mergeByKey(previous.components, inputComponents, (entry) => normalizeAscetPath(entry.path).toLowerCase())
			: previous.components.map((entry) => ({ ...entry }));
	const entries = refreshes("element_decls")
		? input.entries.map((entry) => ({ ...entry }))
		: previous.entries.map((entry) => ({ ...entry }));
	const textCodeEntries = refreshes("text_code")
		? (input.textCodeEntries ?? []).map((entry) => ({ ...entry }))
		: previous.textCodeEntries.map((entry) => ({ ...entry }));
	const methodDeclarations = refreshes("method_decls")
		? (input.methodDeclarations ?? []).map((entry) => ({ ...entry }))
		: previous.methodDeclarations.map((entry) => ({ ...entry }));
	const methodProcessElements = refreshes("method_process_elements")
		? (input.methodProcessElements ?? []).map((entry) => ({ ...entry }))
		: previous.methodProcessElements.map((entry) => ({ ...entry }));
	const componentRefs = refreshes("component_refs")
		? (input.componentRefs ?? []).map((entry) => ({ ...entry }))
		: previous.componentRefs.map((entry) => ({ ...entry }));
	const elementRefs = refreshes("element_refs")
		? (input.elementRefs ?? []).map((entry) => ({ ...entry }))
		: previous.elementRefs.map((entry) => ({ ...entry }));
	const messages = refreshes("messages")
		? (input.messages ?? []).map((entry) => ({ ...entry }))
		: previous.messages.map((entry) => ({ ...entry }));
	const diagramMetadata = refreshes("diagram_metadata")
		? (input.diagramMetadata ?? []).map((entry) => ({ ...entry }))
		: previous.diagramMetadata.map((entry) => ({ ...entry }));
	const textCodeIncluded = refreshes("text_code")
		? (input.textCodeIncluded ?? textCodeEntries.length > 0)
		: previous.textCodeIncluded;
	const ready: AscetSearchIndexState = {
		status: "ready",
		databaseName: input.databaseName,
		databasePath: input.databasePath,
		generatedAtMs: input.generatedAtMs ?? Date.now(),
		warmedAtMs: Date.now(),
		elapsedMs: input.elapsedMs,
		scanComplete: input.scanComplete,
		textCodeIncluded,
		textCodeScanComplete: refreshes("text_code")
			? (input.textCodeScanComplete ?? (textCodeIncluded ? input.scanComplete : false))
			: previous.textCodeScanComplete,
		components,
		textCodeEntries,
		entries,
		methodDeclarations,
		methodProcessElements,
		componentRefs,
		elementRefs,
		messages,
		diagramMetadata,
		byExactComponentName: buildByExactComponentName(components),
		byExactName: buildByExactName(entries),
		counts: computeCounts(
			entries,
			components,
			textCodeEntries,
			methodDeclarations,
			methodProcessElements,
			componentRefs,
			elementRefs,
			messages,
			diagramMetadata,
			input.counts,
		),
	};
	state = ready;
	markPartitionsReady(partitions, input, ready.warmedAtMs);
	return ready;
}

export function invalidateAscetSearchIndex(reason: string): void {
	partitionStates.clear();
	state = {
		status: "empty",
		invalidatedReason: reason,
		invalidatedAtMs: Date.now(),
	};
}

export function invalidateAscetSearchIndexPartitions(
	partitions: readonly AscetSearchIndexPartition[],
	reason: string,
	invalidatedAtMs = Date.now(),
): void {
	const expanded = expandPartitions(partitions);
	if (expanded.length === ALL_INDEX_PARTITIONS.length && partitions.includes("all")) {
		invalidateAscetSearchIndex(reason);
		return;
	}
	for (const partition of expanded) {
		partitionStates.set(partition, {
			partition,
			status: "stale",
			invalidatedReason: reason,
			invalidatedAtMs,
		});
	}
	if (state.status !== "ready") {
		state = {
			status: "empty",
			invalidatedReason: reason,
			invalidatedAtMs,
		};
	}
}

export function resetAscetSearchIndexForTest(seed?: AscetSearchIndexBuildInput): void {
	partitionStates.clear();
	fullElementCache.clear();
	if (seed) {
		installAscetSearchIndex(seed);
		return;
	}
	state = { status: "empty" };
}

export function queryAscetComponentIndex(
	params: AscetComponentIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("components")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const scopePath = normalizeAscetPath(params.scopePath);
	const source =
		matchMode === "exact" && !scopePath && !params.kind
			? (state.byExactComponentName.get(normalizeKey(query)) ?? [])
			: state.components;
	const filtered = source.filter(
		(entry) =>
			componentScopeMatches(entry, scopePath) &&
			componentKindMatches(entry, params.kind) &&
			matchesComponentQuery(entry, query, matchMode),
	);
	const page = filtered.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, filtered.length);
	const pageComplete = nextCursor >= filtered.length;
	const searchComplete = state.scanComplete && pageComplete;
	const payload = {
		query,
		scopePath,
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete ? "" : state.scanComplete ? "result_limit" : "partial_index",
		filters: {
			kind: params.kind?.trim() ?? "unknown",
			limit,
		},
		counts: {
			matches: page.length,
			totalCandidates: filtered.length,
			candidatesVisited: filtered.length,
		},
		matches: page.map((entry) => ({ ...entry })),
		source: "quick_search_index",
		index: {
			databaseName: state.databaseName,
			databasePath: state.databasePath,
			generatedAtUtc: new Date(state.generatedAtMs).toISOString(),
			ageMs: Math.max(0, Date.now() - state.generatedAtMs),
			componentCount: state.components.length,
			scanComplete: state.scanComplete,
			elapsedMs: state.elapsedMs,
		},
	};
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: {
			mode: "index",
			operation: "search_components",
			source: "quick_search_index",
		},
	};

	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd ?? process.cwd(),
			cliPath: "quick_search_index",
			args: buildComponentSearchArgs(params),
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

export function queryAscetProjectIndex(
	params: AscetProjectIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("components")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const scopePath = normalizeAscetPath(params.scopePath);
	const candidates = state.components.filter(isProjectObject);
	const filtered = candidates.filter(
		(entry) => componentScopeMatches(entry, scopePath) && matchesComponentQuery(entry, query, matchMode),
	);
	const page = filtered.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, filtered.length);
	const pageComplete = nextCursor >= filtered.length;
	const searchComplete = state.scanComplete && pageComplete;
	const payload = {
		total: filtered.length,
		items: page.map((entry) => ({
			path: entry.path,
			name: entry.name,
			kind: "project",
		})),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete ? "" : state.scanComplete ? "result_limit" : "partial_index",
		index: {
			databaseName: state.databaseName,
			databasePath: state.databasePath,
			generatedAtUtc: new Date(state.generatedAtMs).toISOString(),
			ageMs: Math.max(0, Date.now() - state.generatedAtMs),
			projectCount: candidates.length,
			scanComplete: state.scanComplete,
			elapsedMs: state.elapsedMs,
		},
	};
	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: {
			mode: "index",
			operation: "search_projects",
			source: "quick_search_index",
		},
	};

	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd ?? process.cwd(),
			cliPath: "quick_search_index",
			args: buildProjectSearchArgs(params),
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

export function queryAscetSearchIndex(
	params: AscetSearchIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("element_decls")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const group = normalizeGroup(params.group);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const componentPath = normalizeAscetPath(params.componentPath);
	const normalizedComponentPath = componentPath.toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const source =
		matchMode === "exact" && !componentPath && !scopePath && !params.kind && group === "all"
			? (state.byExactName.get(normalizeKey(query)) ?? [])
			: state.entries;
	const filtered = source.filter((entry) => {
		if (
			normalizedComponentPath &&
			normalizeAscetPath(entry.componentPath).toLowerCase() !== normalizedComponentPath
		) {
			return false;
		}
		return (
			scopeMatches(entry, scopePath) &&
			kindMatches(entry, params.kind) &&
			groupMatches(entry, group) &&
			matchesQuery(entry, query, matchMode)
		);
	});

	const page = filtered.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, filtered.length);
	const pageComplete = nextCursor >= filtered.length;
	const searchComplete = state.scanComplete && pageComplete;
	const payload = {
		query,
		componentPath,
		scopePath,
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete ? "" : state.scanComplete ? "result_limit" : "partial_index",
		filters: {
			group,
			kind: params.kind?.trim() ?? "",
			limit,
		},
		counts: {
			matches: page.length,
			totalCandidates: filtered.length,
			candidatesVisited: filtered.length,
		},
		matches: page.map((entry) => ({ ...entry })),
		source: "quick_search_index",
		index: {
			databaseName: state.databaseName,
			databasePath: state.databasePath,
			generatedAtUtc: new Date(state.generatedAtMs).toISOString(),
			ageMs: Math.max(0, Date.now() - state.generatedAtMs),
			entryCount: state.entries.length,
			scanComplete: state.scanComplete,
			elapsedMs: state.elapsedMs,
		},
	};

	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: {
			mode: "index",
			operation: "search_elements",
			source: "quick_search_index",
		},
	};

	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd ?? process.cwd(),
			cliPath: "quick_search_index",
			args: buildSearchArgs(params),
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

export function queryAscetMethodDeclarationIndex(
	params: AscetMethodDeclarationIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("method_decls")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = state.methodDeclarations.filter((entry) => {
		if (componentPath && normalizeAscetPath(entry.componentPath).toLowerCase() !== componentPath) {
			return false;
		}
		return (
			componentPathScopeMatches(entry.componentPath, scopePath) &&
			matchesNamePath(entry.methodName, entry.path, query, matchMode, entry.methodKind)
		);
	});

	return makePagedIndexResult(
		"declarations_of_method_process",
		params,
		filtered.map((entry) => ({ ...entry, name: entry.methodName, kind: "method", type: entry.methodKind })),
		filtered.length,
		isPartitionScanComplete("method_decls"),
		{ methodDeclarationCount: state.methodDeclarations.length },
		options,
	);
}

export function queryAscetMethodProcessElementIndex(
	params: AscetMethodProcessElementIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("method_process_elements")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const methodName = params.methodName?.trim().toLowerCase() ?? "";
	const filtered = state.methodProcessElements.filter((entry) => {
		if (componentPath && normalizeAscetPath(entry.componentPath).toLowerCase() !== componentPath) {
			return false;
		}
		if (methodName && entry.methodName.toLowerCase() !== methodName) {
			return false;
		}
		return (
			componentPathScopeMatches(entry.componentPath, scopePath) &&
			matchesNamePath(
				entry.elementName,
				entry.path,
				query,
				matchMode,
				`${entry.methodName}\n${entry.elementKind}\n${entry.displayType}\n${entry.role}`,
			)
		);
	});

	return makePagedIndexResult(
		"declarations_of_method_process_element",
		params,
		filtered.map((entry) => ({
			...entry,
			name: entry.elementName,
			kind: "element",
			type: entry.displayType || entry.elementKind,
			scope: entry.role,
		})),
		filtered.length,
		isPartitionScanComplete("method_process_elements"),
		{ methodProcessElementCount: state.methodProcessElements.length },
		options,
	);
}

export function queryAscetComponentReferenceIndex(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("component_refs")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = state.componentRefs.filter((entry) => {
		if (componentPath && normalizeAscetPath(entry.sourceComponentPath).toLowerCase() !== componentPath) {
			return false;
		}
		return (
			componentPathScopeMatches(entry.sourceComponentPath, scopePath) &&
			matchesNamePath(
				entry.targetComponentName,
				entry.targetComponentPath || entry.path,
				query,
				matchMode,
				`${entry.sourceComponentPath}\n${entry.sourceElementName}`,
			)
		);
	});

	return makePagedIndexResult(
		"references_to_component",
		params,
		filtered.map((entry) => ({
			path: entry.path,
			source: {
				component: normalizePathForMatching(entry.sourceComponentPath),
				name: entry.sourceElementName,
				type: entry.sourceElementKind,
				scope: entry.sourceElementScope,
			},
			target: {
				component: normalizePathForMatching(entry.targetComponentPath),
				name: entry.targetComponentName,
				type: entry.targetComponentKind,
				language: entry.targetLanguageKind,
			},
			resolved: entry.resolved,
		})),
		filtered.length,
		isPartitionScanComplete("component_refs"),
		{ componentRefCount: state.componentRefs.length },
		options,
	);
}

export function queryAscetElementReferenceIndex(
	params: AscetReferenceIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("element_refs")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = state.elementRefs.filter((entry) => {
		if (componentPath && normalizeAscetPath(entry.sourceComponentPath).toLowerCase() !== componentPath) {
			return false;
		}
		return (
			componentPathScopeMatches(entry.sourceComponentPath, scopePath) &&
			matchesNamePath(
				entry.elementName || entry.sourceElementName,
				entry.path,
				query,
				matchMode,
				`${entry.sourceElementKind}\n${entry.sourceElementScope}\n${entry.targetComponentPath}`,
			)
		);
	});

	return makePagedIndexResult(
		"references_to_element",
		params,
		filtered.map((entry) => ({
			path: entry.path,
			name: entry.elementName || entry.sourceElementName,
			kind: "reference",
			type: entry.sourceElementKind,
			scope: entry.sourceElementScope,
			source: {
				component: normalizePathForMatching(entry.sourceComponentPath),
				name: entry.sourceElementName,
			},
			target: {
				component: normalizePathForMatching(entry.targetComponentPath),
				name: entry.targetComponentName,
			},
			resolved: entry.resolved,
		})),
		filtered.length,
		isPartitionScanComplete("element_refs"),
		{ elementRefCount: state.elementRefs.length },
		options,
	);
}

export function queryAscetMessageIndex(
	params: AscetMessageIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("messages")) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = state.messages.filter((entry) => {
		if (componentPath && normalizeAscetPath(entry.componentPath).toLowerCase() !== componentPath) {
			return false;
		}
		if (
			params.direction === "sender" &&
			entry.messageDirection !== "sender" &&
			entry.messageDirection !== "send_receive"
		) {
			return false;
		}
		if (
			params.direction === "receiver" &&
			entry.messageDirection !== "receiver" &&
			entry.messageDirection !== "send_receive"
		) {
			return false;
		}
		return (
			componentPathScopeMatches(entry.componentPath, scopePath) &&
			matchesNamePath(entry.elementName, entry.path, query, matchMode, `${entry.elementKind}\n${entry.displayType}`)
		);
	});

	return makePagedIndexResult(
		params.direction === "receiver" ? "receivers_of_message" : "senders_of_message",
		params,
		filtered.map((entry) => ({
			...entry,
			name: entry.elementName,
			kind: "message",
			type: entry.displayType || entry.elementKind,
			scope: entry.displayScope,
			direction: entry.messageDirection,
		})),
		filtered.length,
		isPartitionScanComplete("messages"),
		{ messageCount: state.messages.length },
		options,
	);
}

function normalizeDiagramKindFilter(
	value: AscetDiagramMetadataIndexQueryParams["diagramKind"],
): "all" | "block_diagram" | "state_machine" | "sequence" | "unknown" {
	if (value === "block") {
		return "block_diagram";
	}
	if (value === "state") {
		return "state_machine";
	}
	return value ?? "all";
}

function normalizeDiagramKindValue(value: string): "block_diagram" | "state_machine" | "sequence" | "unknown" {
	const normalized = value.trim().toLowerCase().replace(/[-\s]/g, "_");
	if (normalized.includes("block")) {
		return "block_diagram";
	}
	if (normalized.includes("state")) {
		return "state_machine";
	}
	if (normalized.includes("sequence")) {
		return "sequence";
	}
	return "unknown";
}

export function queryAscetDiagramMetadataIndex(
	params: AscetDiagramMetadataIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("diagram_metadata")) {
		return undefined;
	}

	const componentPath = normalizeAscetPath(params.componentPath).toLowerCase();
	const diagramKind = normalizeDiagramKindFilter(params.diagramKind);
	const filtered = state.diagramMetadata.filter((entry) => {
		if (normalizeAscetPath(entry.componentPath).toLowerCase() !== componentPath) {
			return false;
		}
		const entryKind = normalizeDiagramKindValue(entry.kind);
		return diagramKind === "all" || entryKind === diagramKind;
	});

	const scanComplete =
		isPartitionScanComplete("diagram_metadata") ||
		isPartitionScopedToComponent("diagram_metadata", params.componentPath);

	return makePagedIndexResult(
		"list_diagrams",
		{
			query: "",
			componentPath: params.componentPath,
			limit: params.limit,
			cursor: params.cursor,
		},
		filtered.map((entry) => ({
			name: entry.name,
			kind: "diagram",
			type: normalizeDiagramKindValue(entry.kind),
			path: normalizePathForMatching(entry.path),
			isDefault: entry.isDefault,
			supportsReadBlockDiagram: entry.supportsReadBlockDiagram,
		})),
		filtered.length,
		scanComplete,
		{ diagramCount: state.diagramMetadata.length },
		options,
	);
}

export function queryAscetTextCodeIndex(
	params: AscetTextCodeIndexQueryParams,
	options: AscetSearchIndexQueryOptions = {},
): AscetCliJsonResult | undefined {
	if (state.status !== "ready" || !isPartitionReady("text_code")) {
		return undefined;
	}
	if (!state.textCodeIncluded) {
		return undefined;
	}

	const query = params.query.trim();
	const matchMode = normalizeMatchMode(params.match);
	const limit = normalizeLimit(params.limit);
	const cursor = normalizeCursor(params.cursor);
	const componentPath = normalizeAscetPath(params.componentPath);
	const normalizedComponentPath = componentPath.toLowerCase();
	const scopePath = normalizeAscetPath(params.scopePath);
	const filtered = state.textCodeEntries.filter((entry) => {
		if (
			normalizedComponentPath &&
			normalizeAscetPath(entry.componentPath).toLowerCase() !== normalizedComponentPath
		) {
			return false;
		}
		return (
			textCodeScopeMatches(entry, scopePath) &&
			methodNameMatches(entry, params.methodName) &&
			sectionMatches(entry, params.section) &&
			matchesTextCodeQuery(entry, query, matchMode)
		);
	});

	const page = filtered.slice(cursor, cursor + limit);
	const nextCursor = Math.min(cursor + page.length, filtered.length);
	const pageComplete = nextCursor >= filtered.length;
	const searchComplete = state.textCodeScanComplete && pageComplete;
	const payload = {
		query,
		componentPath,
		scopePath,
		match: matchMode,
		cursor: String(cursor),
		nextCursor: String(nextCursor),
		searchComplete,
		truncated: !searchComplete,
		truncationReason: searchComplete ? "" : state.textCodeScanComplete ? "result_limit" : "partial_index",
		filters: {
			methodName: params.methodName?.trim() ?? "",
			section: params.section?.trim() ?? "",
			limit,
		},
		counts: {
			matches: page.length,
			totalCandidates: filtered.length,
			candidatesVisited: filtered.length,
		},
		matches: page.map((entry) => ({
			...entry,
			...findTextSnippet(entry, query, matchMode),
		})),
		source: "quick_search_index",
		index: {
			databaseName: state.databaseName,
			databasePath: state.databasePath,
			generatedAtUtc: new Date(state.generatedAtMs).toISOString(),
			ageMs: Math.max(0, Date.now() - state.generatedAtMs),
			textCodeEntryCount: state.textCodeEntries.length,
			textCodeChars: state.counts.textCodeChars,
			scanComplete: state.textCodeScanComplete,
			elapsedMs: state.elapsedMs,
		},
	};

	const data = {
		ok: true,
		result: payload,
		error: null,
		meta: {
			mode: "index",
			operation: "search_text_code",
			source: "quick_search_index",
		},
	};

	return {
		ok: true,
		data,
		request: {
			cwd: options.cwd ?? process.cwd(),
			cliPath: "quick_search_index",
			args: buildTextCodeSearchArgs(params),
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

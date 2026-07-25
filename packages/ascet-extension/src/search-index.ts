import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	type RunAscetCliJsonOptions,
	runAscetCliJson,
} from "./cli.ts";
import {
	type AscetComponentSearchIndexEntry,
	type AscetDiagramMetadataIndexEntry,
	type AscetMessageIndexEntry,
	type AscetMethodDeclarationIndexEntry,
	type AscetMethodProcessElementIndexEntry,
	type AscetReferenceIndexEntry,
	type AscetSearchIndexBuildInput,
	type AscetSearchIndexCounts,
	type AscetSearchIndexEntry,
	type AscetSearchIndexPartition,
	type AscetTextCodeSearchIndexEntry,
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	installAscetSearchIndex,
	markAscetSearchIndexFailed,
	markAscetSearchIndexWarming,
} from "./search-index-store.ts";

const DEFAULT_SEARCH_INDEX_TTL_MS = 10 * 60 * 1000;

export type {
	AscetComponentSearchIndexEntry,
	AscetDiagramMetadataIndexEntry,
	AscetMessageIndexEntry,
	AscetMethodDeclarationIndexEntry,
	AscetMethodProcessElementIndexEntry,
	AscetReferenceIndexEntry,
	AscetSearchIndexCounts,
	AscetSearchIndexEntry,
	AscetSearchIndexGroup,
	AscetSearchIndexPartition,
	AscetSearchIndexPartitionLifecycleState,
	AscetSearchIndexState,
	AscetTextCodeSearchIndexEntry,
} from "./search-index-store.ts";
export {
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	invalidateAscetSearchIndex,
	invalidateAscetSearchIndexPartitions,
	queryAscetComponentIndex,
	queryAscetComponentReferenceIndex,
	queryAscetDiagramMetadataIndex,
	queryAscetElementReferenceIndex,
	queryAscetMessageIndex,
	queryAscetMethodDeclarationIndex,
	queryAscetMethodProcessElementIndex,
	queryAscetSearchIndex,
	queryAscetTextCodeIndex,
	resetAscetSearchIndexForTest,
} from "./search-index-store.ts";

export interface AscetSearchIndexWarmupOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	partition?:
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

function normalizeWarmupPartition(
	options: Pick<AscetSearchIndexWarmupOptions, "partition" | "includeTextCode">,
): AscetSearchIndexPartition {
	return options.partition ?? "all";
}

function partitionsForWarmup(partition: AscetSearchIndexPartition): AscetSearchIndexPartition[] {
	return partition === "all"
		? [
				"components",
				"element_decls",
				"method_decls",
				"method_process_elements",
				"component_refs",
				"element_refs",
				"messages",
				"diagram_metadata",
				"text_code",
			]
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
	partition: AscetSearchIndexPartition,
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
		const path = asString(item.path);
		const name = asString(item.name);
		if (!path || !name) {
			continue;
		}
		components.push({
			path,
			name,
			kind: asString(item.kind),
			languageKind: asString(item.languageKind),
			displayName: asString(item.displayName) || name,
			parentPath: asString(item.parentPath),
			ownerKind: asString(item.ownerKind),
			targetKind: asString(item.targetKind),
			objectKind: asString(item.objectKind),
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

function parseLegacyTextCodeEntries(value: unknown): AscetTextCodeSearchIndexEntry[] {
	if (!Array.isArray(value)) {
		return [];
	}
	return parseTextCodeEntries(value.filter((item) => isRecord(item) && item.group === "text_code"));
}

function buildInputFromPayload(payload: Record<string, unknown>): AscetSearchIndexBuildInput | undefined {
	const rawEntries = payload.entries;
	const rawComponents = payload.components;
	const entries = parseEntries(rawEntries);
	const methodDeclarations = parseMethodDeclarations(payload.methodDeclarations);
	const methodProcessElements = parseMethodProcessElements(payload.methodProcessElements);
	const componentRefs = parseReferences(payload.componentRefs);
	const elementRefs = parseReferences(payload.elementRefs);
	const messages = parseMessages(payload.messages);
	const diagramMetadata = parseDiagramMetadata(payload.diagramMetadata);
	if (
		!Array.isArray(rawEntries) &&
		!Array.isArray(rawComponents) &&
		methodDeclarations.length === 0 &&
		methodProcessElements.length === 0 &&
		componentRefs.length === 0 &&
		elementRefs.length === 0 &&
		messages.length === 0 &&
		diagramMetadata.length === 0 &&
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
		components: parseComponents(payload.components),
		textCodeEntries,
		entries,
		methodDeclarations,
		methodProcessElements,
		componentRefs,
		elementRefs,
		messages,
		diagramMetadata,
		counts: parseCounts(payload.counts),
	};
}

function countPartitionEntries(
	state: ReturnType<typeof getAscetSearchIndexState>,
	partition: AscetSearchIndexPartition,
): number {
	if (state.status !== "ready") {
		return 0;
	}
	switch (partition) {
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
	requiresTextCode: boolean,
	forceRefresh: boolean,
	partition: AscetSearchIndexPartition,
	componentPath?: string,
): AscetSearchIndexWarmupResult | undefined {
	if (forceRefresh || isForceWarmup(env)) {
		return undefined;
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

function disabledResult(partition: AscetSearchIndexPartition): AscetSearchIndexWarmupResult {
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
	partition: AscetSearchIndexPartition,
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
	input: AscetSearchIndexBuildInput,
	partition: AscetSearchIndexPartition,
	componentScoped: boolean,
): AscetSearchIndexWarmupResult {
	const effectiveInput = componentScoped
		? {
				...input,
				scanComplete: false,
				textCodeScanComplete: input.textCodeIncluded ? false : input.textCodeScanComplete,
			}
		: input;
	const ready = installAscetSearchIndex(effectiveInput, partitionsForWarmup(partition));
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
	const timeoutMs = options.timeoutMs ?? 60_000;
	const args = ["exec", "warm_search_index"];
	if (options.partition) {
		args.push("--partition", options.partition);
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
	const includeTextCode = options.includeTextCode === true || isTextCodeWarmupEnabled(options.env);
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
		return failureResult(result, partition);
	}

	const payload = unwrapPayload(result.data);
	const input = payload ? buildInputFromPayload(payload) : undefined;
	if (!input) {
		return failureResult(
			result,
			partition,
			"invalid_search_index_payload",
			"warm_search_index returned invalid JSON shape: expected at least one index partition array.",
		);
	}

	return successResult(result, input, partition, Boolean(options.componentPath));
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
		options.includeTextCode === true || isTextCodeWarmupEnabled(options.env),
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

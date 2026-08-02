import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { refreshElementsFromLiveCatalog } from "./element-index-writeback.ts";
import { runAscetReadElementDependency } from "./read-element-dependency.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import {
	type AscetSearchIndexEntry,
	ensureAscetSearchIndex,
	getAscetFullElement,
	getAscetSearchIndexPartitionState,
	getAscetSearchIndexState,
	queryAscetSearchIndex,
} from "./search-index.ts";

export interface AscetReadDependentChainParams {
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
	providerScopePath?: string;
	maxCandidates?: number;
	detailLevel?: "summary" | "full";
	fallback?: "none" | "legacy_live";
}

export interface RunAscetReadDependentChainOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadDependentChainResult = AscetCliJsonResult;

export const ascetReadDependentChainParameters = Type.Object({
	componentPath: Type.String({
		description: "ASCET consuming component path containing the local dependent parameter.",
		minLength: 1,
	}),
	dependentElement: Type.String({ description: "Local dependent parameter name to analyze.", minLength: 1 }),
	exporterComponentPath: Type.Optional(
		Type.String({
			description: "Optional provider/exporter component path used as a verification constraint.",
			minLength: 1,
		}),
	),
	providerScopePath: Type.Optional(
		Type.String({ description: "Optional folder or scope path used to bound provider discovery.", minLength: 1 }),
	),
	maxCandidates: Type.Optional(
		Type.Number({
			description: "Maximum provider candidates to inspect during discovery. Defaults to 200.",
			minimum: 1,
		}),
	),
	detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
	fallback: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("legacy_live")])),
});

export function buildReadDependentChainArgs(params: AscetReadDependentChainParams): string[] {
	const args = ["exec", "read_dependent_chain", normalizeAscetPath(params.componentPath), params.dependentElement];
	if (params.exporterComponentPath) {
		args.push("--exporter", normalizeAscetPath(params.exporterComponentPath));
	}
	if (params.providerScopePath) {
		args.push("--provider-scope", normalizeAscetPath(params.providerScopePath));
	}
	if (params.maxCandidates !== undefined && Number.isFinite(params.maxCandidates)) {
		args.push("--max-candidates", String(Math.trunc(params.maxCandidates)));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetReadDependentChainResult> {
	// The live dependency mapping is authoritative.  A same-name index hit is
	// only a candidate and must not override an explicit live Imported ->
	// Exported owner relationship.
	if ((params.fallback ?? "legacy_live") === "legacy_live") {
		const legacy = await runLegacyAscetReadDependentChain(params, options);
		if (legacy.ok) {
			const evidence = await recoverLegacyEvidence(params, options, extractLegacyEvidence(legacy.data));
			const liveResolved = await resolveLiveEvidence(params, options, evidence);
			if (liveResolved) {
				return liveResolved;
			}
			if (params.exporterComponentPath) {
				const names = uniqueStrings([...evidence.importedNames, ...evidence.exportedNames, ...evidence.references]);
				if (names.length > 0) {
					const explicitLive = await findExplicitLiveProvider(names, params, options);
					if (explicitLive.status !== "not_found") {
						return completeProviderResult(params, options, explicitLive, evidence);
					}
				}
			}

			const indexReady = await ensureElementDeclarationsReady(options);
			if (indexReady) {
				const indexed = await runIndexFirstDependentChain(params, options, evidence);
				if (indexed) {
					return indexed;
				}
			}

			return legacy;
		}
	}

	const indexReady = await ensureElementDeclarationsReady(options);
	if (indexReady) {
		const indexed = await runIndexFirstDependentChain(params, options);
		if (indexed) {
			return indexed;
		}
	}
	if ((params.fallback ?? "legacy_live") === "legacy_live") {
		return runLegacyAscetReadDependentChain(params, options);
	}
	return createIndexedResult(params, options, {
		total: 0,
		items: [],
		issues: [
			{
				code: "elementIndexUnavailable",
				message: "element_decls index is unavailable and legacy fallback is disabled.",
			},
		],
	});
}

async function runLegacyAscetReadDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetReadDependentChainResult> {
	return runAscetCliJson(buildReadDependentChainArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_dependent_chain",
		jobKind: "read",
	});
}

export function formatReadDependentChainResult(result: AscetReadDependentChainResult): string {
	return formatAscetCliJsonResult("read_dependent_chain", result);
}

async function ensureElementDeclarationsReady(options: RunAscetReadDependentChainOptions): Promise<boolean> {
	if (getAscetSearchIndexPartitionState("element_decls")?.status === "ready") {
		return true;
	}
	const warmup = await ensureAscetSearchIndex({
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		executeCli: options.executeCli,
		scheduler: options.scheduler,
		partition: "element_decls",
		toolName: "ascet_read",
	});
	// SQLite-backed warmups may be served from the persisted cache without
	// hydrating the process-local memory index. The persisted ready result is
	// still authoritative for the bounded provider query below.
	return warmup.ok;
}

async function runIndexFirstDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	legacyEvidence?: LegacyChainEvidence,
): Promise<AscetReadDependentChainResult | undefined> {
	const directNames = legacyEvidence
		? uniqueStrings([...legacyEvidence.importedNames, ...legacyEvidence.exportedNames, ...legacyEvidence.references])
		: [params.dependentElement];
	const directProviders = findExportedProviders(directNames.length > 0 ? directNames : [params.dependentElement], {
		...params,
		exporterComponentPath: params.exporterComponentPath ?? uniqueSingle(legacyEvidence?.exportOwnerPaths ?? []),
	});
	if (directProviders.status !== "not_found") {
		return completeProviderResult(params, options, directProviders, legacyEvidence);
	}

	if ((params.fallback ?? "legacy_live") !== "legacy_live") {
		return createNoProviderResult(params, options, undefined, directNames);
	}

	if (legacyEvidence) {
		if (directNames.length > 0 && params.exporterComponentPath) {
			const liveProvider = await findExplicitLiveProvider(directNames, params, options);
			if (liveProvider.status !== "not_found") {
				return completeProviderResult(params, options, liveProvider, legacyEvidence);
			}
		}
		return createNoProviderResult(params, options, legacyEvidence, directNames);
	}
	const legacy = await runLegacyAscetReadDependentChain(params, options);
	if (!legacy.ok) {
		return legacy;
	}

	const recoveredEvidence = extractLegacyEvidence(legacy.data);
	const candidateNames = uniqueStrings([
		...recoveredEvidence.importedNames,
		...recoveredEvidence.exportedNames,
		...recoveredEvidence.references,
	]);
	const names = candidateNames.length > 0 ? candidateNames : directNames;
	const providers = findExportedProviders(names, {
		...params,
		exporterComponentPath: params.exporterComponentPath ?? uniqueSingle(recoveredEvidence.exportOwnerPaths),
	});
	if (providers.status !== "not_found") {
		return completeProviderResult(params, options, providers, recoveredEvidence);
	}
	if ((params.fallback ?? "legacy_live") === "legacy_live" && names.length > 0 && params.exporterComponentPath) {
		const liveProvider = await findExplicitLiveProvider(names, params, options);
		if (liveProvider.status !== "not_found") {
			return completeProviderResult(params, options, liveProvider, recoveredEvidence);
		}
	}
	return createNoProviderResult(
		params,
		options,
		recoveredEvidence,
		names.length > 0 ? names : [params.dependentElement],
	);
}

async function findExplicitLiveProvider(
	names: readonly string[],
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<ProviderResolution> {
	const componentPath = normalizeOutputPath(params.exporterComponentPath);
	if (!componentPath) {
		return { status: "not_found", items: [] };
	}
	const maxCandidates = Math.trunc(params.maxCandidates ?? 200);
	for (const name of names.slice(0, Number.isFinite(maxCandidates) && maxCandidates > 0 ? maxCandidates : 200)) {
		const candidate: AscetSearchIndexEntry = {
			group: "primitive",
			componentPath,
			componentKind: "",
			componentLanguageKind: "",
			elementName: name,
			elementKind: "parameter",
			displayType: "",
			displayScope: "Exported",
			referencedComponentPath: "",
			path: `${componentPath}/${name}`,
		};
		const full = await readProviderElementData(candidate, options);
		if (!full.issue) {
			return { status: "found", item: candidate, lookupSource: "live" };
		}
	}
	return { status: "not_found", items: [] };
}

async function recoverLegacyEvidence(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	evidence: LegacyChainEvidence,
): Promise<LegacyChainEvidence> {
	if (hasProviderEvidence(evidence)) {
		return evidence;
	}

	const dependency = await runAscetReadElementDependency(
		{
			targetPath: params.componentPath,
			elementName: params.dependentElement,
			targetKind: "component",
		},
		options,
	);
	if (!dependency.ok) {
		return evidence;
	}

	const payload = unwrapPayload(dependency.data);
	const matches = Array.isArray(payload?.matches) ? payload.matches.filter(isRecord) : [];
	const matching =
		matches.find((entry) => {
			const component = asString(entry.component);
			const element = asString(entry.element);
			return (
				(!component || normalizeForCompare(component) === normalizeForCompare(params.componentPath)) &&
				(!element || element.trim().toLowerCase() === params.dependentElement.trim().toLowerCase())
			);
		}) ?? matches[0];
	const formulaCode = asString(matching?.formula) || asString(payload?.formula);
	const references = extractFormulaReferences(formulaCode);
	if (!formulaCode.trim() && references.length === 0) {
		return evidence;
	}

	const recoveredNames = uniqueStrings(references);
	const recoveredIssues = evidence.issues.filter(
		(issue) => issue !== "dependency_mapping_not_found" && issue !== "formula_not_found",
	);
	const supported = matching?.supported === true;
	return {
		...evidence,
		dependent: {
			...evidence.dependent,
			dependency: asString(matching?.dependency) || evidence.dependent.dependency,
		},
		formula: {
			code: formulaCode,
			references: uniqueStrings([...(evidence.formula?.references ?? []), ...references]),
			mappings: recoveredNames.map((name) => ({ formal: name, imported: name })),
		},
		importedNames: uniqueStrings([...evidence.importedNames, ...recoveredNames]),
		references: uniqueStrings([...evidence.references, ...references]),
		complete: evidence.complete || (supported && recoveredNames.length > 0),
		issues: recoveredIssues,
	};
}

function hasProviderEvidence(evidence: LegacyChainEvidence): boolean {
	return (
		evidence.importedNames.length > 0 ||
		evidence.exportedNames.length > 0 ||
		evidence.references.length > 0 ||
		Boolean(evidence.formula?.code?.trim())
	);
}

async function resolveLiveEvidence(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	evidence: LegacyChainEvidence,
): Promise<AscetReadDependentChainResult | undefined> {
	const ownerPath = uniqueSingle(evidence.exportOwnerPaths);
	const providerName = uniqueSingle([...evidence.exportedNames, ...evidence.importedNames, ...evidence.references]);
	if (!ownerPath || !providerName) {
		return undefined;
	}

	// Keep the live owner even when the local element_decls index is stale or
	// does not contain the provider yet.
	const liveProvider: AscetSearchIndexEntry = {
		group: "primitive",
		componentPath: ownerPath,
		componentKind: "",
		componentLanguageKind: "",
		elementName: providerName,
		elementKind: "parameter",
		displayType: "",
		displayScope: "Exported",
		referencedComponentPath: "",
		path: `${ownerPath}/${providerName}`,
	};
	return completeProviderResult(
		params,
		options,
		{ status: "found", item: liveProvider, lookupSource: "live" },
		evidence,
	);
}

async function completeProviderResult(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	providers: ProviderResolution,
	legacy: LegacyChainEvidence | undefined,
): Promise<AscetReadDependentChainResult> {
	if (providers.status === "ambiguous") {
		return createIndexedResult(params, options, {
			total: providers.items.length,
			items: providers.items.map((provider) => providerToItem(provider)),
			issues: [
				{
					code: "exportedProviderAmbiguous",
					message:
						"More than one same-name scope=Exported provider matched. Pass exporterComponentPath or providerScopePath.",
				},
			],
		});
	}
	if (providers.status === "not_found") {
		return createNoProviderResult(params, options, undefined, [params.dependentElement]);
	}

	const provider = providers.item;
	const full = await readProviderElementData(provider, options);
	const resolvedLegacy = legacy ? resolveLegacyProviderEvidence(legacy, provider) : undefined;
	const payload = {
		consumer: buildConsumerPayload(params, resolvedLegacy),
		provider: providerToItem(provider, full.componentPath),
		element:
			params.detailLevel === "summary"
				? { source: full.source }
				: {
						source: full.source,
						component: full.componentPath,
						data: full.data,
					},
		index: {
			provider: "element_decls",
			element: full.source === "full_element_cache" ? "full_element_cache" : "live",
		},
		providerLookupSource: providers.lookupSource,
		complete: !full.issue && (resolvedLegacy ? resolvedLegacy.complete : true),
		issues: full.issue ? [full.issue] : resolvedLegacy?.issues.length ? resolvedLegacy.issues : [],
	};
	return createIndexedResult(params, options, payload);
}

function createNoProviderResult(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	legacy: LegacyChainEvidence | undefined,
	names: readonly string[],
): AscetReadDependentChainResult {
	const searchedNames = uniqueStrings(names);
	return createIndexedResult(params, options, {
		consumer: buildConsumerPayload(params, legacy),
		total: 0,
		items: [],
		issues: [
			{
				code: "exportedProviderNotFound",
				message: `No same-name scope=Exported provider was found in element_decls for ${searchedNames.length > 0 ? searchedNames.join(", ") : params.dependentElement}.`,
			},
		],
	});
}

type ProviderResolution =
	| { status: "found"; item: AscetSearchIndexEntry; lookupSource: "index" | "live" }
	| { status: "ambiguous"; items: AscetSearchIndexEntry[] }
	| { status: "not_found"; items: [] };

function findExportedProviders(
	names: readonly string[],
	params: AscetReadDependentChainParams,
	options?: Pick<RunAscetReadDependentChainOptions, "cwd">,
): ProviderResolution {
	const state = getAscetSearchIndexState();
	const nameSet = new Set(names.map((name) => name.trim().toLowerCase()).filter(Boolean));
	const exporter = normalizeForCompare(params.exporterComponentPath);
	const providerScope = normalizeForCompare(params.providerScopePath);
	const maxCandidates = Math.trunc(params.maxCandidates ?? 200);
	const matches = (entry: AscetSearchIndexEntry): boolean => {
		if (!nameSet.has(entry.elementName.trim().toLowerCase())) {
			return false;
		}
		if (entry.displayScope.trim().toLowerCase() !== "exported") {
			return false;
		}
		const component = normalizeForCompare(entry.componentPath);
		if (exporter && component !== exporter) {
			return false;
		}
		if (providerScope && component !== providerScope && !component.startsWith(`${providerScope}/`)) {
			return false;
		}
		return true;
	};
	let candidates = state.status === "ready" ? state.entries.filter(matches) : [];
	if (candidates.length === 0 && options?.cwd) {
		candidates = queryExportedProvidersFromSqlite(names, params, options.cwd).filter(matches);
	}
	const limited = candidates.slice(0, Number.isFinite(maxCandidates) && maxCandidates > 0 ? maxCandidates : 200);
	if (limited.length === 0) {
		return { status: "not_found", items: [] };
	}
	if (limited.length === 1) {
		return { status: "found", item: limited[0]!, lookupSource: "index" };
	}
	return { status: "ambiguous", items: limited };
}

function queryExportedProvidersFromSqlite(
	names: readonly string[],
	params: AscetReadDependentChainParams,
	cwd: string,
): AscetSearchIndexEntry[] {
	const maxCandidates = Math.trunc(params.maxCandidates ?? 200);
	const limit = Number.isFinite(maxCandidates) && maxCandidates > 0 ? maxCandidates : 200;
	const entries: AscetSearchIndexEntry[] = [];
	for (const name of uniqueStrings(names)) {
		const result = queryAscetSearchIndex(
			{
				query: name,
				match: "exact",
				group: "primitive",
				componentPath: params.exporterComponentPath,
				scopePath: params.providerScopePath,
				limit,
			},
			{ cwd },
		);
		const payload = unwrapPayload(result?.data);
		const matches = Array.isArray(payload?.matches) ? payload.matches.filter(isRecord) : [];
		for (const match of matches) {
			const entry = toSearchIndexEntry(match);
			if (entry) {
				entries.push(entry);
			}
		}
	}
	return [...new Map(entries.map((entry) => [`${entry.componentPath}\u0000${entry.elementName}`, entry])).values()];
}

function toSearchIndexEntry(value: Record<string, unknown>): AscetSearchIndexEntry | undefined {
	const componentPath = asString(value.componentPath);
	const elementName = asString(value.elementName);
	if (!componentPath || !elementName) {
		return undefined;
	}
	return {
		group: value.group === "complex" || value.group === "referenced" ? value.group : "primitive",
		componentPath,
		componentKind: asString(value.componentKind),
		componentLanguageKind: asString(value.componentLanguageKind),
		elementName,
		elementKind: asString(value.elementKind),
		displayType: asString(value.displayType),
		displayScope: asString(value.displayScope),
		referencedComponentPath: asString(value.referencedComponentPath),
		path: asString(value.path) || `${componentPath}/${elementName}`,
	};
}

function resolveLegacyProviderEvidence(
	legacy: LegacyChainEvidence,
	provider: AscetSearchIndexEntry,
): LegacyChainEvidence {
	const providerName = provider.elementName.trim().toLowerCase();
	const referencedNames = uniqueStrings([...legacy.importedNames, ...legacy.exportedNames, ...legacy.references]);
	const issues = legacy.issues.filter((issue) => {
		const match = /^export_not_found:(.+)$/u.exec(issue);
		return !match || match[1]!.trim().toLowerCase() !== providerName;
	});
	return {
		...legacy,
		complete:
			legacy.complete ||
			(referencedNames.length === 1 &&
				referencedNames[0]!.trim().toLowerCase() === providerName &&
				issues.length === 0),
		issues,
	};
}

async function readProviderElementData(
	provider: AscetSearchIndexEntry,
	options: RunAscetReadDependentChainOptions,
): Promise<{
	source: "full_element_cache" | "live";
	data?: Record<string, unknown>;
	componentPath?: string;
	issue?: { code: string; message: string };
}> {
	const cached = getAscetFullElement({
		componentPath: provider.componentPath,
		name: provider.elementName,
		scope: "Exported",
	});
	if (cached) {
		return { source: "full_element_cache", data: cached.data, componentPath: cached.componentPath };
	}
	const update = await refreshElementsFromLiveCatalog(
		{
			componentPath: provider.componentPath,
			names: [provider.elementName],
			scopes: ["Exported"],
			followReferences: true,
			maxReferenceDepth: 2,
			reason: "read_dependent_chain:provider_full_element",
		},
		options,
	);
	const refreshedComponent = update.elements.find(
		(entry) =>
			entry.name.trim().toLowerCase() === provider.elementName.trim().toLowerCase() &&
			(entry.scope ?? "").trim().toLowerCase() === "exported",
	)?.component;
	const refreshed = getAscetFullElement({
		componentPath: refreshedComponent ?? provider.componentPath,
		name: provider.elementName,
		scope: "Exported",
	});
	if (refreshed) {
		return { source: "live", data: refreshed.data, componentPath: refreshed.componentPath };
	}
	return {
		source: "live",
		issue: update.issues?.[0] ?? {
			code: "providerElementReadbackMissing",
			message: "Provider was found in element_decls, but full provider element data was not available.",
		},
	};
}

function providerToItem(entry: AscetSearchIndexEntry, overrideComponentPath?: string) {
	const componentPath = normalizeOutputPath(overrideComponentPath ?? entry.componentPath);
	return {
		component: componentPath,
		name: entry.elementName,
		kind: entry.elementKind || undefined,
		type: entry.displayType || undefined,
		scope: entry.displayScope || undefined,
		path: normalizeOutputPath(
			overrideComponentPath
				? `${componentPath}::${entry.elementName}`
				: entry.path || `${entry.componentPath}/${entry.elementName}`,
		),
	};
}

function buildConsumerPayload(params: AscetReadDependentChainParams, legacy: LegacyChainEvidence | undefined) {
	return {
		component: normalizeOutputPath(params.componentPath),
		dependent: {
			name: params.dependentElement,
			kind: legacy?.dependent.kind,
			scope: legacy?.dependent.scope,
			dependency: legacy?.dependent.dependency,
		},
		formula: legacy?.formula,
	};
}

interface LegacyChainEvidence {
	dependent: {
		kind?: string;
		scope?: string;
		dependency?: string;
	};
	formula?: {
		code?: string;
		references?: string[];
		mappings?: Array<{ formal?: string; imported?: string }>;
	};
	importedNames: string[];
	exportedNames: string[];
	references: string[];
	exportOwnerPaths: string[];
	complete: boolean;
	issues: string[];
}

function extractLegacyEvidence(data: unknown): LegacyChainEvidence {
	const payload = unwrapPayload(data);
	const dependent = asRecord(payload?.dependent);
	const formula = asRecord(payload?.dependencyFormula);
	const inputs = Array.isArray(payload?.inputs) ? payload.inputs.filter(isRecord) : [];
	const formulaMappings = Array.isArray(formula?.mappings) ? formula.mappings.filter(isRecord) : [];
	const mappings = formulaMappings.map((entry) => ({
		formal: asString(entry.formal),
		imported: asString(entry.imported),
	}));
	const code = asString(formula?.code) || asString(dependent?.formula);
	const issues = asStringArray(payload?.issues);
	return {
		dependent: {
			kind: asString(dependent?.kind) || undefined,
			scope: asString(dependent?.scope) || undefined,
			dependency: asString(dependent?.dependency) || undefined,
		},
		formula: {
			code: code || undefined,
			references: uniqueStrings([...asStringArray(formula?.references), ...extractFormulaReferences(code)]),
			mappings,
		},
		importedNames: uniqueStrings([
			...mappings.map((entry) => entry.imported ?? ""),
			...inputs.map((entry) => asString(asRecord(entry.value)?.name)),
		]),
		exportedNames: uniqueStrings(inputs.map((entry) => asString(asRecord(entry.export)?.name))),
		references: uniqueStrings([...asStringArray(formula?.references), ...extractFormulaReferences(code)]),
		exportOwnerPaths: uniqueStrings(inputs.map((entry) => asString(asRecord(entry.export)?.owner))),
		complete: payload?.complete === true,
		issues,
	};
}

function createIndexedResult(
	params: AscetReadDependentChainParams,
	options: Pick<RunAscetReadDependentChainOptions, "cwd" | "signal" | "timeoutMs">,
	payload: unknown,
): AscetCliJsonResult {
	const request = {
		cwd: options.cwd,
		cliPath: "quick_search_index",
		args: ["index", "read_dependent_chain", normalizeOutputPath(params.componentPath), params.dependentElement],
		signal: options.signal,
		timeoutMs: options.timeoutMs,
	};
	return {
		ok: true,
		data: payload,
		request,
		stdout: JSON.stringify(payload),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
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

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return isRecord(value) ? value : undefined;
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asStringArray(value: unknown): string[] {
	return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string") : [];
}

function extractFormulaReferences(formula: string): string[] {
	if (!formula.trim()) {
		return [];
	}
	const matches = formula.match(/[A-Za-z_][A-Za-z0-9_]*/g) ?? [];
	return uniqueStrings(matches.filter((entry) => !isFormulaKeyword(entry)));
}

function isFormulaKeyword(value: string): boolean {
	return ["true", "false", "and", "or", "not"].includes(value.toLowerCase());
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}

function uniqueSingle(values: readonly string[]): string | undefined {
	const unique = uniqueStrings(values);
	return unique.length === 1 ? unique[0] : undefined;
}

function normalizeOutputPath(value: string | undefined): string {
	return (value ?? "")
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function normalizeForCompare(value: string | undefined): string {
	return normalizeOutputPath(value).toLowerCase();
}

import { Type } from "typebox";
import { type AscetCliExecutionResult, type AscetCliJsonResult, type AscetCliRequest, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "./get.ts";
import { runAscetReadElement } from "./read-element.ts";
import { runAscetReadElementDependency } from "./read-element-dependency.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { normalizeAscetSearchResult, runAscetSearch } from "./search.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

export interface AscetReadDependentChainParams {
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
}

export interface RunAscetReadDependentChainOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	agentId?: string;
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
			description: "Optional exact provider/exporter component path used as a verification constraint.",
			minLength: 1,
		}),
	),
});

const PROVIDER_SEARCH_LIMIT = 20;
type JsonRecord = Record<string, unknown>;

export function buildReadDependentChainArgs(params: AscetReadDependentChainParams): string[] {
	const args = ["exec", "read_dependent_chain", normalizeAscetPath(params.componentPath), params.dependentElement];
	if (params.exporterComponentPath) {
		args.push("--exporter", normalizeAscetPath(params.exporterComponentPath));
	}
	args.push("--json");
	return args;
}

export function parseAscetElementSearchHint(label: string, elementName: string): string | undefined {
	const signatureIndex = label.indexOf("::");
	if (signatureIndex <= 0 || label.slice(0, signatureIndex).trim() !== elementName) return undefined;
	const parentStart = label.lastIndexOf(" (");
	if (parentStart < 0 || !label.endsWith(")")) return undefined;
	const componentSeparator = label.lastIndexOf(" - ", parentStart);
	if (componentSeparator < signatureIndex) return undefined;
	const componentName = label.slice(componentSeparator + 3, parentStart).trim();
	const parentPath = label.slice(parentStart + 2, -1).trim();
	if (!componentName || !parentPath) return undefined;
	return normalizeAscetPath(`${parentPath}\\${componentName}`);
}

export interface ResolveExportedParameterParams {
	consumerComponentPath: string;
	importedElement: string;
	exporterComponentPath?: string;
	exportedElement?: string;
}

export type ResolveExportedParameterResult =
	| { ok: true; componentPath: string; elementName: string }
	| { ok: false; result: AscetCliJsonResult };

export async function resolveExportedParameter(
	params: ResolveExportedParameterParams,
	options: RunAscetReadDependentChainOptions,
): Promise<ResolveExportedParameterResult> {
	const exportedElement = params.exportedElement ?? params.importedElement;
	const importedRead = await runAscetReadElement(
		{ componentPath: params.consumerComponentPath, elementName: params.importedElement },
		options,
	);
	const imported = exactElement(importedRead);
	if (!isParameterWithScope(imported, "imported")) {
		return {
			ok: false,
			result: failure(
				importedRead,
				"incomplete_chain",
				`Imported Parameter '${params.importedElement}' was not found in '${params.consumerComponentPath}'.`,
			),
		};
	}
	const importedModelType = readString(imported, "modelType");
	if (!importedModelType) {
		return {
			ok: false,
			result: failure(
				importedRead,
				"incomplete_chain",
				`Imported Parameter '${params.importedElement}' has no modelType metadata.`,
			),
		};
	}

	let base = importedRead;
	let candidatePaths: string[];
	if (params.exporterComponentPath) {
		candidatePaths = [normalizeAscetPath(params.exporterComponentPath)];
	} else {
		const search = await runAscetSearch(
			{ mode: "element", q: exportedElement, limit: PROVIDER_SEARCH_LIMIT },
			options,
		);
		base = search;
		const normalized = normalizeAscetSearchResult(
			{ mode: "element", q: exportedElement, limit: PROVIDER_SEARCH_LIMIT },
			search,
		);
		if (!normalized.ok)
			return { ok: false, result: failure(search, normalized.error.code, normalized.error.message) };
		if (normalized.data.more) {
			return {
				ok: false,
				result: failure(
					search,
					"provider_ambiguous",
					`Element Search for '${exportedElement}' exceeded the ${PROVIDER_SEARCH_LIMIT}-candidate validation limit.`,
				),
			};
		}
		candidatePaths = [
			...new Set(
				normalized.data.items.flatMap((item) => {
					if (typeof item !== "string") return [];
					const componentPath = parseAscetElementSearchHint(item, exportedElement);
					return componentPath ? [componentPath] : [];
				}),
			),
		];
	}

	const valid: string[] = [];
	for (const componentPath of candidatePaths) {
		const candidateRead = await runAscetReadElement({ componentPath, elementName: exportedElement }, options);
		const candidate = exactElement(candidateRead);
		if (!isParameterWithScope(candidate, "exported")) continue;
		const candidateModelType = readString(candidate, "modelType");
		if (!candidateModelType || candidateModelType.toLowerCase() !== importedModelType.toLowerCase()) continue;
		valid.push(componentPath);
	}

	if (valid.length === 0) {
		return {
			ok: false,
			result: failure(
				base,
				"provider_not_found",
				`No exact compatible Exported Parameter '${exportedElement}' was found.`,
			),
		};
	}
	if (valid.length > 1) {
		return {
			ok: false,
			result: failure(
				base,
				"provider_ambiguous",
				`Multiple compatible Exported Parameters named '${exportedElement}' were found.`,
				{
					candidates: valid.map((componentPath) => `${componentPath}\\${exportedElement}`),
				},
			),
		};
	}
	return { ok: true, componentPath: valid[0], elementName: exportedElement };
}

export async function runAscetReadDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetReadDependentChainResult> {
	if (params.exporterComponentPath) {
		return runAscetReadDependentChainMetadata(params, options);
	}

	const before = await readAscetDatabaseFingerprint(options);
	if (!before.ok) return before.result;

	const metadata = await runAscetReadDependentChainMetadata(params, options);
	if (!metadata.ok) return metadata;
	const importedName = extractImportedElementName(metadata);
	if (!importedName) {
		const payload = getPayload(metadata.data);
		const dependent = isRecord(payload?.dependent) ? payload.dependent : undefined;
		if (dependent && !isLocalDependentParameter(dependent)) {
			return failure(metadata, "not_dependent_chain", "Element is not a dependent chain target.", {
				componentPath: readString(payload, "component") ?? params.componentPath,
				dependentElement: readString(dependent, "name") ?? params.dependentElement,
			});
		}
		return failure(
			metadata,
			"incomplete_chain",
			"The dependency chain does not contain one exact Imported Parameter mapping.",
		);
	}

	const provider = await resolveExportedParameter(
		{ consumerComponentPath: params.componentPath, importedElement: importedName },
		options,
	);
	if (!provider.ok) return provider.result;

	const resolved = await runAscetReadDependentChainMetadata(
		{ ...params, exporterComponentPath: provider.componentPath },
		options,
	);
	if (!resolved.ok) return resolved;
	if (!isResolvedProvider(resolved, provider.componentPath, provider.elementName)) {
		return failure(
			resolved,
			"provider_incompatible",
			`Provider '${provider.componentPath}' did not validate as the Exported Parameter source for '${provider.elementName}'.`,
		);
	}

	const after = await readAscetDatabaseFingerprint(options);
	if (!after.ok) return after.result;
	if (before.fingerprint !== after.fingerprint) {
		return failure(resolved, "database_changed", "ASCET database changed during dependency-chain resolution.");
	}
	return resolved;
}

export function formatReadDependentChainResult(result: AscetReadDependentChainResult): string {
	return JSON.stringify(createDependentChainOutput(result));
}

export function createDependentChainOutput(result: AscetReadDependentChainResult): JsonRecord {
	if (!result.ok) {
		return createPublicDependentChainError(
			result.error?.code ?? "read_dependent_chain_failed",
			result.error?.message ?? "ASCET dependency-chain read failed.",
			result.error?.details,
		);
	}
	const payload = getPayload(result.data);
	if (!payload || payload.complete !== true) {
		const dependent = isRecord(payload?.dependent) ? payload.dependent : undefined;
		const componentPath = readString(payload, "component");
		const dependentElement = readString(dependent, "name");
		const isDependentParameter = isLocalDependentParameter(dependent);
		return createPublicDependentChainError(
			isDependentParameter ? "incomplete_chain" : "not_dependent_chain",
			isDependentParameter
				? "The existing dependency metadata is incomplete."
				: "Element is not a dependent chain target.",
			{ ...(componentPath ? { componentPath } : {}), ...(dependentElement ? { dependentElement } : {}) },
		);
	}
	const componentPath = readString(payload, "component");
	const dependent = isRecord(payload.dependent) ? payload.dependent : undefined;
	const dependentElement = readString(dependent, "name");
	const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
	const imported = new Set<string>();
	const importedElements = new Map<string, JsonRecord>();
	const exported = new Map<string, { owner: string; element: JsonRecord }>();
	for (const input of inputs) {
		if (!isRecord(input)) continue;
		if (isRecord(input.value)) {
			const name = readString(input.value, "name");
			if (name && readString(input.value, "scope")?.toLowerCase() === "imported") {
				imported.add(name);
				importedElements.set(name, input.value);
			}
		}
		if (isRecord(input.export) && input.export.exists === true) {
			const name = readString(input.export, "name");
			const owner = readString(input.export, "owner");
			if (name && owner && readString(input.export, "scope")?.toLowerCase() === "exported") {
				exported.set(`${owner.toLowerCase()}\u0000${name}`, { owner, element: input.export });
			}
		}
	}
	if (!componentPath || !dependentElement || imported.size !== 1 || exported.size !== 1) {
		return createPublicDependentChainError(
			"incomplete_chain",
			"The resolved dependency chain is not a single exact Local/Imported/Exported path.",
		);
	}
	const importedElement = [...imported][0];
	const exportedKey = [...exported.keys()][0];
	const separator = exportedKey.indexOf("\u0000");
	const exportedElement = exportedKey.slice(separator + 1);
	const provider = exported.get(exportedKey);
	const importedRecord = importedElements.get(importedElement);
	if (!provider || !importedRecord || !dependent) {
		return createPublicDependentChainError(
			"incomplete_chain",
			"The resolved dependency chain is missing Provider, Imported, or Local metadata.",
		);
	}
	const providerComponentPath = readString(payload, "exporter") ?? provider.owner;
	const dependencyFormula = isRecord(payload.dependencyFormula) ? payload.dependencyFormula : undefined;
	const binding = isRecord(payload.binding) ? payload.binding : deriveDependentChainBinding(payload);
	return {
		found: true,
		chain: {
			local: { componentPath, element: dependentElement },
			imported: { componentPath, element: importedElement },
			exported: { componentPath: providerComponentPath, element: exportedElement },
		},
		provider: { componentPath: providerComponentPath, element: provider.element },
		consumer: { componentPath, imported: importedRecord, local: dependent },
		...(dependencyFormula ? { dependencyFormula } : {}),
		...(binding ? { binding } : {}),
		complete: true,
	};
}

function createPublicDependentChainError(code: string, message: string, details?: unknown): JsonRecord {
	const detailRecord = isRecord(details) ? details : undefined;
	return {
		error: {
			code,
			message,
			...(detailRecord ?? {}),
		},
	};
}

function deriveDependentChainBinding(payload: JsonRecord): JsonRecord | undefined {
	const dependencyFormula = isRecord(payload.dependencyFormula) ? payload.dependencyFormula : undefined;
	const formula = readString(dependencyFormula, "code");
	const mappings = Array.isArray(dependencyFormula?.mappings) ? dependencyFormula.mappings : [];
	const unique = new Map<string, { formal: string; imported: string }>();
	for (const mapping of mappings) {
		if (!isRecord(mapping)) continue;
		const formal = readString(mapping, "formal");
		const imported = readString(mapping, "imported");
		if (formal && imported) unique.set(`${formal}\u0000${imported}`, { formal, imported });
	}
	if (!formula || unique.size !== 1) return undefined;
	const mapping = [...unique.values()][0];
	const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
	const variants = [
		...new Set(
			inputs.flatMap((input) => {
				if (!isRecord(input)) return [];
				const variant = readString(input, "variant");
				return variant ? [variant] : [];
			}),
		),
	];
	const nonDefaultVariants = variants.filter((variant) => variant.toLowerCase() !== "default");
	return {
		importedElement: mapping.imported,
		formula,
		formal: mapping.formal,
		variantPolicy: nonDefaultVariants.length === 0 ? "default" : "selected",
		...(nonDefaultVariants.length > 0 ? { variants: nonDefaultVariants } : {}),
	};
}

export async function runAscetReadDependentChainMetadata(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetCliJsonResult> {
	const primary = await runAscetCliJson(buildReadDependentChainArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_dependent_chain",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
	if (!shouldFallbackToDirectReads(primary)) return primary;
	return buildDirectReadFallback(params, options, primary);
}

export async function readAscetDatabaseFingerprint(
	options: RunAscetReadDependentChainOptions,
): Promise<{ ok: true; fingerprint: string } | { ok: false; result: AscetCliJsonResult }> {
	const result = await runAscetGet(
		{ action: "database_identity" },
		{
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			agentId: options.agentId,
			scheduler: options.scheduler,
			executeCli: options.executeCli,
		},
	);
	if (!result.ok) return { ok: false, result };
	const payload = getPayload(result.data);
	const identity = payload ? getAscetDatabaseIdentity(payload) : undefined;
	if (!identity) {
		return {
			ok: false,
			result: failure(result, "database_identity_required", "ASCET database identity is unavailable."),
		};
	}
	return { ok: true, fingerprint: identity.fingerprint };
}

function extractImportedElementName(result: AscetCliJsonResult): string | undefined {
	const payload = getPayload(result.data);
	const inputs = Array.isArray(payload?.inputs) ? payload.inputs : [];
	const names = new Set<string>();
	for (const input of inputs) {
		if (!isRecord(input) || !isRecord(input.value)) continue;
		const name = readString(input.value, "name");
		const scope = readString(input.value, "scope");
		if (name && scope?.toLowerCase() === "imported") names.add(name);
	}
	return names.size === 1 ? [...names][0] : undefined;
}

function exactElement(result: AscetCliJsonResult): JsonRecord | undefined {
	if (!result.ok) return undefined;
	const payload = getPayload(result.data);
	return isRecord(payload?.element) ? payload.element : undefined;
}

function isParameterWithScope(element: JsonRecord | undefined, scope: "imported" | "exported"): boolean {
	return (
		readString(element, "kind")?.toLowerCase() === "parameter" &&
		readString(element, "scope")?.toLowerCase() === scope
	);
}

function isLocalDependentParameter(element: JsonRecord | undefined): boolean {
	return (
		readString(element, "kind")?.toLowerCase() === "parameter" &&
		readString(element, "scope")?.toLowerCase() === "local" &&
		readString(element, "dependency")?.toLowerCase() === "dependent"
	);
}

function isResolvedProvider(result: AscetCliJsonResult, componentPath: string, elementName: string): boolean {
	const payload = getPayload(result.data);
	if (payload?.complete !== true) return false;
	const inputs = Array.isArray(payload.inputs) ? payload.inputs : [];
	return inputs.some((input) => {
		if (!isRecord(input) || !isRecord(input.export)) return false;
		return (
			input.export.exists === true &&
			readString(input.export, "name") === elementName &&
			readString(input.export, "scope")?.toLowerCase() === "exported" &&
			normalizeComparablePath(readString(input.export, "owner")) === normalizeComparablePath(componentPath)
		);
	});
}

function normalizeComparablePath(value: string | undefined): string {
	return value ? normalizeAscetPath(value).toLowerCase() : "";
}

function shouldFallbackToDirectReads(result: AscetCliJsonResult): boolean {
	return !result.ok && /ExportXMLToFile returned false/i.test(result.error?.message ?? "");
}

async function buildDirectReadFallback(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	primary: AscetCliJsonResult,
): Promise<AscetCliJsonResult> {
	const element = await runAscetReadElement(
		{ componentPath: params.componentPath, elementName: params.dependentElement },
		options,
	);
	const dependency = await runAscetReadElementDependency(
		{ componentPath: params.componentPath, elementName: params.dependentElement, targetKind: "component" },
		options,
	);
	if (!element.ok && !dependency.ok) return primary;

	const elementPayload = element.ok ? getPayload(element.data) : undefined;
	const dependencyPayload = dependency.ok ? getPayload(dependency.data) : undefined;
	const elementRecord = isRecord(elementPayload?.element) ? elementPayload.element : undefined;
	const dependencyMatches = Array.isArray(dependencyPayload?.matches)
		? dependencyPayload.matches
		: Array.isArray(dependencyPayload?.items)
			? dependencyPayload.items
			: [];
	const dependencyItem = dependencyMatches.find(isRecord);
	const formula = readString(dependencyItem, "formula");
	const issues = ["xml_export_failed"];
	if (!element.ok) issues.push("element_catalog_unavailable");
	if (!dependency.ok) issues.push("element_dependency_unavailable");
	if (formula === undefined) issues.push("dependency_formula_unavailable");
	else issues.push("dependency_formula_mapping_unverified");
	issues.push("provider_binding_unverified");
	const fallback = {
		component: params.componentPath,
		exporter: params.exporterComponentPath,
		direction: "forward",
		status: "partial",
		complete: false,
		dependent: {
			name: params.dependentElement,
			kind: readString(dependencyItem, "kind") ?? readString(elementRecord, "kind"),
			scope: readString(dependencyItem, "scope") ?? readString(elementRecord, "scope"),
			dependency: readString(dependencyItem, "dependency"),
			formula,
		},
		dependencyFormula: {
			exists: formula !== undefined,
			name: formula,
			expressionVerified: formula !== undefined,
			mappingVerified: false,
		},
		inputs: [],
		issues,
		fallback: {
			used: ["read_element", "read_element_dependency"],
			originalError: primary.error?.code ?? "ascet_cli_failed",
		},
	};
	const data = { ok: true, result: fallback };
	return {
		...primary,
		ok: true,
		data,
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
		stage: undefined,
		diagnostics: undefined,
		error: undefined,
	};
}

function failure(base: AscetCliJsonResult, code: string, message: string, details?: unknown): AscetCliJsonResult {
	return {
		...base,
		ok: false,
		data: null,
		stdout: "",
		stderr: "",
		exitCode: base.exitCode === 0 ? 1 : base.exitCode,
		error: { code, message, ...(details === undefined ? {} : { details }) },
	};
}

function getPayload(data: unknown): JsonRecord | undefined {
	const payload = unwrapToolSuccessPayload(data);
	return isRecord(payload) ? payload : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

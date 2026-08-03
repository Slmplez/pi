import {
	type AscetElementCatalogItem,
	type RunAscetReadElementCatalogOptions,
	runAscetReadElementCatalog,
	toElementDeclarationEntry,
} from "./read-element-catalog.ts";
import {
	type AscetFullElementCacheEntry,
	type AscetSearchIndexPartition,
	getAscetSearchIndexState,
	upsertAscetElementDeclarations,
	upsertAscetFullElements,
} from "./search-index.ts";

export interface RefreshElementsFromLiveCatalogParams {
	componentPath: string;
	names?: readonly string[];
	scopes?: readonly string[];
	reason: string;
	stale?: readonly AscetSearchIndexPartition[];
	followReferences?: boolean;
	maxReferenceDepth?: number;
}

export interface AscetElementIndexWritebackResult {
	updated: Array<"element_decls" | "full_element_cache">;
	stale: AscetSearchIndexPartition[];
	/**
	 * Present when a successful dependency write was followed by a complete
	 * SQLite generation refresh. The generation is the authoritative snapshot
	 * that contains element declarations, references, dependencies, messages,
	 * and code areas together.
	 */
	refresh?: {
		partition: "p0";
		generation: string;
		areas: string[];
	};
	elements: Array<{
		component: string;
		name: string;
		kind?: string;
		type?: string;
		scope?: string;
		path: string;
	}>;
	issues?: Array<{ code: string; message: string }>;
}

export async function refreshElementsFromLiveCatalog(
	params: RefreshElementsFromLiveCatalogParams,
	options: RunAscetReadElementCatalogOptions,
): Promise<AscetElementIndexWritebackResult> {
	const stale = [...(params.stale ?? [])];
	const result = await runAscetReadElementCatalog({ componentPath: params.componentPath }, options);
	if (!result.ok) {
		return {
			updated: [],
			stale,
			elements: [],
			issues: [
				{
					code: "indexReadbackFailed",
					message: result.error?.message ?? "read_element_catalog failed during index refresh.",
				},
			],
		};
	}

	const selected = await collectSelectedCatalogItems(params.componentPath, result.data, params, options, 0);
	if (selected.length === 0) {
		return {
			updated: [],
			stale,
			elements: [],
			issues: [
				{
					code: "indexReadbackEmpty",
					message: "read_element_catalog succeeded but no matching elements were found for index refresh.",
				},
			],
		};
	}

	const declarations = selected
		.map((entry) =>
			toElementDeclarationEntry(entry.componentPath, entry.item, findComponentMeta(entry.componentPath)),
		)
		.filter((entry) => entry !== undefined);
	const fullElements = selected
		.map((entry) => toFullElementCacheEntry(entry.componentPath, entry.item))
		.filter((entry) => entry !== undefined);

	upsertAscetElementDeclarations(declarations);
	upsertAscetFullElements(fullElements);

	return {
		updated: ["element_decls", "full_element_cache"],
		stale,
		elements: declarations.map((entry) => ({
			component: normalizeOutputPath(entry.componentPath),
			name: entry.elementName,
			kind: entry.elementKind || undefined,
			type: entry.displayType || undefined,
			scope: entry.displayScope || undefined,
			path: normalizeOutputPath(entry.path),
		})),
	};
}

async function collectSelectedCatalogItems(
	componentPath: string,
	data: unknown,
	params: Pick<RefreshElementsFromLiveCatalogParams, "names" | "scopes" | "followReferences" | "maxReferenceDepth">,
	options: RunAscetReadElementCatalogOptions,
	depth: number,
): Promise<Array<{ componentPath: string; item: AscetElementCatalogItem }>> {
	const direct = selectCatalogItems(data, params).map((item) => ({ componentPath, item }));
	if (direct.length > 0 || !params.followReferences) {
		return direct;
	}

	const maxDepth = Math.max(0, Math.trunc(params.maxReferenceDepth ?? 1));
	if (depth >= maxDepth) {
		return direct;
	}

	const referencedComponents = extractItems(data)
		.map((entry) => asString(entry.referencedComponentPath))
		.filter((entry) => entry.trim().length > 0);
	const selected: Array<{ componentPath: string; item: AscetElementCatalogItem }> = [];
	for (const referencedComponent of uniqueStrings(referencedComponents)) {
		const child = await runAscetReadElementCatalog({ componentPath: referencedComponent }, options);
		if (!child.ok) {
			continue;
		}
		selected.push(
			...(await collectSelectedCatalogItems(referencedComponent, child.data, params, options, depth + 1)),
		);
	}
	return selected;
}

function selectCatalogItems(
	data: unknown,
	params: Pick<RefreshElementsFromLiveCatalogParams, "names" | "scopes">,
): AscetElementCatalogItem[] {
	const items = extractItems(data);
	const names = new Set((params.names ?? []).map((name) => name.trim().toLowerCase()).filter(Boolean));
	const scopes = new Set((params.scopes ?? []).map((scope) => scope.trim().toLowerCase()).filter(Boolean));
	return items.filter((entry) => {
		const name = asString(entry.name).trim().toLowerCase();
		if (names.size > 0 && !names.has(name)) {
			return false;
		}
		const scope = asString(entry.scope).trim().toLowerCase();
		if (scopes.size > 0 && !scopes.has(scope)) {
			return false;
		}
		return name.length > 0;
	});
}

function extractItems(data: unknown): AscetElementCatalogItem[] {
	const payload = unwrapPayload(data);
	const elements = payload?.elements;
	return Array.isArray(elements) ? elements.filter(isRecord).map((entry) => ({ ...entry })) : [];
}

function toFullElementCacheEntry(
	componentPath: string,
	element: AscetElementCatalogItem,
): AscetFullElementCacheEntry | undefined {
	const name = asString(element.name);
	if (!name) {
		return undefined;
	}
	const normalizedComponent = normalizeOutputPath(componentPath);
	const kind = asString(element.kind);
	const type = asString(element.modelType) || kind;
	const scope = asString(element.scope);
	return {
		componentPath: normalizedComponent,
		name,
		kind,
		type,
		scope,
		path: `${normalizedComponent}/${name}`,
		source: "live_readback",
		updatedAtMs: Date.now(),
		data: { ...element },
	};
}

function findComponentMeta(componentPath: string) {
	const state = getAscetSearchIndexState();
	if (state.status !== "ready") {
		return undefined;
	}
	const normalized = normalizeForCompare(componentPath);
	return state.components.find((entry) => normalizeForCompare(entry.path) === normalized);
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

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function normalizeOutputPath(value: string): string {
	return value
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

function uniqueStrings(values: readonly string[]): string[] {
	return [...new Set(values.map((entry) => entry.trim()).filter(Boolean))];
}

function normalizeForCompare(value: string): string {
	return normalizeOutputPath(value).toLowerCase();
}

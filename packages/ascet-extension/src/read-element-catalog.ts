import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import type { AscetComponentSearchIndexEntry, AscetSearchIndexEntry } from "./search-index.ts";

export interface AscetReadElementCatalogParams {
	componentPath: string;
}

export interface RunAscetReadElementCatalogOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadElementCatalogResult = AscetCliJsonResult;
export type AscetElementCatalogItem = Record<string, unknown>;

export type AscetElementCatalogSelection =
	| { status: "found"; element: AscetElementCatalogItem; candidates: AscetElementCatalogItem[] }
	| { status: "not_found"; candidates: [] }
	| { status: "ambiguous"; candidates: AscetElementCatalogItem[] };

export function buildReadElementCatalogArgs(params: AscetReadElementCatalogParams): string[] {
	return ["exec", "read_element_catalog", normalizeAscetPath(params.componentPath), "--json"];
}

export async function runAscetReadElementCatalog(
	params: AscetReadElementCatalogParams,
	options: RunAscetReadElementCatalogOptions,
): Promise<AscetReadElementCatalogResult> {
	return runAscetCliJson(buildReadElementCatalogArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_element_catalog",
		jobKind: "read",
	});
}

export function formatReadElementCatalogResult(result: AscetReadElementCatalogResult): string {
	return formatAscetCliJsonResult("read_element_catalog", result);
}

export function extractElementCatalogItems(data: unknown): AscetElementCatalogItem[] {
	const payload = unwrapCatalogPayload(data);
	const elements = payload?.elements;
	if (!Array.isArray(elements)) {
		return [];
	}
	return elements.filter(isRecord).map((entry) => ({ ...entry }));
}

export function findCatalogElement(
	data: unknown,
	params: { name: string; scope?: string; kind?: string },
): AscetElementCatalogSelection {
	const name = normalizeKey(params.name);
	const scope = normalizeKey(params.scope);
	const kind = normalizeKey(params.kind);
	const candidates = extractElementCatalogItems(data).filter((entry) => {
		if (normalizeKey(asString(entry.name)) !== name) {
			return false;
		}
		if (scope && normalizeKey(asString(entry.scope)) !== scope) {
			return false;
		}
		if (kind && normalizeKey(asString(entry.kind)) !== kind) {
			return false;
		}
		return true;
	});

	if (candidates.length === 0) {
		return { status: "not_found", candidates: [] };
	}
	if (candidates.length === 1) {
		return { status: "found", element: candidates[0]!, candidates };
	}
	return { status: "ambiguous", candidates };
}

export function toElementDeclarationEntry(
	componentPath: string,
	element: AscetElementCatalogItem,
	component?: Pick<AscetComponentSearchIndexEntry, "kind" | "languageKind">,
): AscetSearchIndexEntry | undefined {
	const name = asString(element.name);
	if (!name) {
		return undefined;
	}
	const kind = asString(element.kind);
	const modelType = asString(element.modelType);
	const referencedComponentPath = normalizeOutputPath(asString(element.referencedComponentPath));
	const normalizedComponent = normalizeOutputPath(componentPath);
	return {
		group: referencedComponentPath ? "complex" : "primitive",
		componentPath: normalizedComponent,
		componentKind: component?.kind ?? "",
		componentLanguageKind: component?.languageKind ?? "",
		elementName: name,
		elementKind: kind,
		displayType: modelType || kind,
		displayScope: asString(element.scope),
		referencedComponentPath,
		path: `${normalizedComponent}/${name}`,
	};
}

function unwrapCatalogPayload(data: unknown): Record<string, unknown> | undefined {
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

function normalizeKey(value: string | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function normalizeOutputPath(value: string): string {
	return value
		.trim()
		.replace(/\\/g, "/")
		.replace(/^\/+|\/+$/g, "");
}

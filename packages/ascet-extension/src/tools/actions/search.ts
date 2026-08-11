import {
	type AscetActionCatalogEntry,
	createActionCatalogSnapshot,
	getActionCatalogEntry,
	getActionCatalogEntryById,
	listActionCatalogEntries,
} from "./catalog.ts";

export interface SearchActionParams {
	query?: string;
	tool?: string;
	name?: string;
	limit?: number;
	includeHidden?: boolean;
	detailLevel?: "summary" | "full";
}

export interface SearchActionItem {
	tool: string;
	action: string;
	intent: string;
	useWhen?: readonly string[];
	avoidWhen?: readonly string[];
	schema?: AscetActionCatalogEntry["schema"];
	schemaFingerprint?: string;
	rules?: readonly string[];
	fewShots?: AscetActionCatalogEntry["fewShots"];
	result?: AscetActionCatalogEntry["result"];
	nextActions?: readonly string[];
	visibility?: AscetActionCatalogEntry["visibility"];
	replacement?: string;
}

export interface SearchActionResult {
	total: number;
	items: SearchActionItem[];
	catalogFingerprint: string;
	catalogVersion: number;
}

function normalize(value: string | undefined): string {
	return (value ?? "").trim().toLowerCase();
}

function tokens(value: string | undefined): string[] {
	return normalize(value)
		.split(/[^a-z0-9]+/u)
		.filter(Boolean);
}

function scoreEntry(entry: AscetActionCatalogEntry, query: string): number {
	const normalizedQuery = normalize(query);
	if (!normalizedQuery) {
		return 1;
	}
	if (entry.id.toLowerCase() === normalizedQuery) {
		return 10_000;
	}
	if (`${entry.tool}.${entry.action}`.toLowerCase() === normalizedQuery) {
		return 10_000;
	}
	if (entry.action.toLowerCase() === normalizedQuery) {
		return 8_000;
	}
	if (entry.aliases.some((alias) => normalize(alias) === normalizedQuery)) {
		return 9_000;
	}

	let score = 0;
	const weighted = [
		[entry.id, 120],
		[entry.action, 100],
		[entry.compact, 80],
		[entry.intent, 70],
		[entry.aliases.join(" "), 60],
		[entry.tags.join(" "), 35],
		[entry.rules.join(" "), 20],
	] as const;
	for (const [text, weight] of weighted) {
		const normalizedText = normalize(text);
		if (normalizedText.includes(normalizedQuery)) {
			score += weight * 4;
		}
		const queryTokens = tokens(normalizedQuery);
		if (queryTokens.length) {
			score += queryTokens.filter((token) => normalizedText.includes(token)).length * weight;
		}
	}
	return score;
}

function toSearchItem(
	entry: AscetActionCatalogEntry,
	detailLevel: SearchActionParams["detailLevel"],
): SearchActionItem {
	const base = {
		tool: entry.tool,
		action: entry.action,
		intent: entry.intent,
		useWhen: entry.useWhen,
		avoidWhen: entry.avoidWhen.length ? entry.avoidWhen : undefined,
		schema: entry.schema,
		schemaFingerprint: entry.schemaFingerprint,
		rules: entry.rules,
		fewShots: entry.fewShots,
		result: entry.result,
		nextActions: entry.nextActions,
		visibility: entry.visibility === "public" ? undefined : entry.visibility,
		replacement: entry.deprecatedBy,
	};
	if (detailLevel === "summary") {
		return {
			tool: base.tool,
			action: base.action,
			intent: base.intent,
			schema: base.schema,
			schemaFingerprint: base.schemaFingerprint,
			result: base.result,
			replacement: base.replacement,
		};
	}
	return base;
}

function createSearchResult(params: SearchActionParams, total: number, items: SearchActionItem[]): SearchActionResult {
	const snapshot = createActionCatalogSnapshot({ includeHidden: params.includeHidden === true });
	return {
		total,
		items,
		catalogFingerprint: snapshot.catalogFingerprint,
		catalogVersion: snapshot.version,
	};
}

export function searchActionCatalog(params: SearchActionParams): SearchActionResult {
	const includeHidden = params.includeHidden === true;
	const detailLevel = params.detailLevel ?? "full";
	const limit = Math.max(1, Math.min(params.limit ?? 5, 50));
	if (params.tool && params.name) {
		const exact = getActionCatalogEntry(params.tool, params.name, { includeHidden });
		return createSearchResult(params, exact ? 1 : 0, exact ? [toSearchItem(exact, detailLevel)] : []);
	}
	const query = params.query ?? "";
	const exactById = getActionCatalogEntryById(query, { includeHidden });
	if (exactById) {
		return createSearchResult(params, 1, [toSearchItem(exactById, detailLevel)]);
	}
	const scored = listActionCatalogEntries({ includeHidden })
		.map((entry) => ({ entry, score: scoreEntry(entry, query) }))
		.filter((item) => item.score > 0)
		.sort((left, right) => right.score - left.score || left.entry.id.localeCompare(right.entry.id));
	return createSearchResult(
		params,
		scored.length,
		scored.slice(0, limit).map((item) => toSearchItem(item.entry, detailLevel)),
	);
}

function compactActionSearchValue(value: unknown, preserveKeys = false): unknown {
	if (value === null || value === undefined || value === "") {
		return undefined;
	}
	if (Array.isArray(value)) {
		const items = value
			.map((entry) => compactActionSearchValue(entry, preserveKeys))
			.filter((entry) => entry !== undefined);
		return items.length ? items : undefined;
	}
	if (typeof value !== "object") {
		return value;
	}
	const compacted: Record<string, unknown> = {};
	for (const [key, child] of Object.entries(value)) {
		const nextPreserveKeys = preserveKeys || key === "args" || key === "schema";
		const compactedChild = compactActionSearchValue(child, nextPreserveKeys);
		if (compactedChild === undefined) {
			continue;
		}
		compacted[key] = compactedChild;
	}
	return Object.keys(compacted).length ? compacted : undefined;
}

export function toActionSearchPayload(result: SearchActionResult): SearchActionResult {
	return {
		total: result.total,
		items: (compactActionSearchValue(result.items) as SearchActionItem[] | undefined) ?? [],
		catalogFingerprint: result.catalogFingerprint,
		catalogVersion: result.catalogVersion,
	};
}

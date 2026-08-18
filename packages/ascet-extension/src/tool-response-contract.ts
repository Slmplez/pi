import { createHash } from "node:crypto";

type JsonRecord = Record<string, unknown>;

export interface ToolErrorInput {
	code: string;
	message: string;
	recover?: string[];
	details?: unknown;
}

export interface HashSummaryInput {
	text: string;
	language?: string;
	lineCount?: number;
	byteCount?: number;
}

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function isZeroCountsRecord(value: JsonRecord): boolean {
	const entries = Object.values(value);
	return entries.length > 0 && entries.every((entry) => typeof entry === "number" && entry === 0);
}

function shouldNormalizeStringAsPath(key: string): boolean {
	const lower = key.toLowerCase();
	return (
		key === "path" ||
		key === "component" ||
		key === "project" ||
		key === "source" ||
		key === "target" ||
		lower.endsWith("path") ||
		lower.endsWith("component")
	);
}

function toCamelCaseKey(key: string): string {
	return /^[A-Z][A-Za-z0-9]*$/.test(key) ? `${key.charAt(0).toLowerCase()}${key.slice(1)}` : key;
}

function normalizeContractKey(key: string, record: JsonRecord): string | undefined {
	const normalizedInputKey = toCamelCaseKey(key);
	if (normalizedInputKey === "ok" || normalizedInputKey === "meta") {
		return undefined;
	}
	if (normalizedInputKey === "error" && record[key] == null) {
		return undefined;
	}
	if (
		normalizedInputKey === "parentPath" ||
		normalizedInputKey === "ownerKind" ||
		normalizedInputKey === "targetKind"
	) {
		return undefined;
	}
	if (
		normalizedInputKey === "displayName" &&
		(record.displayName === record.name ||
			record.displayName === record.elementName ||
			record.displayName === record.methodName)
	) {
		return undefined;
	}
	if (normalizedInputKey === "componentPath" || normalizedInputKey === "canonicalComponentPath") {
		return "component";
	}
	if (normalizedInputKey === "projectPath" || normalizedInputKey === "canonicalProjectPath") {
		return "project";
	}
	if (normalizedInputKey === "componentKind") {
		return "kind";
	}
	if (normalizedInputKey === "componentLanguageKind" || normalizedInputKey === "languageKind") {
		return "language";
	}
	if (normalizedInputKey === "elementName" || normalizedInputKey === "methodName") {
		return "name";
	}
	if (normalizedInputKey === "methodKind") {
		return "type";
	}
	if (normalizedInputKey === "displayType") {
		return "type";
	}
	if (normalizedInputKey === "elementKind" && record.displayType !== undefined) {
		return undefined;
	}
	if (normalizedInputKey === "elementKind") {
		return "type";
	}
	if (normalizedInputKey === "displayScope") {
		return "scope";
	}
	if (normalizedInputKey === "matches" || normalizedInputKey === "results") {
		return "items";
	}
	if (normalizedInputKey === "totalMatches" || normalizedInputKey === "count") {
		return "total";
	}
	if (normalizedInputKey === "recoveryActions") {
		return "recover";
	}
	return normalizedInputKey;
}

export function normalizeApiPath(path: string): string {
	return path.replace(/\\/g, "/");
}

export function compactObject<T = unknown>(value: T, key = ""): unknown {
	if (value === null || value === undefined) {
		return undefined;
	}
	if (typeof value === "string") {
		if (value === "") {
			return key === "text" || key === "code" || key === "body" ? "" : undefined;
		}
		return shouldNormalizeStringAsPath(key) ? normalizeApiPath(value) : value;
	}
	if (Array.isArray(value)) {
		return value.map((entry) => compactObject(entry, key)).filter((entry) => entry !== undefined);
	}
	if (!isRecord(value)) {
		return value;
	}
	if (key === "counts" && isZeroCountsRecord(value)) {
		return undefined;
	}

	const compacted: JsonRecord = {};
	for (const [rawKey, rawValue] of Object.entries(value)) {
		const normalizedKey = normalizeContractKey(rawKey, value);
		if (!normalizedKey) {
			continue;
		}
		const compactedValue = compactObject(rawValue, normalizedKey);
		if (compactedValue === undefined) {
			continue;
		}
		if (Object.hasOwn(compacted, normalizedKey)) {
			continue;
		}
		compacted[normalizedKey] = compactedValue;
	}

	if (Object.keys(compacted).length === 0) {
		return undefined;
	}
	return compacted;
}

export function createToolError(input: ToolErrorInput): { error: JsonRecord } {
	const error = compactObject({
		code: input.code,
		message: input.message,
		recover: input.recover,
		details: input.details,
	}) as JsonRecord | undefined;
	return { error: error ?? { code: input.code, message: input.message } };
}

export function createPagedResult<TItem>(
	items: TItem[],
	options: { total?: number; nextCursor?: string; limit?: number } = {},
): JsonRecord {
	return compactObject({
		total: options.total ?? items.length,
		items,
		nextCursor: options.nextCursor,
		limit: options.limit,
	}) as JsonRecord;
}

export function createHashSummary(input: HashSummaryInput): JsonRecord {
	const byteCount = input.byteCount ?? Buffer.byteLength(input.text, "utf8");
	const lineCount = input.lineCount ?? (input.text.length === 0 ? 0 : input.text.split(/\r\n|\r|\n/u).length);
	return compactObject({
		hash: createHash("sha256").update(input.text).digest("hex"),
		lineCount,
		byteCount,
		language: input.language,
	}) as JsonRecord;
}

export function unwrapToolSuccessPayload(data: unknown): unknown {
	if (isRecord(data) && data.ok === true && Object.hasOwn(data, "result")) {
		return data.result;
	}
	return data;
}

export function toToolSuccessPayload(data: unknown): unknown {
	const compacted = compactObject(unwrapToolSuccessPayload(data));
	return compacted ?? createPagedResult([]);
}

export function toToolFailurePayload(input: ToolErrorInput): { error: JsonRecord } {
	return createToolError(input);
}

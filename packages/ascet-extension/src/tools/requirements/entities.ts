export interface RequirementQueryEntities {
	requirementIds: string[];
	signals: string[];
	defects: string[];
	swims: string[];
	keywords: string[];
}

function unique(values: string[]): string[] {
	return Array.from(new Set(values.filter((value) => value.length > 0)));
}

export function extractRequirementQueryEntities(
	query: string | undefined,
	requirementId?: string,
	signal?: string,
): RequirementQueryEntities {
	const text = [query, requirementId, signal].filter((value): value is string => typeof value === "string").join(" ");
	const requirementIds = unique([
		...(requirementId ? [requirementId] : []),
		...Array.from(text.matchAll(/\b\d{4,9}\b/g)).map((match) => match[0]),
	]);
	const swims = unique(Array.from(text.matchAll(/\bSWIM-\d+\b/gi)).map((match) => match[0].toUpperCase()));
	const defects = requirementIds;
	const signals = unique([
		...(signal ? [signal] : []),
		...Array.from(text.matchAll(/\b[A-Za-z][A-Za-z0-9]*(?:\.[A-Za-z][A-Za-z0-9]*)+\b/g)).map((match) => match[0]),
		...Array.from(text.matchAll(/\b[A-Z][A-Za-z0-9]{3,}\b/g)).map((match) => match[0]),
	]);
	const keywords = unique(
		text
			.toLowerCase()
			.split(/[^a-z0-9_]+/g)
			.filter((token) => token.length >= 4 && !requirementIds.includes(token)),
	);

	return { requirementIds, signals, defects, swims, keywords };
}

export function signalFamily(signal: string): string {
	const parts = signal.split(".");
	if (parts.length <= 1) {
		return signal;
	}
	return parts.slice(0, -1).join(".");
}

export function normalizedText(value: string | undefined): string {
	return value?.toLowerCase() ?? "";
}

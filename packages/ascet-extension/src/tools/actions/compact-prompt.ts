import { listActionCatalogEntries } from "./catalog.ts";

export interface CompactActionGuideOptions {
	includeHidden?: boolean;
}

const familyOrder = ["ops", "search", "get", "read", "diff", "write"] as const;

function formatEntry(entry: ReturnType<typeof listActionCatalogEntries>[number]): string {
	return `- ${entry.id}: ${entry.compact}. Ex: ${entry.miniFewShot}`;
}

export function buildCompactToolPromptGuidelines(tool: string): string[] {
	return listActionCatalogEntries()
		.filter((entry) => entry.tool === tool && entry.visibility === "public")
		.map(formatEntry);
}

export function buildCompactActionGuide(options: CompactActionGuideOptions = {}): string[] {
	const entries = listActionCatalogEntries({ includeHidden: options.includeHidden }).filter(
		(entry) => entry.visibility === "public" || options.includeHidden === true,
	);
	const lines = [
		"ASCET action guide:",
		"Use these compact ASCET action descriptors to choose a tool action.",
		'If the right ASCET action is unclear or parameters are uncertain, call ascet_capabilities({action:"search_actions",query:"...",limit:3}) to get full schema, rules, and fewShot.',
		"search_actions searches ASCET tool actions, not ASCET model contents.",
	];
	for (const family of familyOrder) {
		const group = entries.filter((entry) => entry.family === family);
		if (group.length === 0) {
			continue;
		}
		lines.push(`${family}:`);
		lines.push(...group.map(formatEntry));
	}
	return lines;
}

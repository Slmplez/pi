import { ascetGetInstructions } from "../instructions/ascet-get.ts";
import { buildToolPromptGuidelines } from "../instructions/registry.ts";

const getInstructionGuidelines = ascetGetInstructions.flatMap((instruction) => [
	instruction.summary,
	...instruction.rules,
	...(instruction.fewShots ?? []),
]);

function uniqueGuidelines(guidelines: readonly string[]): string[] {
	return [...new Set(guidelines)];
}

export const ascetGetPrompt = {
	promptSnippet:
		"Get ASCET tree, stored database catalogs, elements, formulas, component references, BDE edges, import bindings, or database item references.",
	promptGuidelines: uniqueGuidelines([
		"Use tree as the primary navigation action. Use a known oid or exact path directly for downstream actions.",
		"Use database_catalog only with a complete stored full-database Tree and a non-empty include array. Elements and formulas remain bounded to a selected Component or Project.",
		"For stored output, use Pi find, grep, and read against the returned Observation paths. Do not call a separate ASCET search tool.",
		"Use import_binding only when the consumer, provider, and imported element are already known.",
		...buildToolPromptGuidelines({ tool: "ascet_get" }),
		...getInstructionGuidelines,
	]),
} as const;

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
		"Get live ASCET tree, elements, formulas, component references, BDE edges, import bindings, or database item references for a bounded target.",
	promptGuidelines: uniqueGuidelines([
		"Use tree as the primary navigation action. Use a known oid or exact path directly for downstream actions.",
		"Elements and formulas return the complete selected Component or Project catalog; do not request a global scan.",
		"For stored output, use Pi find, grep, and read against the returned Observation paths. Do not call a separate ASCET search tool.",
		"Use import_binding only when the consumer, provider, and imported element are already known.",
		...buildToolPromptGuidelines({ tool: "ascet_get" }),
		...getInstructionGuidelines,
	]),
} as const;

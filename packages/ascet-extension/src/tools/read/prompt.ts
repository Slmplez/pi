import { ascetReadInstructions } from "../instructions/ascet-read.ts";
import { buildToolPromptGuidelines } from "../instructions/registry.ts";

const readInstructionGuidelines = ascetReadInstructions.flatMap((instruction) => [
	instruction.summary,
	...instruction.rules,
	...(instruction.fewShots ?? []),
]);

function uniqueGuidelines(guidelines: readonly string[]): string[] {
	return [...new Set(guidelines)];
}

export const ascetReadPrompt = {
	promptSnippet: "Use ascet_read after resolving the ASCET component path.",
	promptGuidelines: uniqueGuidelines([
		"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
		'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
		"Use read_dependent_chain only after resolving the exact consuming component and dependent element; it performs one live read and does not discover providers across folders or the database.",
		"Use read_dependent_chain before set_element_dependency when you need to know the current provider chain.",
		...buildToolPromptGuidelines({ tool: "ascet_read" }),
		...readInstructionGuidelines,
	]),
} as const;

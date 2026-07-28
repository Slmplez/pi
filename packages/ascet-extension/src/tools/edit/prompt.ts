import { ascetEditInstructions } from "../instructions/ascet-edit.ts";
import { buildToolPromptGuidelines } from "../instructions/registry.ts";

const legacyEditGuidelines = ascetEditInstructions
	.filter((instruction) => instruction.tool === "ascet_edit")
	.flatMap((instruction) => [
		instruction.summary,
		...instruction.rules,
		...("fewShots" in instruction ? (instruction.fewShots ?? []) : []),
	]);

function uniqueGuidelines(guidelines: readonly string[]): string[] {
	return [...new Set(guidelines)];
}

export const ascetEditPrompt = {
	promptSnippet:
		"Prepare or confirm one ASCET edit action, including component editability checks and SCM lock requests.",
	promptGuidelines: uniqueGuidelines([
		"Use action for model mutations and mode='check' or mode='set' for component editability.",
		"Run mutations without executeWrite first to obtain a preflight plan.",
		"Use mode='check' before source-controlled edits when editability is uncertain.",
		"Use mode='set' with executeWrite=true only after the user explicitly requests an ASCET SCM lock.",
		...buildToolPromptGuidelines({ tool: "ascet_edit" }),
		...legacyEditGuidelines,
	]),
} as const;

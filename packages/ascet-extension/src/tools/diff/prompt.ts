import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetDiffPrompt = {
	promptSnippet: "Compare resolved ASCET targets; use ascet_capabilities for full action rules.",
	promptGuidelines: buildCompactToolPromptGuidelines("ascet_diff"),
} as const;

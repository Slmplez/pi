import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetEditPrompt = {
	promptSnippet: "Preflight or execute one exact ASCET edit; use ascet_capabilities for full action rules.",
	promptGuidelines: buildCompactToolPromptGuidelines("ascet_edit"),
} as const;

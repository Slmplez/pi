import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetGetPrompt = {
	promptSnippet: "Read one exact ASCET target; use ascet_search for name or text discovery.",
	promptGuidelines: buildCompactToolPromptGuidelines("ascet_get"),
} as const;

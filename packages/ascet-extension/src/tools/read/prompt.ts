import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetReadPrompt = {
	promptSnippet:
		"Read one exact ASCET target deeply after bounded discovery; use ascet_capabilities for full action rules.",
	promptGuidelines: buildCompactToolPromptGuidelines("ascet_read"),
} as const;

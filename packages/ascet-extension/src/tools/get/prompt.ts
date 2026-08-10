import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetGetPrompt = {
	promptSnippet:
		"Get one bounded ASCET structure or stored observation; use ascet_capabilities for full action rules.",
	promptGuidelines: buildCompactToolPromptGuidelines("ascet_get"),
} as const;

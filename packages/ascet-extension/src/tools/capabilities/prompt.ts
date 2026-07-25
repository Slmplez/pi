import { compactExamplesForTool } from "../_shared/action-examples.ts";
import { buildCompactActionGuide } from "../actions/compact-prompt.ts";

export const ascetCapabilitiesPrompt = {
	promptSnippet: "Discover ASCET tool actions before choosing a read, search, compare, verify, or write action.",
	promptGuidelines: [
		"Use ascet_capabilities.search_actions when selecting the right ASCET action is unclear.",
		"Initial action guide is compact; call search_actions for full schema, rules, fewShot, and result shape.",
		...compactExamplesForTool("ascet_capabilities"),
		...buildCompactActionGuide(),
	],
} as const;

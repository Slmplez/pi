import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetSearchPrompt = {
	promptSnippet:
		"Search ASCET with bounded actions: search_components, resolve_component, search_elements, or search_occurrences.",
	promptGuidelines: [
		"Prefer exact matches and bounded componentPath or scopePath filters.",
		"Use resolve_component when a later read, reference, diff, verify, or write action needs one concrete componentPath.",
		"Use componentPath for a concrete component like DEMO\\PID; use scopePath only for folder scopes like DEMO.",
		"Before broad occurrence searches, narrow with resolve_component, search_components, componentPath, or scopePath whenever the user gave any component or folder clue.",
		"Use cursor paging instead of large limits for broad searches; repeat the same action and filters with nextCursor until searchComplete=true.",
		"Unscoped search_occurrences can scan only a partial component page; truncated=true or searchComplete=false means the result is not exhaustive.",
		"Do not claim an element/component has no occurrences unless the relevant search result has searchComplete=true for the requested scope.",
		...compactExamplesForTool("ascet_search"),
	],
} as const;

export const ascetSearchPrompt = {
	promptSnippet: "Search ASCET with bounded actions: search_components, search_elements, or search_occurrences.",
	promptGuidelines: [
		"Prefer exact matches and bounded componentPath or scopePath filters.",
		"Use componentPath for a concrete component like DEMO\\PID; use scopePath only for folder scopes like DEMO.",
		"Use cursor paging instead of large limits for broad searches.",
	],
} as const;

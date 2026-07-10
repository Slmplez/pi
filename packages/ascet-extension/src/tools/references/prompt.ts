export const ascetReferencesPrompt = {
	promptSnippet: "Inspect references with element_refs, component_refs, or used_by actions.",
	promptGuidelines: [
		"Prefer element_refs for a known element before broad component_refs scans.",
		"Use used_by only with a bounded scopePath and small limit.",
	],
} as const;

export const ascetComparePrompt = {
	promptSnippet:
		"Compare ASCET targets with component_snapshot, method, element_spec, project_formulas, or state_machine_domain.",
	promptGuidelines: [
		"Use changesOnly=true for compact results when full unchanged sections are not needed.",
		"Resolve both sides before comparing ambiguous component or project names.",
	],
} as const;

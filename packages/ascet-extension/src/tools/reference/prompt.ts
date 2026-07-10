export const ascetReferencePrompt = {
	promptSnippet: "Use ascet_reference after resolving the component path and narrowing the scope.",
	promptGuidelines: [
		"Use component_refs for outbound component dependency inspection.",
		"Use used_by with a bounded scopePath for reverse dependency checks.",
		"Use element_refs for references to one known element inside a component.",
	],
} as const;

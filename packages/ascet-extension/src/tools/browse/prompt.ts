export const ascetBrowsePrompt = {
	promptSnippet: "Browse ASCET structure with actions such as folders, components, children, methods, and diagrams.",
	promptGuidelines: [
		"Use ascet_browse for navigation before deeper reads.",
		"Keep depth and limit bounded; use narrower component paths when possible.",
	],
} as const;

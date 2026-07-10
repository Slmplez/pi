export const ascetResolvePrompt = {
	promptSnippet: "Resolve a component query to a concrete ASCET component candidate.",
	promptGuidelines: [
		"Use ascet_resolve when a user gives a name but not a full ASCET path.",
		"Prefer match='exact' when the requested name is exact.",
	],
} as const;

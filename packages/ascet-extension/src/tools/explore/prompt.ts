export const ascetExplorePrompt = {
	promptSnippet: "Use ascet_explore for navigation and target inspection before deeper reads or writes.",
	promptGuidelines: [
		"Use list_components to browse folder contents.",
		"Use resolve_target when a user gives a component name but not a full path.",
		"Use inspect_target or preview_children before selecting exact read, reference, diff, or write actions.",
	],
} as const;

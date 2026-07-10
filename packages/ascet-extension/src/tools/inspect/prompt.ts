export const ascetInspectPrompt = {
	promptSnippet: "Inspect a resolved ASCET target with summary, children, project_formulas, or block_diagram actions.",
	promptGuidelines: [
		"Use summary before broad child or diagram reads unless the user asks for a specific view.",
		"Use project_formulas only for project targets.",
	],
} as const;

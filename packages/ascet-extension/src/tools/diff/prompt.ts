export const ascetDiffPrompt = {
	promptSnippet: "Use ascet_diff for read-only ASCET comparisons after resolving both targets.",
	promptGuidelines: [
		"Use diff for generic component comparison.",
		"Use objectKind when the target kind is known so the specific class, module, or state-machine diff is used.",
		"Use diff_method for one method body.",
		"Use changesOnly=true when unchanged sections are not needed.",
	],
} as const;

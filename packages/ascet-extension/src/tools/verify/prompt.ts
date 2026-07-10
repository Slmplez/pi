export const ascetVerifyPrompt = {
	promptSnippet: "Verify ASCET readback after writes or when checking live state.",
	promptGuidelines: [
		"Use componentPath for class, module, or state-machine readback.",
		"Use projectPath only when objectKind is project.",
	],
} as const;

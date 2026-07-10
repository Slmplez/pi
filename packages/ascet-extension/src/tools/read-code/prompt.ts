export const ascetReadCodePrompt = {
	promptSnippet: "Read code with action='method', action='component', or action='text'.",
	promptGuidelines: [
		"Prefer action='method' for small targeted reads when the method name is known.",
		"Use action='component' only when a broad component code read is necessary.",
	],
} as const;

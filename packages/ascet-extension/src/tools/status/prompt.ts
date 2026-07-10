export const ascetStatusPrompt = {
	promptSnippet: "Check ASCET runtime availability and paths",
	promptGuidelines: [
		"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
		"Treat missing ASCET CLI or contract catalog as a setup issue, not as an ASCET model failure.",
	],
} as const;

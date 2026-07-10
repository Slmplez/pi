export const ascetWritePrompt = {
	promptSnippet: "Prepare or confirm one ASCET write action such as create, delete, set code, or apply spec.",
	promptGuidelines: [
		"By default this tool returns a non-error preflight outcome and does not write.",
		"Set executeWrite=true only when the user explicitly asks to apply the write; PI still requires confirmation.",
		"Use verifyReadback=true unless the user explicitly asks to skip readback.",
	],
} as const;

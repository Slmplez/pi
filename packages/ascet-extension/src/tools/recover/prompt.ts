export const ascetRecoverPrompt = {
	promptSnippet: "Check ASCET extension recovery status or clear extension-owned temp files.",
	promptGuidelines: [
		"Use action='status' before recovery if the failure mode is unclear.",
		"Only clear extension-owned temp files; this tool must not kill ASCET GUI or user-owned ToolAPI processes.",
	],
} as const;

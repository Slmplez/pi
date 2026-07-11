export const ascetReadPrompt = {
	promptSnippet: "Use ascet_read after resolving the ASCET component path.",
	promptGuidelines: [
		"Use read for lean summaries, or read with methodName for one method body.",
		"Use read_code when the user explicitly needs code text; this maps to logical AscetReadCode.",
		"Use read_block_diagram and read_state_machine_flow only after confirming the target kind.",
		"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
	],
} as const;

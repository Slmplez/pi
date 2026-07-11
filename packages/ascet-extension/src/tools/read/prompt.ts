export const ascetReadPrompt = {
	promptSnippet: "Use ascet_read after resolving the ASCET component path.",
	promptGuidelines: [
		"Use read for lean summaries, or read with methodName for one method body.",
		"Use read_code when the user explicitly needs code text; this maps to logical AscetReadCode.",
		"Use read_block_diagram and read_state_machine_flow only after confirming the target kind.",
		"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
		"Use read_import_export_match for one imported element's exported counterpart between importer/exporter components.",
		"Use read_import_export_matches to inspect all imported elements between an importer and exporter component.",
		"Use plan_element_dependency before dependency writes when the target scope is broad or uncertain.",
	],
} as const;

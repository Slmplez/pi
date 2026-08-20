import { buildCompactToolPromptGuidelines } from "../actions/compact-prompt.ts";

export const ascetEditPrompt = {
	promptSnippet: "Preflight or execute one exact ASCET edit; use ascet_capabilities for full action rules.",
	promptGuidelines: [
		...buildCompactToolPromptGuidelines("ascet_edit"),
		"apply_element_spec formula context: an absent formula or trim/case-insensitive ident is an ASCET built-in and does not require projectPath; every other formula requires one explicit projectPath. Never infer <component folder>\\Project.",
		"When apply_element_spec omits projectPath for a non-ident formula, the public tool returns ascet_edit_project_context_required before Bridge dispatch; direct Bridge callers receive project_context_required.",
	],
} as const;

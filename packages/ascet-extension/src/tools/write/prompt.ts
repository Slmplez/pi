import { buildToolPromptGuidelines } from "../instructions/registry.ts";

export const ascetWritePrompt = {
	promptSnippet: "Prepare or confirm one ASCET write action such as create, delete, set code, or apply spec.",
	promptGuidelines: buildToolPromptGuidelines({ tool: "ascet_write" }),
} as const;

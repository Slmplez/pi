import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetStatusPrompt = {
	promptSnippet: "Check ASCET installation paths and live ToolAPI runtime availability",
	promptGuidelines: [
		"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
		"Treat missing ASCET CLI or contract catalog as a setup issue, not as an ASCET model failure.",
		"Treat a failed runtime probe as live ASCET/ToolAPI unavailable even when installation checks pass.",
		...compactExamplesForTool("ascet_status"),
	],
} as const;

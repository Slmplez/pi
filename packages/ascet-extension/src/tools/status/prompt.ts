import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetStatusPrompt = {
	promptSnippet: "Check ASCET installation, DLL, live ToolAPI, and scheduler availability",
	promptGuidelines: [
		"Use ascet_status before calling other ASCET tools when runtime availability is uncertain.",
		"Treat missing ASCET CLI, contract catalog, or Etas.AscetNET.dll as a setup issue.",
		"Treat a failed live ToolAPI probe as runtime unavailable even when installation checks pass.",
		"Use ascet_scheduler_status for detailed queue, CLI lock, and operation-health diagnostics.",
		...compactExamplesForTool("ascet_status"),
	],
} as const;

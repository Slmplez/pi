import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetRecoverPrompt = {
	promptSnippet: "Check ASCET extension recovery status or clear extension-owned temp files.",
	promptGuidelines: [
		"Use action='status' before recovery if the failure mode is unclear.",
		"Use scheduler_status or scheduler_recover for queue, lock, and operation-health diagnostics.",
		"Only clear extension-owned temp files; this tool must not kill ASCET GUI or user-owned ToolAPI processes.",
		...compactExamplesForTool("ascet_recover"),
	],
} as const;

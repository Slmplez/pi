import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetSchedulerStatusPrompt = {
	promptSnippet: "Inspect ASCET runtime scheduler queue, PI CLI lock, and operation health.",
	promptGuidelines: [
		"Use ascet_scheduler_status when ASCET tools appear stuck, queued, degraded, or timing out.",
		"Use action='recover' only for safe scheduler recovery; it does not kill user-owned ASCET GUI processes.",
		...compactExamplesForTool("ascet_scheduler_status"),
	],
} as const;

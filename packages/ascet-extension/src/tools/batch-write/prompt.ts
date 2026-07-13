import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetBatchWritePrompt = {
	promptSnippet: "Prepare or confirm a guarded ASCET batch write.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Set executeWrite=true only after the user explicitly approves the batch write.",
		"Keep request batches small and homogeneous; ASCET live access remains sequential.",
		...compactExamplesForTool("ascet_batch_write"),
	],
} as const;

import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetBatchWritePrompt = {
	promptSnippet: "Prepare or confirm a guarded ASCET batch write.",
	promptGuidelines: [
		"By default this tool returns a preflight summary and does not write.",
		"Set executeWrite=true only after the user explicitly approves the batch write.",
		"Keep request batches small and homogeneous; ASCET live access remains sequential.",
		"For batch_create_component, omitted language defaults to ESDL for class and module targets; statemachine targets do not need language.",
		"For batch_create_method, provide componentKind when omitting methodKind. componentKind=class defaults to abstract and componentKind=module defaults to process; statemachine targets require explicit action, condition, or trigger.",
		"Batch writes may return partial success. Inspect per-request failures and verify exact touched targets before claiming the whole batch succeeded.",
		...compactExamplesForTool("ascet_batch_write"),
	],
} as const;

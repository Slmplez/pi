import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetBatchWritePrompt = {
	promptSnippet: "Prepare or confirm a guarded ASCET batch write.",
	promptGuidelines: [
		"Use intent=preview for non-mutating authoritative preflight.",
		"Use intent=apply once; the same call performs permission evaluation, optional approval, execution, and readback.",
		"Keep request batches small and homogeneous; ASCET live access remains sequential.",
		"For batch_create_component, omitted language defaults to ESDL for class and module targets; statemachine targets do not need language.",
		"For batch_create_method, provide componentKind when omitting methodKind. componentKind=class defaults to abstract and componentKind=module defaults to process; statemachine targets require explicit action, condition, or trigger.",
		"For batch_set_element_spec/apply_element_spec requests, follow the same element-spec contract as ascet_edit: physicalRange and impl.implementationRange are mutually exclusive, discrete exported/local parameter range writes require impl.limitAssignments=true, real32/real64 implementations must omit that option, and imported parameters must not include data, physicalRange, or impl settings.",
		"Batch writes may return partial success. Inspect per-request failures and verify exact touched targets before claiming the whole batch succeeded.",
		...compactExamplesForTool("ascet_batch_write", { includeHidden: true }),
	],
} as const;

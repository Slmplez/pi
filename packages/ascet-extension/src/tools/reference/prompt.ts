import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetReferencePrompt = {
	promptSnippet: "Use ascet_reference after resolving the component path and narrowing the scope.",
	promptGuidelines: [
		"Use component_refs for outbound component dependency inspection.",
		"Use used_by with a bounded scopePath for reverse dependency checks.",
		"Use element_refs for references to one known element inside a component.",
		"Use ascet_read for direct content such as code, implementation, block diagrams, or state-machine flow; use ascet_reference only for relation evidence.",
		...compactExamplesForTool("ascet_reference"),
	],
} as const;

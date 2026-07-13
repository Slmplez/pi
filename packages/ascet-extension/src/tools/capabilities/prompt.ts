import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetCapabilitiesPrompt = {
	promptSnippet: "Discover available ASCET operations before choosing a read, compare, verify, or write action.",
	promptGuidelines: [
		"Use ascet_capabilities when selecting the right ASCET operation for an unfamiliar task.",
		"Prefer family and operationQuery filters instead of dumping the full catalog.",
		...compactExamplesForTool("ascet_capabilities"),
	],
} as const;

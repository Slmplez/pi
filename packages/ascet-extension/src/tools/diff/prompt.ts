import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetDiffPrompt = {
	promptSnippet: "Use ascet_diff for read-only ASCET comparisons after resolving both targets.",
	promptGuidelines: [
		"Use diff for generic component comparison.",
		"Use diff with objectKind=class/module/statemachine for detailed semantic diffs with method and implementation details.",
		"Use diff_component_snapshot only for quick child snapshot comparison; do not use it when method code or element signatures are required.",
		"Use diff_method for one method body.",
		"Use diff_project_formulas only for Project targets.",
		"Use diff_state_machine_domain only for StateMachine targets.",
		"Use changesOnly=true when unchanged sections are not needed.",
		...compactExamplesForTool("ascet_diff"),
	],
} as const;

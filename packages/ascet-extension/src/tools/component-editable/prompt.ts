import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetComponentEditablePrompt = {
	promptSnippet:
		"Check or request ASCET SCM editable state for a component. Successful content is Agent-friendly JSON with editable.",
	promptGuidelines: [
		"Use mode='check' before editing a source-controlled ASCET component when editability is uncertain.",
		"Use mode='set' only when the user intends to make the component editable; like ascet_write, set executeWrite=true only when the user explicitly asks to apply the write.",
		"mode='set' without executeWrite=true is a non-executing permission gate; with executeWrite=true PI still requires interactive confirmation.",
		"Interpret editable=true as editable and editable=false as not editable after the check or lock attempt.",
		"Do not expect an {ok, action, data} envelope from this tool; successful tool content is the effective result.",
		...compactExamplesForTool("ascet_component_editable"),
	],
} as const;

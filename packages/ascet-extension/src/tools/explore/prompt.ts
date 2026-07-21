import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetExplorePrompt = {
	promptSnippet: "Use ascet_explore for navigation and target inspection before deeper reads or writes.",
	promptGuidelines: [
		"Use list_components to browse folder contents.",
		"Use ascet_search.resolve_component when the user gives a component name but not a full path; use ascet_explore after a path is known.",
		"Use inspect_target or preview_children before selecting exact read, reference, diff, or write actions.",
		"For dependent-parameter provider discovery, use list_components recursively from the feature scope when parameter classes may be nested under _Calibration, _Constant, or other parameter folders.",
		"Use preview_children on each candidate parameter class to verify that the target parameter exists with scope=Exported.",
		"Provider class names are only container hints. A provider is valid only when the candidate component contains the same-named Exported Parameter.",
		"Use inspect_target or preview_children before passing a discovered provider path as exporterComponentPath to read_dependent_chain.",
		...compactExamplesForTool("ascet_explore"),
	],
} as const;

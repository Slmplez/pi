import { buildToolPromptGuidelines } from "../instructions/registry.ts";

export const ascetExplorePrompt = {
	promptSnippet: "Use ascet_explore only to browse a known ASCET folder tree.",
	promptGuidelines: buildToolPromptGuidelines({
		tool: "ascet_explore",
		extraGuidelines: [
			"Use list_components to browse direct or recursive folder contents, including folder entries and item type/language metadata.",
			"Use ascet_search.resolve_component when the user gives a component name but not a full path. Use ascet_read for component contents after a path is known.",
		],
	}),
} as const;

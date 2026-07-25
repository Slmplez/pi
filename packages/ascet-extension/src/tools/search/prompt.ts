import { formatQuickSearchUiMappingGuidelines } from "../../quick-search-ui-mapping.ts";
import { buildToolPromptGuidelines } from "../instructions/registry.ts";

export const ascetSearchPrompt = {
	promptSnippet:
		"Search ASCET with bounded actions: search_components, resolve_component, search_elements, references_to_component, references_to_element, or text_in_code.",
	promptGuidelines: buildToolPromptGuidelines({
		tool: "ascet_search",
		extraGuidelines: [
			"Prefer exact matches and bounded componentPath or scopePath filters.",
			"Use cursor paging instead of large limits for broad searches; repeat the same action and filters with nextCursor until searchComplete=true.",
			"For dependent-parameter provider discovery, search candidate parameter provider classes before broad project-wide element scans.",
			"Start provider discovery within the same feature scope as the consuming component. Escalate to parent or project scope only when the feature scope is exhausted, incomplete, or ambiguous.",
			...formatQuickSearchUiMappingGuidelines(),
		],
	}),
} as const;

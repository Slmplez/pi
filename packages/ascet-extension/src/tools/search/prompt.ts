import { compactExamplesForTool } from "../_shared/action-examples.ts";

export const ascetSearchPrompt = {
	promptSnippet:
		"Search ASCET with bounded actions: search_components, resolve_component, search_elements, or search_occurrences.",
	promptGuidelines: [
		"Prefer exact matches and bounded componentPath or scopePath filters.",
		"Use resolve_component when a later read, reference, diff, verify, or write action needs one concrete componentPath.",
		"Use componentPath for a concrete component like DEMO\\PID; use scopePath only for folder scopes like DEMO.",
		"Before broad occurrence searches, narrow with resolve_component, search_components, componentPath, or scopePath whenever the user gave any component or folder clue.",
		"Use cursor paging instead of large limits for broad searches; repeat the same action and filters with nextCursor until searchComplete=true.",
		"Unscoped search_occurrences can scan only a partial component page; truncated=true or searchComplete=false means the result is not exhaustive.",
		"Do not claim an element/component has no occurrences unless the relevant search result has searchComplete=true for the requested scope.",
		"For dependent-parameter provider discovery, search candidate parameter provider classes before broad project-wide element scans.",
		"Start provider discovery within the same feature scope as the consuming component. Escalate to parent or project scope only when the feature scope is exhausted, incomplete, or ambiguous.",
		"Search candidate provider components recursively using bounded queries such as _Calibration, _Constant, Calibration, Constant, and parameter.",
		'For each candidate provider component, search_elements with match="exact" using the Imported Parameter name. The Imported Parameter and Exported Parameter must be same-named.',
		"Only scope=Exported search_elements results are valid provider candidates. Ignore Local and Imported results as provider endpoints.",
		"When multiple exported provider candidates remain, prefer same feature scope, then provider role match: calibration parameters in Calibration parameter classes; fixed non-calibration parameters in Constant parameter classes.",
		"Do not resolve provider ambiguity by name similarity alone. Require exact element name, scope=Exported, plausible provider class, and matching metadata evidence.",
		...compactExamplesForTool("ascet_search"),
	],
} as const;

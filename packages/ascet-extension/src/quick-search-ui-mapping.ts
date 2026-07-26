export type AscetQuickSearchUiMode =
	| "components"
	| "declarations_of_component"
	| "references_to_component"
	| "declarations_of_method_process"
	| "references_to_method_process"
	| "declarations_of_method_process_element"
	| "declarations_of_element"
	| "references_to_element"
	| "senders_of_message"
	| "receivers_of_message"
	| "text_in_esdl_or_c_code";

export type AscetQuickSearchCoverage = "index" | "api_fallback";

export interface AscetQuickSearchPreferredAction {
	tool: "ascet_search" | "ascet_read" | "ascet_explore";
	action: string;
	indexFastPath: boolean;
}

export interface AscetQuickSearchUiMapping {
	mode: AscetQuickSearchUiMode;
	label: string;
	coverage: AscetQuickSearchCoverage;
	preferredAction: AscetQuickSearchPreferredAction;
	requiredContext: string[];
	fallbackReason: string;
}

const QUICK_SEARCH_UI_MAPPINGS: readonly AscetQuickSearchUiMapping[] = [
	{
		mode: "components",
		label: "Components",
		coverage: "index",
		preferredAction: { tool: "ascet_search", action: "search_components", indexFastPath: true },
		requiredContext: [],
		fallbackReason: "Component declarations use the warmed component index when available.",
	},
	{
		mode: "declarations_of_component",
		label: "Declarations of component",
		coverage: "index",
		preferredAction: { tool: "ascet_search", action: "search_components", indexFastPath: true },
		requiredContext: [],
		fallbackReason: "Component declarations resolve through the warmed component index when available.",
	},
	{
		mode: "references_to_component",
		label: "References to component",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "references_to_component", indexFastPath: false },
		requiredContext: ["componentPath", "scopePath"],
		fallbackReason:
			"Component references use the search occurrence fallback until the component_refs partition is available.",
	},
	{
		mode: "declarations_of_method_process",
		label: "Declarations of method/process",
		coverage: "index",
		preferredAction: { tool: "ascet_search", action: "declarations_of_method_process", indexFastPath: true },
		requiredContext: [],
		fallbackReason: "Method and process declarations are included in the warmed element index when available.",
	},
	{
		mode: "references_to_method_process",
		label: "References to method/process",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "text_in_code", indexFastPath: true },
		requiredContext: ["componentPath"],
		fallbackReason:
			"Dedicated method/process references are not public yet; use text_in_code as a scoped code-reference search when needed.",
	},
	{
		mode: "declarations_of_method_process_element",
		label: "Declarations of method/process element",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "declarations_of_method_process_element", indexFastPath: true },
		requiredContext: ["componentPath", "methodName"],
		fallbackReason: "Method/process arguments and locals use the warmed element declaration index when available.",
	},
	{
		mode: "declarations_of_element",
		label: "Declarations of element",
		coverage: "index",
		preferredAction: { tool: "ascet_search", action: "declarations_of_element", indexFastPath: true },
		requiredContext: [],
		fallbackReason: "Element declarations are the primary warmed-index fast path.",
	},
	{
		mode: "references_to_element",
		label: "References to element",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "references_to_element", indexFastPath: false },
		requiredContext: ["componentPath", "elementName"],
		fallbackReason:
			"Element references use text/diagram occurrence fallback until the element_refs partition is available.",
	},
	{
		mode: "senders_of_message",
		label: "Senders of message",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "senders_of_message", indexFastPath: false },
		requiredContext: ["componentPath"],
		fallbackReason:
			"Message direction is not indexed yet; search references to the message element and verify sender direction from live code.",
	},
	{
		mode: "receivers_of_message",
		label: "Receivers of message",
		coverage: "api_fallback",
		preferredAction: { tool: "ascet_search", action: "receivers_of_message", indexFastPath: false },
		requiredContext: ["componentPath"],
		fallbackReason:
			"Message direction is not indexed yet; search references to the message element and verify receiver direction from live code.",
	},
	{
		mode: "text_in_esdl_or_c_code",
		label: "Text in ESDL or C code",
		coverage: "index",
		preferredAction: { tool: "ascet_search", action: "text_in_code", indexFastPath: true },
		requiredContext: [],
		fallbackReason:
			"ESDL/C text snippets use the warmed text-code index when available, with scoped read_code fallback by componentPath.",
	},
] as const;

export function listAscetQuickSearchUiMappings(): readonly AscetQuickSearchUiMapping[] {
	return QUICK_SEARCH_UI_MAPPINGS;
}

export function getAscetQuickSearchUiMapping(mode: AscetQuickSearchUiMode): AscetQuickSearchUiMapping | undefined {
	return QUICK_SEARCH_UI_MAPPINGS.find((mapping) => mapping.mode === mode);
}

export function formatQuickSearchUiMappingGuidelines(): string[] {
	return [
		"Component Manager quick search API mapping:",
		...QUICK_SEARCH_UI_MAPPINGS.map((mapping) => {
			const action = `${mapping.preferredAction.tool}.${mapping.preferredAction.action}`;
			const coverage = mapping.preferredAction.indexFastPath ? "index" : "fallback";
			const context = mapping.requiredContext.length > 0 ? `; requires ${mapping.requiredContext.join("+")}` : "";
			return `${mapping.label}->${action} (${coverage}${context})`;
		}),
	];
}

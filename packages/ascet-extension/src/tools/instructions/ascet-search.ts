import type { AscetActionInstruction } from "./types.ts";

export const ascetSearchInstructions = [
	{
		id: "ascet_search.search_components",
		tool: "ascet_search",
		action: "search_components",
		profiles: ["base", "reference", "write-preflight"],
		summary: "Find component candidates by name or folder scope before exact reads or writes.",
		rules: [
			"Prefer exact matches and bounded scopePath filters.",
			"Use scopePath only for folder scopes like DEMO; use componentPath only for concrete components like DEMO/PID.",
			"Search candidate provider components recursively using bounded queries such as _Calibration, _Constant, Calibration, Constant, and parameter.",
		],
		fewShots: [
			'search_components: ascet_search({action:"search_components",query:"PID",scopePath:"DEMO",match:"contains",limit:10})',
		],
		tags: ["component", "index", "provider-discovery"],
	},
	{
		id: "ascet_search.resolve_component",
		tool: "ascet_search",
		action: "resolve_component",
		profiles: ["base", "reference", "write-preflight"],
		summary: "Resolve one concrete componentPath for later read, reference, diff, verify, or write actions.",
		rules: [
			"Use resolve_component when a later action needs one concrete componentPath.",
			"Before broad reference searches, narrow with resolve_component, search_components, componentPath, or scopePath whenever the user gave any component or folder clue.",
		],
		fewShots: [
			'resolve_component: ascet_search({action:"resolve_component",query:"PID",scopePath:"DEMO",match:"exact",limit:5})',
		],
		tags: ["component", "routing"],
	},
	{
		id: "ascet_search.search_elements",
		tool: "ascet_search",
		action: "search_elements",
		profiles: ["base", "reference", "write-preflight"],
		summary: "Find element declarations by exact name or bounded contains search.",
		rules: [
			'For each candidate provider component, search_elements with match="exact" using the Imported Parameter name. The Imported Parameter and Exported Parameter must be same-named.',
			"Only scope=Exported search_elements results are valid provider candidates. Ignore Local and Imported results as provider endpoints.",
			"When multiple exported provider candidates remain, prefer same feature scope, then provider role match: calibration parameters in Calibration parameter classes; fixed non-calibration parameters in Constant parameter classes.",
			"Do not resolve provider ambiguity by name similarity alone. Require exact element name, scope=Exported, plausible provider class, and matching metadata evidence.",
		],
		fewShots: [
			'search_elements: ascet_search({action:"search_elements",query:"pid_kp",componentPath:"DEMO/PID",match:"exact",limit:5})',
		],
		tags: ["element", "provider-discovery"],
	},
	{
		id: "ascet_search.references_to_component",
		tool: "ascet_search",
		action: "references_to_component",
		profiles: ["base", "reference"],
		summary: "Search callers or referencing components for one component target.",
		rules: [
			"Use references_to_component for callers of a component.",
			"Unscoped reference searches can scan only a partial component page; truncated=true or searchComplete=false means the result is not exhaustive.",
		],
		fewShots: [
			'references_to_component: ascet_search({action:"references_to_component",query:"AEB_pDriverIBooster",match:"exact",limit:20})',
		],
		tags: ["reference", "component", "index"],
	},
	{
		id: "ascet_search.references_to_element",
		tool: "ascet_search",
		action: "references_to_element",
		profiles: ["base", "reference"],
		summary: "Search element references using text and diagram reference indexes.",
		rules: [
			"Use references_to_element for references to an element.",
			"Do not claim an element has no references unless the relevant search result has searchComplete=true for the requested scope.",
		],
		fewShots: [
			'references_to_element: ascet_search({action:"references_to_element",query:"pid_kp",componentPath:"DEMO/PID",limit:10})',
		],
		tags: ["reference", "element", "index"],
	},
	{
		id: "ascet_search.text_in_code",
		tool: "ascet_search",
		action: "text_in_code",
		profiles: ["base", "reference"],
		summary: "Search indexed ESDL/C snippets; this does not read complete code.",
		rules: [
			"Use text_in_code for ESDL or C text snippets and occurrence discovery.",
			"text_in_code returns matching snippets with component, section, line, and snippet evidence; use ascet_read.read_code for complete live code.",
			"Do not claim no text occurrences unless searchComplete=true for the requested scope.",
		],
		fewShots: [
			'text_in_code: ascet_search({action:"text_in_code",query:"C_AEB.getAt",componentPath:"DEMO/PID",limit:10})',
		],
		tags: ["text", "code", "index"],
	},
	{
		id: "ascet_search.search_occurrences",
		tool: "ascet_search",
		action: "search_occurrences",
		profiles: ["reference"],
		summary: "Legacy internal occurrence search route.",
		rules: ["Hidden legacy action; use references_to_component, references_to_element, or text_in_code instead."],
		hidden: true,
		tags: ["hidden", "legacy"],
	},
] as const satisfies readonly AscetActionInstruction[];

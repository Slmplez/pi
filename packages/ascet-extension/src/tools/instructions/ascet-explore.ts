import type { AscetActionInstruction } from "./types.ts";

export const ascetExploreInstructions = [
	{
		id: "ascet_explore.list_components",
		tool: "ascet_explore",
		action: "list_components",
		profiles: ["base", "reference", "write-preflight"],
		summary: "Browse ASCET folders after a scope is known.",
		rules: [
			"Use list_components to browse folder contents.",
			"For dependent-parameter provider discovery, use list_components recursively from the feature scope when parameter classes may be nested under _Calibration, _Constant, or other parameter folders.",
		],
		fewShots: ['list_components: ascet_explore({action:"list_components",folderPath:"DEMO",kind:"all",limit:20})'],
		tags: ["navigation", "component"],
	},
	{
		id: "ascet_explore.inspect_target",
		tool: "ascet_explore",
		action: "inspect_target",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Inspect a resolved target before choosing deeper read, reference, diff, or write actions.",
		rules: [
			"Use ascet_search.resolve_component when the user gives a component name but not a full path; use ascet_explore after a path is known.",
			"Use inspect_target before passing a discovered provider path as exporterComponentPath to read_dependent_chain.",
		],
		fewShots: [
			'inspect_target: ascet_explore({action:"inspect_target",componentPath:"DEMO/PID",detailLevel:"summary"})',
		],
		tags: ["navigation", "read-before-write"],
	},
	{
		id: "ascet_explore.preview_children",
		tool: "ascet_explore",
		action: "preview_children",
		profiles: ["base", "advanced-read", "write-preflight"],
		summary: "Preview children of one resolved component without reading full implementation.",
		rules: [
			"Use preview_children before selecting exact read, reference, diff, or write actions.",
			"Use preview_children on each candidate parameter class to verify that the target parameter exists with scope=Exported.",
			"Provider class names are only container hints. A provider is valid only when the candidate component contains the same-named Exported Parameter.",
		],
		fewShots: [
			'preview_children: ascet_explore({action:"preview_children",componentPath:"DEMO/PID",group:"methods"})',
		],
		tags: ["navigation", "provider-discovery"],
	},
	{
		id: "ascet_explore.list_diagrams",
		tool: "ascet_explore",
		action: "list_diagrams",
		profiles: ["advanced-read"],
		summary: "List available diagrams for a resolved component before diagram reads.",
		rules: ["Use list_diagrams before read_block_diagram when the diagram name or diagram kind is unclear."],
		fewShots: ['list_diagrams: ascet_explore({action:"list_diagrams",componentPath:"DEMO/PID",diagramKind:"all"})'],
		tags: ["diagram", "navigation"],
	},
] as const satisfies readonly AscetActionInstruction[];

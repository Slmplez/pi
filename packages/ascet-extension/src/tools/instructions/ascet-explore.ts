import type { AscetActionInstruction } from "./types.ts";

export const ascetExploreInstructions = [
	{
		id: "ascet_explore.list_components",
		tool: "ascet_explore",
		action: "list_components",
		profiles: ["base", "reference", "write-preflight"],
		summary: "Browse ASCET folders and typed database items after a scope is known.",
		rules: [
			"Use list_components to browse direct or recursive folder contents and filter by component kind or languageKind.",
			"For dependent-parameter provider discovery, use list_components recursively from the feature scope when parameter classes may be nested under _Calibration, _Constant, or other parameter folders.",
		],
		fewShots: [
			'list_components: ascet_explore({action:"list_components",folderPath:"DEMO",kind:"class",languageKind:"BDE",recursive:true,limit:20})',
		],
		tags: ["navigation", "component"],
	},
] as const satisfies readonly AscetActionInstruction[];

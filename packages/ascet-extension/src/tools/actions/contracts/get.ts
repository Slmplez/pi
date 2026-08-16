import { Type } from "typebox";
import { ASCET_READ_PROFILES } from "./profiles.ts";
import { ascetItemsResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export type AscetGetParams =
	| {
			action: "tree";
			path?: string;
			depth?: number;
	  }
	| {
			action: "formulas";
			path: string;
			name?: string;
	  };

export const ascetGetTreeActionParameters = Type.Object(
	{
		action: Type.Literal("tree"),
		path: Type.Optional(Type.String({ minLength: 1 })),
		depth: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
	},
	{ additionalProperties: false },
);

export const ascetGetFormulasActionParameters = Type.Object(
	{
		action: Type.Literal("formulas"),
		path: Type.String({ minLength: 1 }),
		name: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);

export const ascetGetTreeActionContract = defineAscetAction({
	tool: "ascet_get",
	action: "tree",
	selector: "action",
	visibility: "public",
	profiles: ASCET_READ_PROFILES,
	supportedObjectKinds: ["database", "folder", "project", "class", "module", "statemachine", "enumeration"],
	parameters: ascetGetTreeActionParameters,
	result: ascetItemsResultSchema,
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetGetTree",
		operation: "get_tree",
	},
	guidance: {
		result: { shape: "items", fields: ["count", "items", "more", "error"] },
		summary: "Read a bounded ASCET hierarchy from an exact path.",
		rules: [
			"Use tree for bounded hierarchy expansion only; it does not perform name search.",
			"path omitted means database root. depth defaults to 1 and is limited to 1 through 5.",
		],
		fewShots: [
			{ intent: "expand package", args: { action: "tree", path: "PlatformLibrary\\Package", depth: 2 } },
			{ intent: "read database root", args: { action: "tree", depth: 1 } },
		],
		tags: ["navigation", "tree", "live-read"],
	},
});

export const ascetGetFormulasActionContract = defineAscetAction({
	tool: "ascet_get",
	action: "formulas",
	selector: "action",
	visibility: "public",
	profiles: ASCET_READ_PROFILES,
	supportedObjectKinds: ["project"],
	parameters: ascetGetFormulasActionParameters,
	result: ascetItemsResultSchema,
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetGetFormulas",
		operation: "get_formulas",
	},
	guidance: {
		result: { shape: "items", fields: ["count", "items", "more", "error"] },
		summary: "Read Project formulas from one exact Project path.",
		rules: [
			"Use formulas only with one exact Project path. name optionally filters one Formula.",
			"Do not use formulas to locate an unknown Project; use ascet_search first.",
		],
		fewShots: [
			{ intent: "read project formula", args: { action: "formulas", path: "DEMO\\Project", name: "VehicleMass" } },
		],
		tags: ["project", "formula", "live-read"],
	},
});

export const ascetGetActionContracts = [ascetGetTreeActionContract, ascetGetFormulasActionContract] as const;

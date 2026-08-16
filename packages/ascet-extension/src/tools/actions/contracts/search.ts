import { Type } from "typebox";
import { ASCET_READ_PROFILES } from "./profiles.ts";
import { ascetItemsResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export const ascetSearchModes = [
	"comp",
	"comp-ref",
	"method",
	"method-ref",
	"method-element",
	"element",
	"element-ref",
	"sender",
	"receiver",
	"text",
] as const;

export type AscetSearchMode = (typeof ascetSearchModes)[number];

export interface AscetSearchQuery {
	mode: AscetSearchMode;
	q: string;
	limit?: number;
}

export interface AscetSearchParams extends AscetSearchQuery {
	action: "search";
}

export const ascetSearchActionParameters = Type.Object(
	{
		action: Type.Literal("search"),
		mode: Type.String({ enum: [...ascetSearchModes] }),
		q: Type.String({ minLength: 1, maxLength: 512 }),
		limit: Type.Optional(Type.Integer({ minimum: 1, maximum: 100 })),
	},
	{ additionalProperties: false },
);

export const ascetSearchActionContract = defineAscetAction({
	tool: "ascet_search",
	action: "search",
	selector: "action",
	visibility: "public",
	profiles: ASCET_READ_PROFILES,
	parameters: ascetSearchActionParameters,
	result: ascetItemsResultSchema,
	execution: { kind: "native-search" },
	guidance: {
		result: { shape: "searchMatches", fields: ["count", "items", "more", "error"] },
		summary: "Run one live native ASCET Search query for candidate discovery.",
		rules: [
			"Search results are live hints, not complete metadata.",
			"Resolve an exact path before ascet_get, ascet_read, or any edit.",
		],
		fewShots: [
			{ intent: "find element", args: { action: "search", mode: "element", q: "PCA_Ctrl_slMin_RA", limit: 20 } },
			{ intent: "find code text", args: { action: "search", mode: "text", q: "VLC3IsInControl", limit: 20 } },
		],
		tags: ["search", "discovery", "native-ui"],
	},
});

export const ascetSearchActionContracts = [ascetSearchActionContract] as const;

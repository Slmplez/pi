import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

const area = Type.Union([
	Type.Literal("p0"),
	Type.Literal("components"),
	Type.Literal("tree"),
	Type.Literal("elements"),
	Type.Literal("methods"),
	Type.Literal("refs"),
	Type.Literal("code"),
	Type.Literal("messages"),
	Type.Literal("project"),
]);

const detailLevel = Type.Union([Type.Literal("summary"), Type.Literal("areas"), Type.Literal("full")]);
const format = Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")]));
const physicalArea = Type.Union([
	Type.Literal("components"),
	Type.Literal("folders"),
	Type.Literal("folder_items"),
	Type.Literal("elements"),
	Type.Literal("methods"),
	Type.Literal("project_formulas"),
	Type.Literal("project_items"),
	Type.Literal("component_refs"),
	Type.Literal("element_refs"),
	Type.Literal("messages"),
	Type.Literal("dbitem_dependencies"),
	Type.Literal("code_blocks"),
	Type.Literal("code_terms"),
]);

const statusParams = Type.Object({
	action: Type.Literal("status"),
	detailLevel: Type.Optional(detailLevel),
	includeScheduler: Type.Optional(Type.Boolean()),
	format,
});

const refreshParams = Type.Object({
	action: Type.Literal("refresh"),
	areas: Type.Array(area),
	componentPath: Type.Optional(Type.String()),
	force: Type.Optional(Type.Boolean()),
	mode: Type.Optional(Type.Union([Type.Literal("foreground"), Type.Literal("background")])),
	wait: Type.Optional(Type.Boolean()),
	reason: Type.Optional(Type.String()),
	format,
});

const markStaleParams = Type.Object({
	action: Type.Literal("mark_stale"),
	areas: Type.Array(area),
	reason: Type.String(),
	format,
});

const repairStatusFileParams = Type.Object({
	action: Type.Literal("repair_status_file"),
	reason: Type.Optional(Type.String()),
	format,
});

const evaluateParams = Type.Object({
	action: Type.Literal("evaluate"),
	checks: Type.Optional(
		Type.Array(
			Type.Union([
				Type.Literal("status"),
				Type.Literal("counts"),
				Type.Literal("freshness"),
				Type.Literal("search_smoke"),
				Type.Literal("sidecar"),
			]),
		),
	),
	live: Type.Optional(Type.Boolean()),
	query: Type.Optional(Type.String()),
	componentPath: Type.Optional(Type.String()),
	requiredAreas: Type.Optional(Type.Array(physicalArea, { minItems: 1 })),
	requireFreshness: Type.Optional(Type.Boolean()),
	format,
});

export type AscetIndexParams =
	| {
			action: "status";
			detailLevel?: "summary" | "areas" | "full";
			includeScheduler?: boolean;
			format?: "text" | "json";
	  }
	| {
			action: "refresh";
			areas: Array<"p0" | "components" | "tree" | "elements" | "methods" | "refs" | "code" | "messages" | "project">;
			componentPath?: string;
			force?: boolean;
			mode?: "foreground" | "background";
			wait?: boolean;
			reason?: string;
			format?: "text" | "json";
	  }
	| {
			action: "mark_stale";
			areas: Array<"p0" | "components" | "tree" | "elements" | "methods" | "refs" | "code" | "messages" | "project">;
			reason: string;
			format?: "text" | "json";
	  }
	| {
			action: "repair_status_file";
			reason?: string;
			format?: "text" | "json";
	  }
	| {
			action: "evaluate";
			checks?: Array<"status" | "counts" | "freshness" | "search_smoke" | "sidecar">;
			live?: boolean;
			query?: string;
			componentPath?: string;
			requiredAreas?: Array<
				| "components"
				| "folders"
				| "folder_items"
				| "elements"
				| "methods"
				| "project_formulas"
				| "project_items"
				| "component_refs"
				| "element_refs"
				| "messages"
				| "dbitem_dependencies"
				| "code_blocks"
				| "code_terms"
			>;
			requireFreshness?: boolean;
			format?: "text" | "json";
	  };

export const ascetIndexParameters = openAiObjectUnionSchema<AscetIndexParams>([
	statusParams,
	refreshParams,
	markStaleParams,
	repairStatusFileParams,
	evaluateParams,
]);

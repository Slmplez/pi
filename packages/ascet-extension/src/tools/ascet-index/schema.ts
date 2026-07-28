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
				Type.Literal("search_smoke"),
				Type.Literal("sidecar"),
			]),
		),
	),
	live: Type.Optional(Type.Boolean()),
	query: Type.Optional(Type.String()),
	componentPath: Type.Optional(Type.String()),
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
			checks?: Array<"status" | "counts" | "search_smoke" | "sidecar">;
			live?: boolean;
			query?: string;
			componentPath?: string;
			format?: "text" | "json";
	  };

export const ascetIndexParameters = openAiObjectUnionSchema<AscetIndexParams>([
	statusParams,
	refreshParams,
	markStaleParams,
	repairStatusFileParams,
	evaluateParams,
]);

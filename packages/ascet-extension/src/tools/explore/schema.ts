import { Type } from "typebox";

export type AscetExploreParams =
	| {
			action: "list_components";
			folderPath: string;
			kind?: "class" | "module" | "statemachine" | "folder" | "all";
			query?: string;
			limit?: number;
			recursive?: boolean;
	  }
	| {
			action: "list_diagrams";
			componentPath: string;
			diagramKind?: "all" | "block" | "block_diagram" | "state" | "state_machine" | "sequence" | "unknown";
	  }
	| {
			action: "resolve_target";
			query: string;
			scopePath?: string;
			kind?: "class" | "module" | "statemachine";
			match?: "exact" | "glob" | "contains";
			limit?: number;
	  }
	| { action: "inspect_target"; componentPath: string; detailLevel?: "summary" | "detailed" }
	| {
			action: "preview_children";
			componentPath: string;
			group?: "methods" | "elements" | "variables" | "diagrams" | "all";
	  };

export const ascetExploreParameters = Type.Object({
	action: Type.Union([
		Type.Literal("list_components"),
		Type.Literal("list_diagrams"),
		Type.Literal("resolve_target"),
		Type.Literal("inspect_target"),
		Type.Literal("preview_children"),
	]),
	folderPath: Type.Optional(Type.String({ minLength: 1 })),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	query: Type.Optional(Type.String({ minLength: 1 })),
	scopePath: Type.Optional(Type.String()),
	kind: Type.Optional(
		Type.Union([
			Type.Literal("class"),
			Type.Literal("module"),
			Type.Literal("statemachine"),
			Type.Literal("folder"),
			Type.Literal("all"),
		]),
	),
	match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
	recursive: Type.Optional(Type.Boolean()),
	diagramKind: Type.Optional(
		Type.Union([
			Type.Literal("all"),
			Type.Literal("block"),
			Type.Literal("block_diagram"),
			Type.Literal("state"),
			Type.Literal("state_machine"),
			Type.Literal("sequence"),
			Type.Literal("unknown"),
		]),
	),
	detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("detailed")])),
	group: Type.Optional(
		Type.Union([
			Type.Literal("methods"),
			Type.Literal("elements"),
			Type.Literal("variables"),
			Type.Literal("diagrams"),
			Type.Literal("all"),
		]),
	),
});

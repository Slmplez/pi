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
	| { action: "list_diagrams"; componentPath: string; diagramKind?: string }
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

export const ascetExploreParameters = Type.Union([
	Type.Object({
		action: Type.Literal("list_components"),
		folderPath: Type.String({ minLength: 1 }),
		kind: Type.Optional(
			Type.Union([
				Type.Literal("class"),
				Type.Literal("module"),
				Type.Literal("statemachine"),
				Type.Literal("folder"),
				Type.Literal("all"),
			]),
		),
		query: Type.Optional(Type.String()),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
		recursive: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("list_diagrams"),
		componentPath: Type.String({ minLength: 1 }),
		diagramKind: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("resolve_target"),
		query: Type.String({ minLength: 1 }),
		scopePath: Type.Optional(Type.String()),
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("glob"), Type.Literal("contains")])),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
	}),
	Type.Object({
		action: Type.Literal("inspect_target"),
		componentPath: Type.String({ minLength: 1 }),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("detailed")])),
	}),
	Type.Object({
		action: Type.Literal("preview_children"),
		componentPath: Type.String({ minLength: 1 }),
		group: Type.Optional(
			Type.Union([
				Type.Literal("methods"),
				Type.Literal("elements"),
				Type.Literal("variables"),
				Type.Literal("diagrams"),
				Type.Literal("all"),
			]),
		),
	}),
]);

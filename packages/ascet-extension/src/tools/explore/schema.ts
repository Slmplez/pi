import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

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
	| { action: "inspect_target"; componentPath: string; detailLevel?: "summary" | "topology" }
	| {
			action: "preview_children";
			componentPath: string;
			group?: "all" | "methods" | "elements" | "components" | "arrays" | "parameters" | "variables" | "diagrams";
	  };

const diagramKindSchema = Type.Optional(
	Type.Union([
		Type.Literal("all"),
		Type.Literal("block"),
		Type.Literal("block_diagram"),
		Type.Literal("state"),
		Type.Literal("state_machine"),
		Type.Literal("sequence"),
		Type.Literal("unknown"),
	]),
);

const previewChildrenGroupSchema = Type.Optional(
	Type.Union([
		Type.Literal("methods"),
		Type.Literal("elements"),
		Type.Literal("components"),
		Type.Literal("arrays"),
		Type.Literal("parameters"),
		Type.Literal("variables"),
		Type.Literal("diagrams"),
		Type.Literal("all"),
	]),
);

const ascetExploreActionSchemas = [
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
		query: Type.Optional(Type.String({ minLength: 1 })),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
		recursive: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("list_diagrams"),
		componentPath: Type.String({ minLength: 1 }),
		diagramKind: diagramKindSchema,
	}),
	Type.Object({
		action: Type.Literal("inspect_target"),
		componentPath: Type.String({ minLength: 1 }),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("topology")])),
	}),
	Type.Object({
		action: Type.Literal("preview_children"),
		componentPath: Type.String({ minLength: 1 }),
		group: previewChildrenGroupSchema,
	}),
] as const;

export const ascetExploreParameters = openAiObjectUnionSchema<AscetExploreParams>(ascetExploreActionSchemas);

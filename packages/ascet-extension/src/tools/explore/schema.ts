import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

export interface AscetExploreParams {
	action: "list_components";
	folderPath: string;
	kind?: "all" | "folder" | "class" | "module" | "statemachine";
	languageKind?: "all" | "BDE" | "ESDL" | "C" | "Unknown";
	query?: string;
	limit?: number;
	recursive?: boolean;
}

const ascetExploreActionSchemas = [
	Type.Object({
		action: Type.Literal("list_components"),
		folderPath: Type.String({ minLength: 1 }),
		kind: Type.Optional(
			Type.Union([
				Type.Literal("all"),
				Type.Literal("folder"),
				Type.Literal("class"),
				Type.Literal("module"),
				Type.Literal("statemachine"),
			]),
		),
		languageKind: Type.Optional(
			Type.Union([
				Type.Literal("all"),
				Type.Literal("BDE"),
				Type.Literal("ESDL"),
				Type.Literal("C"),
				Type.Literal("Unknown"),
			]),
		),
		query: Type.Optional(Type.String({ minLength: 1 })),
		limit: Type.Optional(Type.Number({ minimum: 1, maximum: 500 })),
		recursive: Type.Optional(Type.Boolean()),
	}),
] as const;

export const ascetExploreParameters = openAiObjectUnionSchema<AscetExploreParams>(ascetExploreActionSchemas);

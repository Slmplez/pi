import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

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

export const ascetGetParameters = openAiObjectUnionSchema<AscetGetParams>([
	Type.Object(
		{
			action: Type.Literal("tree"),
			path: Type.Optional(Type.String({ minLength: 1 })),
			depth: Type.Optional(Type.Integer({ minimum: 1, maximum: 5 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("formulas"),
			path: Type.String({ minLength: 1 }),
			name: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
]);

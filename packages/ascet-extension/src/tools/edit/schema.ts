import { Type } from "typebox";
import { type AscetEditParams, ascetMutationActionSchemas } from "../../edit/service.ts";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

const editabilityActionSchemas = [
	Type.Object(
		{
			mode: Type.Literal("check"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
			executeWrite: Type.Optional(Type.Boolean()),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			mode: Type.Literal("set"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
			executeWrite: Type.Optional(
				Type.Boolean({ description: "Required before requesting confirmation for the ASCET SCM lock." }),
			),
		},
		{ additionalProperties: false },
	),
] as const;

export const ascetEditParameters = openAiObjectUnionSchema<AscetEditParams>([
	...ascetMutationActionSchemas,
	...editabilityActionSchemas,
]);

export type { AscetEditParams };

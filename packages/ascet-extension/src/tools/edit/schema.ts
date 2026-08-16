import { Type } from "typebox";
import {
	type AscetCreateDependentChainParams,
	ascetCreateDependentChainActionSchema,
} from "../../create-dependent-chain.ts";
import { ascetMutationActionSchemas, type AscetEditParams as LegacyAscetEditParams } from "../../edit/service.ts";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

function isSetElementDependencySchema(schema: unknown): boolean {
	if (schema === null || typeof schema !== "object" || Array.isArray(schema)) return false;
	const properties = (schema as { properties?: Record<string, unknown> }).properties;
	const action = properties?.action;
	return (
		action !== null &&
		typeof action === "object" &&
		!Array.isArray(action) &&
		(action as { const?: unknown }).const === "set_element_dependency"
	);
}

const publicMutationActionSchemas = ascetMutationActionSchemas.filter(
	(schema) => !isSetElementDependencySchema(schema),
);

const editabilityActionSchemas = [
	Type.Object(
		{
			mode: Type.Literal("check"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			mode: Type.Literal("set"),
			componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
			intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
		},
		{ additionalProperties: false },
	),
] as const;

export type AscetEditParams = LegacyAscetEditParams | AscetCreateDependentChainParams;

export const ascetEditParameters = openAiObjectUnionSchema<AscetEditParams>([
	...publicMutationActionSchemas,
	ascetCreateDependentChainActionSchema,
	...editabilityActionSchemas,
]);

import {
	type AscetCreateDependentChainParams,
	ascetCreateDependentChainActionSchema,
} from "../../create-dependent-chain.ts";
import type { AscetEditParams as LegacyAscetEditParams } from "../../edit/service.ts";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";
import { ascetEditabilityActionSchemas, ascetPublicMutationActionSchemas } from "../actions/contracts/edit.ts";

export type AscetEditParams = LegacyAscetEditParams | AscetCreateDependentChainParams;

export const ascetEditParameters = openAiObjectUnionSchema<AscetEditParams>([
	...ascetPublicMutationActionSchemas,
	ascetCreateDependentChainActionSchema,
	...ascetEditabilityActionSchemas,
]);

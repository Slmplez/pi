import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";
import { type AscetGetParams, ascetGetActionContracts } from "../actions/contracts/get.ts";

export type { AscetGetParams } from "../actions/contracts/get.ts";

export const ascetGetParameters = openAiObjectUnionSchema<AscetGetParams>(
	ascetGetActionContracts.map((contract) => contract.parameters),
);

import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";
import { type AscetDiffParams, ascetDiffActionContracts } from "../actions/contracts/diff.ts";

export type { AscetDiffParams } from "../actions/contracts/diff.ts";

export const ascetDiffParameters = openAiObjectUnionSchema<AscetDiffParams>(
	ascetDiffActionContracts.map((contract) => contract.parameters),
);

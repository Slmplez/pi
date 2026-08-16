import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";
import { ascetReadDependentChainActionContract } from "../actions/contracts/dependency.ts";
import { type AscetReadParams, ascetReadActionContracts } from "../actions/contracts/read.ts";
import { listAscetPublicSchemaVariants } from "../actions/schema-registry.ts";

export type { AscetReadParams } from "../actions/contracts/read.ts";

const ascetReadContracts = [...ascetReadActionContracts, ascetReadDependentChainActionContract];

export const ascetReadParameters = openAiObjectUnionSchema<AscetReadParams>(
	ascetReadContracts.flatMap((contract) =>
		listAscetPublicSchemaVariants(contract.parameters).map((variant) => variant.schema),
	),
);

import type { AscetSchedulerStatusAction } from "../../scheduler/status.ts";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";
import { ascetSchedulerRecoverActionSchema, ascetSchedulerStatusActionSchema } from "../actions/contracts/ops.ts";
export type AscetSchedulerStatusParams = { action?: AscetSchedulerStatusAction; format?: "text" | "json" };
export const ascetSchedulerStatusParameters = openAiObjectUnionSchema<AscetSchedulerStatusParams>([
	ascetSchedulerStatusActionSchema,
	ascetSchedulerRecoverActionSchema,
]);

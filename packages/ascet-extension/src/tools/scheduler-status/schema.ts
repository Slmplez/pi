import { Type } from "typebox";
import type { AscetSchedulerStatusAction } from "../../scheduler/status.ts";
import { openAiObjectSchema } from "../_shared/openai-schema.ts";

export type AscetSchedulerStatusParams = {
	action?: AscetSchedulerStatusAction;
	format?: "text" | "json";
};

export const ascetSchedulerStatusParameters = openAiObjectSchema<AscetSchedulerStatusParams>(
	Type.Object({
		action: Type.Optional(Type.Union([Type.Literal("status"), Type.Literal("recover")])),
		format: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")])),
	}),
);

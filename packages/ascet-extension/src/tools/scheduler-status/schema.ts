import { Type } from "typebox";
import type { AscetSchedulerStatusAction } from "../../scheduler/status.ts";

export type AscetSchedulerStatusParams = {
	action?: AscetSchedulerStatusAction;
	format?: "text" | "json";
};

export const ascetSchedulerStatusParameters = Type.Object({
	action: Type.Optional(Type.Union([Type.Literal("status"), Type.Literal("recover")])),
	format: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")])),
});

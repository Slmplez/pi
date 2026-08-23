import { Type } from "typebox";

export type AscetPublicMutationIntent = "apply";

export interface AscetPublicWriteControl {
	intent: AscetPublicMutationIntent;
}

export const ascetPublicWriteControlProperties = {
	intent: Type.Literal("apply"),
};

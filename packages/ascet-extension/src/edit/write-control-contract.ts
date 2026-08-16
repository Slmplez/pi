import { Type } from "typebox";

export type AscetMutationIntent = "preview" | "apply";

export interface AscetPublicWriteControl {
	intent: AscetMutationIntent;
}

export const ascetWriteControlProperties = {
	intent: Type.Union([Type.Literal("preview"), Type.Literal("apply")]),
};

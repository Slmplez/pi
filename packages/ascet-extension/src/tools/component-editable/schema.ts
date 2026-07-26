import { Type } from "typebox";
import type { AscetComponentEditableParams } from "../../component-editable.ts";
import { openAiObjectSchema } from "../_shared/openai-schema.ts";

export type { AscetComponentEditableParams };

export const ascetComponentEditableParameters = openAiObjectSchema<AscetComponentEditableParams>(
	Type.Object({
		mode: Type.Union([Type.Literal("check"), Type.Literal("set")], {
			description: "Use check to read whether a component is editable, or set to request an ASCET SCM lock.",
		}),
		componentPath: Type.String({ minLength: 1, description: "ASCET component path." }),
		executeWrite: Type.Optional(
			Type.Boolean({
				description:
					"Required for mode=set before PI requests interactive confirmation and executes the ASCET SCM lock.",
			}),
		),
	}),
);

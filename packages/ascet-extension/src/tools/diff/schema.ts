import { Type } from "typebox";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

export type AscetDiffParams =
	| {
			action: "diff";
			objectKind?: "class" | "module" | "statemachine";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_method";
			leftPath: string;
			rightPath: string;
			methodName: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_component_snapshot";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| {
			action: "diff_state_machine_domain";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  }
	| { action: "diff_element_spec"; componentPath: string; specFile: string; changesOnly?: boolean; timeoutMs?: number }
	| {
			action: "diff_project_formulas";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
			timeoutMs?: number;
	  };

const changesOnlySchema = Type.Optional(Type.Boolean());
const timeoutSchema = Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 }));
const pathSchema = Type.String({ minLength: 1 });
const commonPathProperties = {
	leftPath: pathSchema,
	rightPath: pathSchema,
	changesOnly: changesOnlySchema,
	timeoutMs: timeoutSchema,
};

export const ascetDiffParameters = openAiObjectUnionSchema<AscetDiffParams>([
	Type.Object(
		{
			action: Type.Literal("diff"),
			objectKind: Type.Optional(
				Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
			),
			...commonPathProperties,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("diff_method"),
			...commonPathProperties,
			methodName: Type.String({ minLength: 1 }),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{ action: Type.Literal("diff_component_snapshot"), ...commonPathProperties },
		{ additionalProperties: false },
	),
	Type.Object(
		{ action: Type.Literal("diff_state_machine_domain"), ...commonPathProperties },
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("diff_element_spec"),
			componentPath: pathSchema,
			specFile: pathSchema,
			changesOnly: changesOnlySchema,
			timeoutMs: timeoutSchema,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{ action: Type.Literal("diff_project_formulas"), ...commonPathProperties },
		{ additionalProperties: false },
	),
]);

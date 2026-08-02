import { Type } from "typebox";
import { openAiObjectSchema } from "../_shared/openai-schema.ts";

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

export const ascetDiffParameters = openAiObjectSchema<AscetDiffParams>(
	Type.Object({
		action: Type.Union([
			Type.Literal("diff"),
			Type.Literal("diff_method"),
			Type.Literal("diff_component_snapshot"),
			Type.Literal("diff_state_machine_domain"),
			Type.Literal("diff_element_spec"),
			Type.Literal("diff_project_formulas"),
		]),
		objectKind: Type.Optional(
			Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		),
		leftPath: Type.Optional(Type.String({ minLength: 1 })),
		rightPath: Type.Optional(Type.String({ minLength: 1 })),
		methodName: Type.Optional(Type.String({ minLength: 1 })),
		componentPath: Type.Optional(Type.String({ minLength: 1 })),
		specFile: Type.Optional(Type.String({ minLength: 1 })),
		changesOnly: Type.Optional(Type.Boolean()),
		timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
	}),
);

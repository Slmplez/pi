import { Type } from "typebox";

export type AscetDiffParams =
	| {
			action: "diff";
			objectKind?: "class" | "module" | "statemachine";
			leftPath: string;
			rightPath: string;
			changesOnly?: boolean;
	  }
	| { action: "diff_method"; leftPath: string; rightPath: string; methodName: string; changesOnly?: boolean }
	| { action: "diff_component_snapshot"; leftPath: string; rightPath: string; changesOnly?: boolean }
	| { action: "diff_state_machine_domain"; leftPath: string; rightPath: string; changesOnly?: boolean }
	| { action: "diff_element_spec"; componentPath: string; specFile: string; changesOnly?: boolean }
	| { action: "diff_project_formulas"; leftPath: string; rightPath: string; changesOnly?: boolean };

export const ascetDiffParameters = Type.Union([
	Type.Object({
		action: Type.Literal("diff"),
		objectKind: Type.Optional(
			Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		),
		leftPath: Type.String({ minLength: 1 }),
		rightPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("diff_method"),
		leftPath: Type.String({ minLength: 1 }),
		rightPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("diff_component_snapshot"),
		leftPath: Type.String({ minLength: 1 }),
		rightPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("diff_state_machine_domain"),
		leftPath: Type.String({ minLength: 1 }),
		rightPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("diff_element_spec"),
		componentPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
	Type.Object({
		action: Type.Literal("diff_project_formulas"),
		leftPath: Type.String({ minLength: 1 }),
		rightPath: Type.String({ minLength: 1 }),
		changesOnly: Type.Optional(Type.Boolean()),
	}),
]);

import { Type } from "typebox";

export type AscetReferenceParams =
	| { action: "component_refs"; componentPath: string; direction?: "out" | "both"; depth?: number }
	| {
			action: "used_by";
			componentPath: string;
			scopePath: string;
			kind?: "class" | "module" | "statemachine";
			limit?: number;
	  }
	| { action: "element_refs"; componentPath: string; elementName: string };

export const ascetReferenceParameters = Type.Union([
	Type.Object({
		action: Type.Literal("component_refs"),
		componentPath: Type.String({ minLength: 1 }),
		direction: Type.Optional(Type.Union([Type.Literal("out"), Type.Literal("both")])),
		depth: Type.Optional(Type.Number({ minimum: 1 })),
	}),
	Type.Object({
		action: Type.Literal("used_by"),
		componentPath: Type.String({ minLength: 1 }),
		scopePath: Type.String({ minLength: 1 }),
		kind: Type.Optional(Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")])),
		limit: Type.Optional(Type.Number({ minimum: 1 })),
	}),
	Type.Object({
		action: Type.Literal("element_refs"),
		componentPath: Type.String({ minLength: 1 }),
		elementName: Type.String({ minLength: 1 }),
	}),
]);

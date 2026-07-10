import { Type } from "typebox";

export type AscetReadParams =
	| { action: "read"; componentPath: string; methodName?: string }
	| {
			action: "read_code";
			componentPath: string;
			methodName?: string;
			section?: "header" | "external-c" | "all" | "body";
	  }
	| {
			action: "read_implementation";
			componentPath: string;
			implementationMode?: "list" | "default" | "class-impl" | "impl";
			implementationName?: string;
	  }
	| { action: "read_block_diagram"; componentPath: string; diagramName?: string; detailLevel?: "summary" | "full" }
	| {
			action: "read_state_machine_flow";
			componentPath: string;
			detailLevel?: "summary" | "full";
			traceDepth?: number;
	  };

export const ascetReadParameters = Type.Union([
	Type.Object({
		action: Type.Literal("read"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("read_code"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.Optional(Type.String()),
		section: Type.Optional(
			Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
		),
	}),
	Type.Object({
		action: Type.Literal("read_implementation"),
		componentPath: Type.String({ minLength: 1 }),
		implementationMode: Type.Optional(
			Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
		),
		implementationName: Type.Optional(Type.String()),
	}),
	Type.Object({
		action: Type.Literal("read_block_diagram"),
		componentPath: Type.String({ minLength: 1 }),
		diagramName: Type.Optional(Type.String()),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
	}),
	Type.Object({
		action: Type.Literal("read_state_machine_flow"),
		componentPath: Type.String({ minLength: 1 }),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
		traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	}),
]);

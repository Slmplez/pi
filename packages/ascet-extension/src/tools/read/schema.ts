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
	| {
			action: "read_block_diagram";
			componentPath: string;
			diagramName?: string;
			detailLevel?: "summary" | "full";
			timeoutMs?: number;
	  }
	| {
			action: "read_state_machine_flow";
			componentPath: string;
			detailLevel?: "summary" | "full";
			traceDepth?: number;
	  };

export const ascetReadParameters = Type.Object({
	action: Type.Union([
		Type.Literal("read"),
		Type.Literal("read_code"),
		Type.Literal("read_implementation"),
		Type.Literal("read_block_diagram"),
		Type.Literal("read_state_machine_flow"),
	]),
	componentPath: Type.String({ minLength: 1 }),
	methodName: Type.Optional(Type.String()),
	section: Type.Optional(
		Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
	),
	implementationMode: Type.Optional(
		Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
	),
	implementationName: Type.Optional(Type.String()),
	diagramName: Type.Optional(Type.String()),
	detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
	traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	timeoutMs: Type.Optional(
		Type.Number({
			description: "Optional read_block_diagram execution timeout in milliseconds. Defaults to 60000.",
			minimum: 1_000,
		}),
	),
});

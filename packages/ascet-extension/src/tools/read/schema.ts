import { Type } from "typebox";
import type { AscetReadElementDependencyTargetKind } from "../../read-element-dependency.ts";

export type AscetReadParams =
	| { action: "read"; componentPath: string; methodName?: string }
	| {
			action: "read_code";
			componentPath: string;
			methodName?: string;
			section?: "header" | "external-c" | "all" | "body";
	  }
	| {
			action: "read_method_signature";
			componentPath: string;
			methodName: string;
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
			timeoutMs?: number;
	  }
	| {
			action: "read_state_machine_flow";
			componentPath: string;
			detailLevel?: "summary" | "full";
			traceDepth?: number;
	  }
	| {
			action: "read_dependent_chain";
			componentPath: string;
			dependentElement: string;
			exporterComponentPath?: string;
			providerScopePath?: string;
			maxCandidates?: number;
	  }
	| {
			action: "read_element_dependency";
			targetPath?: string;
			componentPath?: string;
			elementName: string;
			targetKind?: AscetReadElementDependencyTargetKind;
	  };

export const ascetReadParameters = Type.Object({
	action: Type.Union([
		Type.Literal("read"),
		Type.Literal("read_code"),
		Type.Literal("read_method_signature"),
		Type.Literal("read_implementation"),
		Type.Literal("read_block_diagram"),
		Type.Literal("read_state_machine_flow"),
		Type.Literal("read_dependent_chain"),
		Type.Literal("read_element_dependency"),
	]),
	componentPath: Type.Optional(Type.String({ minLength: 1 })),
	targetPath: Type.Optional(Type.String({ minLength: 1 })),
	exporterComponentPath: Type.Optional(Type.String({ minLength: 1 })),
	providerScopePath: Type.Optional(Type.String({ minLength: 1 })),
	methodName: Type.Optional(Type.String()),
	elementName: Type.Optional(Type.String()),
	dependentElement: Type.Optional(Type.String({ minLength: 1 })),
	targetKind: Type.Optional(
		Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
	),
	section: Type.Optional(
		Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
	),
	implementationMode: Type.Optional(
		Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
	),
	implementationName: Type.Optional(Type.String()),
	diagramName: Type.Optional(Type.String()),
	traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	maxCandidates: Type.Optional(Type.Number({ minimum: 1 })),
	timeoutMs: Type.Optional(
		Type.Number({
			description: "Optional read_block_diagram execution timeout in milliseconds. Defaults to 60000.",
			minimum: 1_000,
		}),
	),
});

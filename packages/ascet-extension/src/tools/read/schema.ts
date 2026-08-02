import { Type } from "typebox";
import type { AscetReadElementDependencyTargetKind } from "../../read-element-dependency.ts";
import { openAiObjectUnionSchema } from "../_shared/openai-schema.ts";

export type AscetReadParams =
	| {
			action: "read_code";
			componentPath: string;
			methodName?: string;
			section?: "header" | "external-c" | "all" | "body";
			detailLevel?: "summary" | "topology" | "full";
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
			detailLevel?: "metadata" | "summary" | "elements" | "full";
			maxDepth?: number;
			maxElements?: number;
			timeoutMs?: number;
	  }
	| {
			action: "read_project_formulas";
			projectPath: string;
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
			detailLevel?: "summary" | "topology" | "full";
			traceDepth?: number;
	  }
	| {
			action: "read_dependent_chain";
			componentPath: string;
			dependentElement: string;
			exporterComponentPath?: string;
			providerScopePath?: string;
			maxCandidates?: number;
			detailLevel?: "summary" | "full";
			fallback?: "none" | "legacy_live";
	  }
	| {
			action: "read_element_dependency";
			targetPath?: string;
			componentPath?: string;
			elementName: string;
			targetKind?: AscetReadElementDependencyTargetKind;
	  };

const detailLevelSchema = Type.Optional(
	Type.Union([Type.Literal("summary"), Type.Literal("topology"), Type.Literal("full")]),
);
const componentPathSchema = Type.String({ minLength: 1 });
const targetKindSchema = Type.Optional(
	Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
);

const ascetReadActionSchemas = [
	Type.Object({
		action: Type.Literal("read_code"),
		componentPath: componentPathSchema,
		methodName: Type.Optional(Type.String()),
		section: Type.Optional(
			Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
		),
		detailLevel: detailLevelSchema,
	}),
	Type.Object({
		action: Type.Literal("read_method_signature"),
		componentPath: componentPathSchema,
		methodName: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("read_implementation"),
		componentPath: componentPathSchema,
		implementationMode: Type.Optional(
			Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl"), Type.Literal("impl")]),
		),
		implementationName: Type.Optional(Type.String()),
		detailLevel: Type.Optional(
			Type.Union([
				Type.Literal("metadata"),
				Type.Literal("summary"),
				Type.Literal("elements"),
				Type.Literal("full"),
			]),
		),
		maxDepth: Type.Optional(Type.Integer({ minimum: 0 })),
		maxElements: Type.Optional(Type.Integer({ minimum: 1 })),
		timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
	}),
	Type.Object({
		action: Type.Literal("read_project_formulas"),
		projectPath: Type.String({ minLength: 1 }),
	}),
	Type.Object({
		action: Type.Literal("read_block_diagram"),
		componentPath: componentPathSchema,
		diagramName: Type.Optional(Type.String()),
		timeoutMs: Type.Optional(
			Type.Number({
				description: "Optional read_block_diagram execution timeout in milliseconds. Defaults to 60000.",
				minimum: 1_000,
			}),
		),
	}),
	Type.Object({
		action: Type.Literal("read_state_machine_flow"),
		componentPath: componentPathSchema,
		detailLevel: detailLevelSchema,
		traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
	}),
	Type.Object({
		action: Type.Literal("read_dependent_chain"),
		componentPath: componentPathSchema,
		dependentElement: Type.String({ minLength: 1 }),
		exporterComponentPath: Type.Optional(Type.String({ minLength: 1 })),
		providerScopePath: Type.Optional(Type.String({ minLength: 1 })),
		maxCandidates: Type.Optional(Type.Number({ minimum: 1 })),
		detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
		fallback: Type.Optional(Type.Union([Type.Literal("none"), Type.Literal("legacy_live")])),
	}),
	Type.Object({
		action: Type.Literal("read_element_dependency"),
		targetPath: Type.Optional(Type.String({ minLength: 1 })),
		componentPath: Type.Optional(Type.String({ minLength: 1 })),
		elementName: Type.String({ minLength: 1 }),
		targetKind: targetKindSchema,
	}),
] as const;

export const ascetReadParameters = openAiObjectUnionSchema<AscetReadParams>(ascetReadActionSchemas);

import { Type } from "typebox";
import type { AscetReadElementDependencyTargetKind } from "../../../read-element-dependency.ts";
import { openAiObjectUnionSchema } from "../../_shared/openai-schema.ts";
import { ASCET_READ_PROFILES } from "./profiles.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export type AscetReadParams =
	| { action: "read"; componentPath: string }
	| {
			action: "read_code";
			componentPath: string;
			methodName?: string;
			section?: "header" | "external-c" | "all" | "body";
			detailLevel?: "summary" | "topology" | "full";
	  }
	| { action: "read_method_signature"; componentPath: string; methodName: string }
	| {
			action: "read_implementation";
			componentPath: string;
			implementationMode?: "list" | "default" | "class-impl" | "impl";
			implementationName?: string;
			timeoutMs?: number;
	  }
	| { action: "read_element"; componentPath: string; elementName: string; timeoutMs?: number }
	| { action: "read_block_diagram"; componentPath: string; diagramName?: string; timeoutMs?: number }
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
	  }
	| ({ action: "read_element_dependency"; elementName: string; targetKind?: AscetReadElementDependencyTargetKind } & (
			| { targetPath: string; componentPath?: string }
			| { targetPath?: string; componentPath: string }
	  ));

const detailLevelSchema = Type.Optional(
	Type.Union([Type.Literal("summary"), Type.Literal("topology"), Type.Literal("full")]),
);
const componentPathSchema = Type.String({ minLength: 1 });
const targetKindSchema = Type.Optional(
	Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder"), Type.Literal("project")]),
);
const readResultSchema = Type.Union([Type.Object({}, { additionalProperties: true }), ascetPublicErrorResultSchema]);
const readCodeCommonResultProperties = {
	component: Type.String({ minLength: 1 }),
	kind: Type.Optional(Type.String({ minLength: 1 })),
	language: Type.Optional(Type.String({ minLength: 1 })),
	section: Type.Optional(Type.String({ minLength: 1 })),
	name: Type.Optional(Type.String({ minLength: 1 })),
	hash: Type.String({ minLength: 1 }),
	lineCount: Type.Integer({ minimum: 0 }),
	byteCount: Type.Integer({ minimum: 0 }),
};
const readCodeResultSchema = Type.Union([
	Type.Object(
		{
			...readCodeCommonResultProperties,
			detailLevel: Type.Literal("full"),
			text: Type.String(),
		},
		{ additionalProperties: true },
	),
	Type.Object(
		{
			...readCodeCommonResultProperties,
			detailLevel: Type.Union([Type.Literal("summary"), Type.Literal("topology")]),
		},
		{ additionalProperties: true },
	),
	ascetPublicErrorResultSchema,
]);

const readElementDependencyResultSchema = Type.Union([
	Type.Object(
		{
			target: Type.String({ minLength: 1 }),
			kind: Type.String({ minLength: 1 }),
			element: Type.String({ minLength: 1 }),
			total: Type.Integer({ minimum: 0 }),
			items: Type.Array(Type.Unknown()),
		},
		{ additionalProperties: true },
	),
	ascetPublicErrorResultSchema,
]);
const readImplementationResultSchema = Type.Union([
	Type.Object(
		{
			component: Type.String({ minLength: 1 }),
			kind: Type.String({ minLength: 1 }),
			implementationSourceKind: Type.String({ minLength: 1 }),
			implementations: Type.Array(Type.Unknown()),
		},
		{ additionalProperties: true },
	),
	Type.Object(
		{
			component: Type.String({ minLength: 1 }),
			kind: Type.String({ minLength: 1 }),
			implementationSourceKind: Type.String({ minLength: 1 }),
			mode: Type.String({ minLength: 1 }),
			elements: Type.Array(Type.Unknown()),
		},
		{ additionalProperties: true },
	),
	ascetPublicErrorResultSchema,
]);

const readStateMachineFlowResultSchema = Type.Union([
	Type.Object(
		{
			component: Type.String({ minLength: 1 }),
			detailLevel: Type.Literal("summary"),
			counts: Type.Record(Type.String({ minLength: 1 }), Type.Integer({ minimum: 0 })),
			stateNames: Type.Array(Type.String()),
			transitionNames: Type.Array(Type.String()),
		},
		{ additionalProperties: true },
	),
	Type.Object(
		{
			component: Type.String({ minLength: 1 }),
			detailLevel: Type.Literal("topology"),
			counts: Type.Record(Type.String({ minLength: 1 }), Type.Integer({ minimum: 0 })),
			states: Type.Array(Type.Unknown()),
			transitions: Type.Array(Type.Unknown()),
		},
		{ additionalProperties: true },
	),
	Type.Object(
		{
			component: Type.String({ minLength: 1 }),
			stateFlows: Type.Array(Type.Unknown()),
			transitionFlows: Type.Array(Type.Unknown()),
			dependencyChains: Type.Array(Type.Unknown()),
			referenceTrace: Type.Array(Type.Unknown()),
		},
		{ additionalProperties: true },
	),
	ascetPublicErrorResultSchema,
]);

const readSummaryParameters = Type.Object({
	action: Type.Literal("read"),
	componentPath: componentPathSchema,
});
const readCodeParameters = Type.Object({
	action: Type.Literal("read_code"),
	componentPath: componentPathSchema,
	methodName: Type.Optional(Type.String()),
	section: Type.Optional(
		Type.Union([Type.Literal("header"), Type.Literal("external-c"), Type.Literal("all"), Type.Literal("body")]),
	),
	detailLevel: detailLevelSchema,
});
const readMethodSignatureParameters = Type.Object({
	action: Type.Literal("read_method_signature"),
	componentPath: componentPathSchema,
	methodName: Type.String({ minLength: 1 }),
});
const readImplementationParameters = openAiObjectUnionSchema<
	Extract<AscetReadParams, { action: "read_implementation" }>
>([
	Type.Object(
		{
			action: Type.Literal("read_implementation"),
			componentPath: componentPathSchema,
			implementationMode: Type.Literal("impl"),
			implementationName: Type.String({ minLength: 1 }),
			timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("read_implementation"),
			componentPath: componentPathSchema,
			implementationMode: Type.Optional(
				Type.Union([Type.Literal("list"), Type.Literal("default"), Type.Literal("class-impl")]),
			),
			timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
		},
		{ additionalProperties: false },
	),
]);
const readElementParameters = Type.Object({
	action: Type.Literal("read_element"),
	componentPath: componentPathSchema,
	elementName: Type.String({ minLength: 1 }),
	timeoutMs: Type.Optional(Type.Integer({ minimum: 1, maximum: 300_000 })),
});
const readBlockDiagramParameters = Type.Object({
	action: Type.Literal("read_block_diagram"),
	componentPath: componentPathSchema,
	diagramName: Type.Optional(Type.String()),
	timeoutMs: Type.Optional(
		Type.Number({
			description: "Optional read_block_diagram execution timeout in milliseconds. Defaults to 60000.",
			minimum: 1_000,
		}),
	),
});
const readStateMachineFlowParameters = Type.Object({
	action: Type.Literal("read_state_machine_flow"),
	componentPath: componentPathSchema,
	detailLevel: detailLevelSchema,
	traceDepth: Type.Optional(Type.Number({ minimum: 0 })),
});
const readElementDependencyParameters = openAiObjectUnionSchema<
	Extract<AscetReadParams, { action: "read_element_dependency" }>
>([
	Type.Object(
		{
			action: Type.Literal("read_element_dependency"),
			targetPath: Type.String({ minLength: 1 }),
			componentPath: Type.Optional(Type.String({ minLength: 1 })),
			elementName: Type.String({ minLength: 1 }),
			targetKind: targetKindSchema,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("read_element_dependency"),
			targetPath: Type.Optional(Type.String({ minLength: 1 })),
			componentPath: Type.String({ minLength: 1 }),
			elementName: Type.String({ minLength: 1 }),
			targetKind: targetKindSchema,
		},
		{ additionalProperties: false },
	),
]);

export const ascetReadActionContracts = [
	defineAscetAction({
		tool: "ascet_read",
		action: "read_code",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readCodeParameters,
		result: readCodeResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetReadCode", operation: "read_text_code" },
		guidance: {
			compact: "read complete live code; not global code search",
			intent: "Read complete current code text from a resolved ASCET component or method.",
			useWhen: ["Need complete live code for a known component, method, C header, or external C section."],
			avoidWhen: ["Need candidate discovery by name or code text; use ascet_search first."],
			aliases: ["complete code", "full code", "method body", "live code", "read code", "open code"],
			nextActions: ["ascet_edit.set_method_code", "ascet_diff.diff_method"],
			result: {
				shape: "codeText",
				fields: ["component", "name", "section", "detailLevel", "text", "hash", "lineCount", "byteCount"],
			},
			summary: "Read complete code live from ASCET only after resolving the target.",
			rules: [
				'Use read_code when the user explicitly needs live code; it returns complete live text by default. Use detailLevel="summary" only when a hash/count summary is enough.',
				"Use read_code section=header or external-c only for C module targets; for ESDL class/module method code pass methodName with section=body or all.",
				"read_code is a live ToolAPI read for one exact target; use Pi grep on stored get observations for offline text filtering.",
			],
			fewShots: [
				{
					intent: "read code",
					args: { action: "read_code", componentPath: "DEMO/PID", methodName: "calc", section: "body" },
				},
			],
			tags: ["code", "live-read"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_method_signature",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readMethodSignatureParameters,
		result: readResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetReadMethodSignature",
			operation: "read_method_signature",
		},
		guidance: {
			summary: "Verify primitive method return type and arguments.",
			rules: [
				"Use read_method_signature to verify a method's primitive return type and arguments after create_method or set_method_signature.",
			],
			fewShots: [
				{
					intent: "read signature",
					args: { action: "read_method_signature", componentPath: "DEMO/PID", methodName: "calc" },
				},
			],
			tags: ["method", "live-read", "verify"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_element",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readElementParameters,
		result: readResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetReadElementCatalog", operation: "read_element_catalog" },
		guidance: {
			summary: "Read complete metadata for one exact resolved Element.",
			rules: [
				"Use read_element after ascet_search identifies a candidate Component and Element name; validate the exact path before relying on metadata.",
				"Use this action for exact kind, modelType, scope, value, calibration, range, and implementation metadata; do not use it for folder discovery.",
			],
			fewShots: [
				{
					intent: "read element",
					args: { action: "read_element", componentPath: "DEMO/PID", elementName: "pid_kp" },
				},
			],
			tags: ["element", "implementation", "live-read", "verify"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_implementation",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		supportedObjectKinds: ["class", "module", "statemachine", "enumeration"],
		parameters: readImplementationParameters,
		result: readImplementationResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetReadImplementation", operation: "read_implementation" },
		guidance: {
			result: {
				shape: "implementation",
				fields: ["component", "kind", "implementationSourceKind", "implementations", "mode", "elements"],
			},
			summary: "Read implementation metadata for a resolved component or Enumeration.",
			rules: [
				"Use read_implementation when implementation metadata matters more than code text.",
				"For Enumeration targets, inspect typeDefinition.enumerators; this is the supported exact enumerator readback path.",
			],
			fewShots: [
				{
					intent: "read impl",
					args: { action: "read_implementation", componentPath: "DEMO/PID", implementationMode: "default" },
				},
			],
			tags: ["implementation", "live-read"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_block_diagram",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readBlockDiagramParameters,
		result: readResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetReadBlockDiagram", operation: "read_block_diagram" },
		guidance: {
			aliases: ["read block diagram", "BDE", "diagram content", "block diagram"],
			result: { shape: "blockDiagram", fields: ["component", "name", "items", "counts"] },
			summary: "Read a BDE/block-diagram surface for resolved class or module targets.",
			rules: [
				"Use read_block_diagram only for resolved class/module targets with a BDE/block-diagram surface; for ESDL text components prefer read_code or read_implementation.",
				"Treat an empty block-diagram payload as an empty diagram, not evidence that the component is missing.",
				"read_block_diagram accepts timeoutMs in milliseconds and defaults to 60000.",
			],
			fewShots: [
				{
					intent: "read BDE",
					args: { action: "read_block_diagram", componentPath: "DEMO/PID", diagramName: "Main" },
				},
			],
			tags: ["diagram", "live-read"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_state_machine_flow",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readStateMachineFlowParameters,
		result: readStateMachineFlowResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetReadStateMachineFlow",
			operation: "read_state_machine_flow",
		},
		guidance: {
			result: {
				shape: "stateMachineFlow",
				fields: [
					"component",
					"detailLevel",
					"states",
					"transitions",
					"stateFlows",
					"transitionFlows",
					"traceDepth",
				],
			},
			summary: "Read state-machine flow only for resolved StateMachine targets.",
			rules: [
				"Use read_state_machine_flow only for resolved StateMachine targets; for classes/modules use read_code or read_implementation.",
			],
			fewShots: [
				{
					intent: "read SM flow",
					args: { action: "read_state_machine_flow", componentPath: "DEMO/SM", detailLevel: "summary" },
				},
			],
			tags: ["state-machine", "live-read"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read_element_dependency",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readElementDependencyParameters,
		result: readElementDependencyResultSchema,
		execution: {
			kind: "bridge",
			logicalCommandId: "AscetReadElementDependency",
			operation: "read_element_dependency",
		},
		guidance: {
			result: { shape: "elementDependency", fields: ["target", "kind", "element", "total", "items", "error"] },
			summary: "Read dependency flag and formula for one existing element.",
			rules: [
				"Use read_element_dependency only when you need the raw dependency flag or formula; use read_dependent_chain before create_dependent_chain when inspecting an existing chain.",
				"Use read_dependent_chain when provider-chain consistency also matters.",
			],
			fewShots: [
				{
					intent: "dependency state",
					args: {
						action: "read_element_dependency",
						componentPath: "FeatureA/Consumer",
						elementName: "C_K_Effective",
						targetKind: "component",
					},
				},
			],
			tags: ["dependency", "live-read", "verify"],
		},
	}),
	defineAscetAction({
		tool: "ascet_read",
		action: "read",
		selector: "action",
		visibility: "public",
		profiles: ASCET_READ_PROFILES,
		parameters: readSummaryParameters,
		result: readResultSchema,
		execution: { kind: "bridge", logicalCommandId: "AscetReadComponentSummary", operation: "read_component_summary" },
		guidance: {
			summary: "Read a live summary for one exact resolved Component.",
			rules: [
				"Use read for independent Class, Module, or StateMachine checks after componentPath is resolved exactly; tree discovery is optional when an exact path or OID is already validated.",
				"Use ascet_get.formulas instead for Project formula checks.",
			],
			fewShots: [{ intent: "read component summary", args: { action: "read", componentPath: "DEMO/PID" } }],
			tags: ["component", "summary", "live-read", "verify"],
		},
	}),
] as const;

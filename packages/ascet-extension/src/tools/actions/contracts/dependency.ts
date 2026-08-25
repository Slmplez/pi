import { Type } from "typebox";
import { ascetMutationPublicResultSchema } from "../../../edit/result-contract.ts";
import {
	type AscetParameterDataDecision,
	type AscetParameterImplementationDecision,
	type AscetParameterRangeDecision,
	ascetParameterDataDecisionSchema,
	ascetParameterRangeDecisionSchema,
} from "../../../element-spec-contract.ts";
import { ASCET_READ_PROFILES, ASCET_WRITE_PROFILES } from "./profiles.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export type AscetCreateDependentChainExplicitImplementation = Extract<
	AscetParameterImplementationDecision,
	{ mode: "explicit" }
>;

export interface AscetCreateDependentChainProviderElement {
	name: string;
	modelType: string;
	unit: string;
	comment: string;
	calibration: boolean;
	range: AscetParameterRangeDecision;
	data: AscetParameterDataDecision;
	implementation: AscetCreateDependentChainExplicitImplementation;
}

export interface AscetCreateDependentChainImportedElement {
	name: string;
	modelType: string;
	unit?: string;
}

export interface AscetCreateDependentChainLocalElement {
	name: string;
	modelType: string;
	unit: string;
	comment: string;
	calibration: boolean;
	range: AscetParameterRangeDecision;
	implementation: AscetCreateDependentChainExplicitImplementation;
}

export interface AscetCreateDependentChainParams {
	action: "create_dependent_chain";
	provider: {
		componentPath: string;
		projectPath?: string;
		element: AscetCreateDependentChainProviderElement;
	};
	consumer: {
		componentPath: string;
		projectPath?: string;
		importedElement: AscetCreateDependentChainImportedElement;
		localElement: AscetCreateDependentChainLocalElement;
	};
	binding: {
		formula: string;
		formal: string;
		variantPolicy: "default" | "selected" | "all";
		variants?: string[];
	};
	intent: "apply";
}

const explicitImplementationSchema = Type.Object(
	{
		mode: Type.Literal("explicit"),
		valueType: Type.String({ minLength: 1 }),
		memoryLocation: Type.String({ minLength: 1 }),
		formula: Type.String({ minLength: 1 }),
		limitAssignments: Type.Union([Type.Boolean(), Type.Null()]),
	},
	{ additionalProperties: false },
);

const providerElementSchema = Type.Object(
	{
		name: Type.String({ minLength: 1 }),
		modelType: Type.String({ minLength: 1 }),
		unit: Type.String(),
		comment: Type.String(),
		calibration: Type.Boolean(),
		range: ascetParameterRangeDecisionSchema,
		data: ascetParameterDataDecisionSchema,
		implementation: explicitImplementationSchema,
	},
	{ additionalProperties: false },
);

const importedElementSchema = Type.Object(
	{
		name: Type.String({ minLength: 1 }),
		modelType: Type.String({ minLength: 1 }),
		unit: Type.Optional(Type.String()),
	},
	{ additionalProperties: false },
);

const localElementSchema = Type.Object(
	{
		name: Type.String({ minLength: 1 }),
		modelType: Type.String({ minLength: 1 }),
		unit: Type.String(),
		comment: Type.String(),
		calibration: Type.Boolean(),
		range: ascetParameterRangeDecisionSchema,
		implementation: explicitImplementationSchema,
	},
	{ additionalProperties: false },
);

export const ascetCreateDependentChainActionSchema = Type.Object(
	{
		action: Type.Literal("create_dependent_chain"),
		provider: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				projectPath: Type.Optional(Type.String({ minLength: 1 })),
				element: providerElementSchema,
			},
			{ additionalProperties: false },
		),
		consumer: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				projectPath: Type.Optional(Type.String({ minLength: 1 })),
				importedElement: importedElementSchema,
				localElement: localElementSchema,
			},
			{ additionalProperties: false },
		),
		binding: Type.Object(
			{
				formula: Type.String({ minLength: 1 }),
				formal: Type.String({ minLength: 1 }),
				variantPolicy: Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")]),
				variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
			},
			{ additionalProperties: false },
		),
		intent: Type.Literal("apply"),
	},
	{ additionalProperties: false },
);

export const ascetReadDependentChainActionParameters = Type.Object(
	{
		action: Type.Literal("read_dependent_chain"),
		componentPath: Type.String({ minLength: 1 }),
		dependentElement: Type.String({ minLength: 1 }),
		exporterComponentPath: Type.Optional(Type.String({ minLength: 1 })),
	},
	{ additionalProperties: false },
);

const ascetDependentChainElementSchema = Type.Record(Type.String({ minLength: 1 }), Type.Unknown());

const ascetDependentChainReadSuccessSchema = Type.Object(
	{
		found: Type.Literal(true),
		chain: Type.Object(
			{
				local: Type.Object({
					componentPath: Type.String({ minLength: 1 }),
					element: Type.String({ minLength: 1 }),
				}),
				imported: Type.Object({
					componentPath: Type.String({ minLength: 1 }),
					element: Type.String({ minLength: 1 }),
				}),
				exported: Type.Object({
					componentPath: Type.String({ minLength: 1 }),
					element: Type.String({ minLength: 1 }),
				}),
			},
			{ additionalProperties: false },
		),
		provider: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				element: ascetDependentChainElementSchema,
			},
			{ additionalProperties: false },
		),
		consumer: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				imported: ascetDependentChainElementSchema,
				local: ascetDependentChainElementSchema,
			},
			{ additionalProperties: false },
		),
		dependencyFormula: ascetDependentChainElementSchema,
		binding: ascetDependentChainElementSchema,
		complete: Type.Literal(true),
	},
	{ additionalProperties: false },
);

export const ascetReadDependentChainActionContract = defineAscetAction({
	tool: "ascet_read",
	action: "read_dependent_chain",
	selector: "action",
	visibility: "public",
	profiles: ASCET_READ_PROFILES,
	parameters: ascetReadDependentChainActionParameters,
	result: Type.Union([ascetDependentChainReadSuccessSchema, ascetPublicErrorResultSchema]),
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetReadDependentChain",
		operation: "read_dependent_chain",
	},
	guidance: {
		compact: "read one exact Local/Imported/Exported Parameter dependency chain",
		intent: "Read the current dependency chain for a known Consumer Local Parameter.",
		useWhen: [
			"The Consumer Component and Local Parameter are already known.",
			"The Provider must be resolved by live native Element Search or verified from an explicit exact path.",
		],
		avoidWhen: [
			"The Consumer Component or Local Parameter is unknown; use ascet_search and exact reads first.",
			"Need to create, complete, or configure the chain; use ascet_edit.create_dependent_chain.",
		],
		aliases: [
			"dependent chain",
			"dependency provider",
			"exported parameter provider",
			"local imported exported parameter",
		],
		nextActions: ["ascet_edit.create_dependent_chain"],
		result: {
			shape: "dependentChain",
			fields: ["found", "chain", "provider", "consumer", "dependencyFormula", "binding", "complete", "error"],
		},
		summary:
			"Exact dependency-chain read for a Local Parameter with an optional explicit Exported provider constraint.",
		rules: [
			"Resolve the exact Consumer Component and Local Parameter before calling read_dependent_chain.",
			"If exporterComponentPath is omitted, Runtime performs live native Element Search and accepts only one exact validated Exported Parameter. Never choose the first same-named result.",
			"The formula reported by read_dependent_chain is the local dependent parameter expression, not an implementation conversion formula or project formula.",
			"The Imported Parameter in the consuming component and the Exported Parameter in the provider component must have the same name.",
		],
		fewShots: [
			{
				intent: "dependent chain",
				args: {
					action: "read_dependent_chain",
					componentPath: "FeatureA/Consumer",
					dependentElement: "C_K_Effective",
				},
			},
		],
		tags: ["dependency", "provider-discovery", "live-read"],
	},
});

export const ascetCreateDependentChainActionContract = defineAscetAction({
	tool: "ascet_edit",
	action: "create_dependent_chain",
	selector: "action",
	visibility: "public",
	profiles: ASCET_WRITE_PROFILES,
	supportedObjectKinds: ["class", "module", "statemachine"],
	parameters: ascetCreateDependentChainActionSchema,
	result: ascetMutationPublicResultSchema,
	execution: {
		kind: "bridge",
		logicalCommandId: "AscetCreateDependentChain",
		operation: "configure_parameter_dependency_chain_execute",
	},
	guidance: {
		compact:
			'Create one Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> Parameter chain. Provider and Local require explicit implementation with valueType, memoryLocation, formula, and limitAssignments; Imported is structural only. ident needs no projectPath; another formula needs the matching Provider or Consumer projectPath. Standard binding uses formula="x", formal="x"; apply verifies readback.',
		intent:
			"Create missing compatible endpoints, reuse exact endpoints, configure one dependency, and verify it by automatic readback.",
		useWhen: [
			"A complete explicit Element and binding definition is available for apply.",
			"The previous set-only case must configure a dependency between existing exact Elements.",
		],
		avoidWhen: [
			"Formula, Formal, Element type, scope, unit, range, implementation, or DataVariant metadata would need to be guessed.",
			"Provider Search returns zero or multiple exact validated candidates and no explicit componentPath is available.",
		],
		aliases: ["create dependent chain", "set dependent chain", "dependency chain write", "bind imported parameter"],
		nextActions: ["ascet_read.read_dependent_chain"],
		result: { shape: "dependentChainWrite", fields: ["ok", "changed", "verified", "created", "configured", "code"] },
		summary: "Create or verify one Provider/Imported/Local Parameter dependency chain.",
		rules: [
			"Use this action once for one complete Provider Exported P_<Name> -> Consumer Imported P_<Name> -> Consumer Local Dependent C_<Name> chain.",
			'Provider and Local each require implementation.mode="explicit" with valueType, memoryLocation, formula, and limitAssignments.',
			"For a ranged discrete implementation, set limitAssignments=true. For real32 or real64, set limitAssignments=null.",
			"Imported contains only name, modelType, and optional unit. Provider and Imported names must match exactly.",
			'Use formula="ident" without projectPath. Another Provider formula requires provider.projectPath; another Local formula requires consumer.projectPath; each Formula must exist in that Project.',
			'For the standard one-input binding, use binding.formula="x", binding.formal="x", and binding.variantPolicy="default". Do not add a mapping field.',
			'Use intent="apply". Missing compatible endpoints are created, exact endpoints are reused, conflicts are rejected, and success includes automatic readback.',
		],
		fewShots: [
			{
				intent: "create identity dependency chain",
				args: {
					action: "create_dependent_chain",
					provider: {
						componentPath: "FeatureA/Provider",
						element: {
							name: "P_Threshold",
							modelType: "cont",
							unit: "",
							comment: "Threshold calibration",
							calibration: true,
							range: { mode: "implementation", min: 0, max: 65_535 },
							data: { mode: "explicit", value: 100 },
							implementation: {
								mode: "explicit",
								valueType: "uint16",
								memoryLocation: "Default",
								formula: "ident",
								limitAssignments: true,
							},
						},
					},
					consumer: {
						componentPath: "FeatureA/Consumer",
						importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
						localElement: {
							name: "C_Threshold",
							modelType: "cont",
							unit: "",
							comment: "Threshold dependency",
							calibration: false,
							range: { mode: "implementation", min: 0, max: 65_535 },
							implementation: {
								mode: "explicit",
								valueType: "uint16",
								memoryLocation: "Default",
								formula: "ident",
								limitAssignments: true,
							},
						},
					},
					binding: { formula: "x", formal: "x", variantPolicy: "default" },
					intent: "apply",
				},
			},
			{
				intent: "create dependency chain with Project formulas",
				args: {
					action: "create_dependent_chain",
					provider: {
						componentPath: "FeatureA/Provider",
						projectPath: "<Provider Project containing ProviderFormula>",
						element: {
							name: "P_Value",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: true,
							range: { mode: "implementation", min: 0, max: 65_535 },
							data: { mode: "explicit", value: 100 },
							implementation: {
								mode: "explicit",
								valueType: "uint16",
								memoryLocation: "Default",
								formula: "<ProviderFormula>",
								limitAssignments: true,
							},
						},
					},
					consumer: {
						componentPath: "FeatureA/Consumer",
						projectPath: "<Consumer Project containing LocalFormula>",
						importedElement: { name: "P_Value", modelType: "cont", unit: "" },
						localElement: {
							name: "C_Value",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: false,
							range: { mode: "implementation", min: 0, max: 65_535 },
							implementation: {
								mode: "explicit",
								valueType: "uint16",
								memoryLocation: "Default",
								formula: "<LocalFormula>",
								limitAssignments: true,
							},
						},
					},
					binding: { formula: "x", formal: "x", variantPolicy: "default" },
					intent: "apply",
				},
			},
		],
		tags: ["write", "dependency", "create", "readback"],
	},
});

export const ascetDependencyActionContracts = [
	ascetReadDependentChainActionContract,
	ascetCreateDependentChainActionContract,
] as const;

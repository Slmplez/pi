import { Type } from "typebox";
import { ascetMutationPublicResultSchema } from "../../../edit/result-contract.ts";
import {
	type AscetParameterDataDecision,
	type AscetParameterImplementationDecision,
	type AscetParameterRangeDecision,
	ascetParameterDataDecisionSchema,
	ascetParameterImplementationDecisionSchema,
	ascetParameterRangeDecisionSchema,
} from "../../../element-spec-contract.ts";
import { ASCET_READ_PROFILES, ASCET_WRITE_PROFILES } from "./profiles.ts";
import { ascetPublicErrorResultSchema } from "./shared-results.ts";
import { defineAscetAction } from "./types.ts";

export interface AscetCreateDependentChainProviderElement {
	name: string;
	modelType: string;
	unit: string;
	comment: string;
	calibration: boolean;
	range: AscetParameterRangeDecision;
	data: AscetParameterDataDecision;
	implementation: AscetParameterImplementationDecision;
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
	implementation: AscetParameterImplementationDecision;
}

export interface AscetCreateDependentChainParams {
	action: "create_dependent_chain";
	provider: {
		componentPath: string;
		element: AscetCreateDependentChainProviderElement;
	};
	consumer: {
		componentPath: string;
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

const providerElementSchema = Type.Object(
	{
		name: Type.String({ minLength: 1 }),
		modelType: Type.String({ minLength: 1 }),
		unit: Type.String(),
		comment: Type.String(),
		calibration: Type.Boolean(),
		range: ascetParameterRangeDecisionSchema,
		data: ascetParameterDataDecisionSchema,
		implementation: ascetParameterImplementationDecisionSchema,
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
		implementation: ascetParameterImplementationDecisionSchema,
	},
	{ additionalProperties: false },
);

export const ascetCreateDependentChainActionSchema = Type.Object(
	{
		action: Type.Literal("create_dependent_chain"),
		provider: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				element: providerElementSchema,
			},
			{ additionalProperties: false },
		),
		consumer: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
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
		compact: "create-or-verify one Provider/Imported/Local Parameter dependency chain",
		intent:
			"Create missing Elements, reuse exact Elements, configure one explicit dependency, and verify by automatic readback.",
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
			"This mutation action executes only with intent=apply.",
			"Runtime permission handling performs any required confirmation in the same apply call.",
			"Use mode=check for read-only editability inspection and ascet_read.read_dependent_chain for dependency inspection.",
			"Runtime performs a fresh same-session editable=true check immediately before each real mutation.",
			"Do not call mode=check merely to authorize a write, and never call mode=set without explicit user intent.",
			"Executed writes always perform mandatory action-specific readback verification.",
			"Do not request or disable verification through ascet_edit parameters.",
			"Provide explicit Element definitions. Missing Elements are created; exact existing Elements are reused; conflicts are never overwritten.",
			"provider.componentPath is required; the normal write route does not discover providers.",
			"Apply always performs automatic full readback. A successful apply is verified before it is returned.",
			"Use one explicit Formula/Formal/Imported binding only; never guess binding or DataVariant metadata.",
			'For the standard identity binding, use formula="x", formal="x", and map x to consumer.importedElement.name; do not use the Imported Parameter name as the formal.',
		],
		fewShots: [
			{
				intent: "create dependency chain",
				args: {
					action: "create_dependent_chain",
					provider: {
						componentPath: "FeatureA/Provider",
						element: {
							name: "P_Threshold",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: false,
							range: { mode: "none" },
							data: { mode: "ascetDefault" },
							implementation: { mode: "ascetDefault" },
						},
					},
					consumer: {
						componentPath: "FeatureA/Consumer",
						importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
						localElement: {
							name: "C_Threshold",
							modelType: "cont",
							unit: "",
							comment: "",
							calibration: false,
							range: { mode: "none" },
							implementation: { mode: "ascetDefault" },
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

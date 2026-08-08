import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import { runAscetApplyElementSpec } from "./apply-element-spec.ts";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "./cli.ts";
import { runAscetCliJson } from "./cli.ts";
import {
	type CompensatingRollbackContext,
	type CompensatingRollbackOrchestrator,
	type CompensatingRollbackResult,
	type CompensatingRollbackStage,
	createCompensatingRollbackOrchestrator,
} from "./configure-parameter-dependency-chain-rollback.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "./core/tool.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import { requestAscetEditApproval } from "./edit/approval.ts";
import type { RunAscetEditOperationOptions } from "./edit/common.ts";
import { fingerprintJson, removeTemporaryElementSpec, writeTemporaryElementSpec } from "./edit/element-spec-plan.ts";
import {
	type AscetPlanJsonValue,
	type AscetPlanRecord,
	AscetPlanStore,
	AscetPlanStoreError,
	createAscetPlanBinding,
} from "./edit/plan-store.ts";
import { recordAscetWriteTelemetry } from "./edit/write-telemetry.ts";
import {
	type AscetConsumerImportedParameterCreateInput,
	type AscetLocalDependentParameterCreateInput,
	type AscetProviderExportedParameterCreateInput,
	ascetConsumerImportedParameterCreateSchema,
	ascetLocalDependentParameterCreateSchema,
	ascetProviderExportedParameterCreateSchema,
	normalizeAscetElementSpec,
} from "./element-spec-contract.ts";
import { getAscetArtifactRoot } from "./observation-store.ts";
import { renderAscetToolCall, renderAscetToolResult } from "./rendering.ts";
import {
	type AscetDependencyMappingTarget,
	type AscetSetElementDependencyParams,
	runAscetSetElementDependency,
} from "./set-element-dependency.ts";
import { openAiObjectUnionSchema } from "./tools/_shared/openai-schema.ts";
import { buildToolPromptGuidelines } from "./tools/instructions/registry.ts";

const PLAN_OPERATION = "configure_parameter_dependency_chain";

type ChainStageName = "provider_spec" | "consumer_spec" | "local_spec" | "dependency";
type ChainStageStatus = "preflighted" | "committed" | "failed";

export type ConfigureParameterDependencyTarget = AscetDependencyMappingTarget;
export type { CompensatingRollbackContext, CompensatingRollbackOrchestrator, CompensatingRollbackResult };

export interface ConfigureParameterDependencyElement<TElement> {
	componentPath: string;
	element: TElement;
}

export interface ConfigureParameterDependencyDefinition {
	provider: ConfigureParameterDependencyElement<AscetProviderExportedParameterCreateInput>;
	consumer: ConfigureParameterDependencyElement<AscetConsumerImportedParameterCreateInput>;
	local: ConfigureParameterDependencyElement<AscetLocalDependentParameterCreateInput>;
	dependency: {
		formula: string;
		formals: string[];
		bindingPolicy: "explicit";
		mappings: Record<string, ConfigureParameterDependencyTarget>;
		variantPolicy: "default" | "selected" | "all";
		variants?: string[];
	};
	verifyReadback: true;
}

export type ConfigureParameterDependencyChainParams =
	| (ConfigureParameterDependencyDefinition & { mode: "plan"; planId?: never })
	| { mode: "commit"; planId: string };

type ConfigureParameterDependencyExecutionParams = ConfigureParameterDependencyDefinition &
	({ mode: "plan"; planId?: never } | { mode: "commit"; planId: string });

export interface ConfigureParameterDependencyChainOptions extends RunAscetEditOperationOptions {
	timeoutMs?: number;
	planStore?: AscetPlanStore;
	rollbackOrchestrator?: CompensatingRollbackOrchestrator;
}

export interface ConfigureParameterDependencyRollbackEvidence {
	kind: "element-spec";
	stage: Exclude<ChainStageName, "dependency">;
	target: string;
	componentPath: string;
	elementName: string;
	specDocument: unknown;
}

export interface ConfigureParameterDependencyDependencyRollbackEvidence {
	kind: "dependency";
	stage: "dependency";
	target: string;
	targetPath: string;
	elementName: string;
	beforeDependency: "dependent" | "independent";
	beforeFormula: string;
	beforeMappings?: Record<string, ConfigureParameterDependencyTarget>;
	beforeVariantMappings?: Record<string, Record<string, ConfigureParameterDependencyTarget>>;
	variantPolicy?: "default" | "selected" | "all";
	variants?: string[];
	preflightResult: unknown;
}

export interface ChainStageReport {
	stage: ChainStageName;
	operation: "apply_element_spec" | "set_element_dependency";
	target: string;
	status: ChainStageStatus;
	result?: unknown;
	specHash?: string;
	readbackVerified?: boolean;
	rollbackEligible?: boolean;
	error?: { code: string; message: string };
	rollbackEvidence?:
		| ConfigureParameterDependencyRollbackEvidence
		| ConfigureParameterDependencyDependencyRollbackEvidence;
}

interface ChainRollbackReport {
	required: boolean;
	evidenceCaptured: boolean;
	result: CompensatingRollbackResult;
}

export type ConfigureParameterDependencyChainResult =
	| {
			status: "planned";
			mode: "plan";
			planId: string;
			fingerprint: string;
			stages: ChainStageReport[];
			writesPerformed: false;
			atomic: false;
			rollback: ChainRollbackReport;
			limitations: string[];
	  }
	| {
			status: "committed";
			mode: "commit";
			planId: string;
			fingerprint: string;
			stages: ChainStageReport[];
			writesPerformed: true;
			atomic: true;
			rollback: ChainRollbackReport;
			limitations: string[];
	  }
	| {
			status: "blocked" | "error";
			mode: "plan" | "commit";
			planId?: string;
			fingerprint?: string;
			writesPerformed: boolean;
			atomic: false;
			error: { code: string; message: string; details?: unknown };
			stages: ChainStageReport[];
			rollback: ChainRollbackReport;
			limitations: string[];
	  };

const dependencyTargetSchema = Type.Object(
	{
		kind: Type.Union([Type.Literal("parameter"), Type.Literal("constant"), Type.Literal("systemConstant")]),
		name: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const chainProperties = {
	provider: Type.Object(
		{
			componentPath: Type.String({ minLength: 1 }),
			element: ascetProviderExportedParameterCreateSchema,
		},
		{ additionalProperties: false },
	),
	consumer: Type.Object(
		{
			componentPath: Type.String({ minLength: 1 }),
			element: ascetConsumerImportedParameterCreateSchema,
		},
		{ additionalProperties: false },
	),
	local: Type.Object(
		{
			componentPath: Type.String({ minLength: 1 }),
			element: ascetLocalDependentParameterCreateSchema,
		},
		{ additionalProperties: false },
	),
	dependency: Type.Object(
		{
			formula: Type.String({ minLength: 1 }),
			formals: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true }),
			bindingPolicy: Type.Literal("explicit"),
			mappings: Type.Record(Type.String({ minLength: 1 }), dependencyTargetSchema),
			variantPolicy: Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")]),
			variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
		},
		{ additionalProperties: false },
	),
	verifyReadback: Type.Literal(true),
} as const;

const configureDefinitionSchema = Type.Object(chainProperties, { additionalProperties: false });
const configurePlanSchema = Type.Object(
	{ mode: Type.Literal("plan"), ...chainProperties },
	{ additionalProperties: false },
);
const configureCommitSchema = Type.Object(
	{ mode: Type.Literal("commit"), planId: Type.String({ minLength: 1 }) },
	{ additionalProperties: false },
);
const configureValidationSchema = Type.Union([configurePlanSchema, configureCommitSchema]);

export const configureParameterDependencyChainParameters =
	openAiObjectUnionSchema<ConfigureParameterDependencyChainParams>([configurePlanSchema, configureCommitSchema]);

const PLAN_LIMITATIONS = [
	"Dependency preflight exports temporary main/data AMD files, overlays the pending Consumer and Local Element specs, and validates the real XML dependency mutation without importing it.",
	"The common AscetPlanStore fingerprint includes the complete definition and all four backend preflight payloads.",
	"The chain uses compensating rollback, not a cross-command ASCET transaction; rollback evidence is captured before commit.",
];

function noRollbackReport(required = false, evidenceCaptured = false): ChainRollbackReport {
	return {
		required,
		evidenceCaptured,
		result: { status: "succeeded", attempted: false, stages: [] },
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function asPlanJson(value: unknown): AscetPlanJsonValue {
	if (value === undefined) {
		return null;
	}
	const serialized = JSON.stringify(value);
	if (serialized === undefined) {
		return null;
	}
	return JSON.parse(serialized) as AscetPlanJsonValue;
}

function definitionWithoutControl(params: ConfigureParameterDependencyDefinition): AscetPlanJsonValue {
	return asPlanJson({
		provider: params.provider,
		consumer: params.consumer,
		local: params.local,
		dependency: params.dependency,
		verifyReadback: params.verifyReadback,
	});
}

function createBackendPreflightPayload(stages: ChainStageReport[]): AscetPlanJsonValue {
	return asPlanJson({
		stages: stages.map((stage) => ({
			stage: stage.stage,
			operation: stage.operation,
			target: stage.target,
			status: stage.status,
			result: stage.result,
			specHash: stage.specHash ?? null,
			readbackVerified: stage.readbackVerified ?? null,
			error: stage.error ?? null,
		})),
		rollbackEvidence: stages
			.filter((stage) => stage.rollbackEvidence !== undefined)
			.map((stage) => stage.rollbackEvidence),
	});
}

function createBaseFailure(
	mode: "plan" | "commit",
	stages: ChainStageReport[],
	error: { code: string; message: string; details?: unknown },
	planId?: string,
	fingerprint?: string,
	writesPerformed = false,
	rollback = noRollbackReport(writesPerformed),
): ConfigureParameterDependencyChainResult {
	return {
		status: "error",
		mode,
		planId,
		fingerprint,
		writesPerformed,
		atomic: false,
		error,
		stages,
		rollback,
		limitations: [...PLAN_LIMITATIONS],
	};
}

function validateChainParams(
	value: unknown,
): { params: ConfigureParameterDependencyChainParams } | { error: { code: string; message: string } } {
	if (!Value.Check(configureValidationSchema, value)) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_invalid_parameter",
				message:
					"Invalid chain parameters. The plan/commit contract rejects unknown properties and ambiguous values.",
			},
		};
	}
	const params = value as ConfigureParameterDependencyChainParams;
	if (params.mode === "commit") {
		return { params };
	}
	const providerPath = normalizeAscetPath(params.provider.componentPath);
	const consumerPath = normalizeAscetPath(params.consumer.componentPath);
	const localPath = normalizeAscetPath(params.local.componentPath);
	if (providerPath === consumerPath) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_invalid_scope",
				message: "provider.componentPath and consumer.componentPath must identify different components.",
			},
		};
	}
	if (consumerPath !== localPath) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_invalid_scope",
				message:
					"local.componentPath must equal consumer.componentPath because the local dependent parameter is configured in the consumer.",
			},
		};
	}
	if (Object.keys(params.dependency.mappings).length === 0) {
		return {
			error: {
				code: "dependency_mappings_required",
				message: "The chain requires explicit dependency mappings; formula identifiers are never inferred.",
			},
		};
	}
	const hasImportedParameterMapping = Object.values(params.dependency.mappings).some(
		(target) => target.kind === "parameter" && target.name === params.consumer.element.name,
	);
	if (!hasImportedParameterMapping) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_provider_mapping_required",
				message: "dependency.mappings must explicitly bind at least one formal to the consumer imported Parameter.",
			},
		};
	}
	const formals = [...params.dependency.formals].sort();
	const mappingFormals = Object.keys(params.dependency.mappings).sort();
	if (formals.length !== mappingFormals.length || formals.some((formal, index) => formal !== mappingFormals[index])) {
		return {
			error: {
				code: "dependency_mapping_formals_mismatch",
				message: "dependency.formals and dependency.mappings keys must match exactly.",
			},
		};
	}
	if (
		params.dependency.variantPolicy === "selected" &&
		(!params.dependency.variants || params.dependency.variants.length === 0)
	) {
		return {
			error: {
				code: "data_variant_selection_required",
				message: 'dependency.variantPolicy="selected" requires explicit dependency.variants.',
			},
		};
	}
	if (params.dependency.variantPolicy !== "selected" && params.dependency.variants !== undefined) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_invalid_parameter",
				message: "dependency.variants is only valid with dependency.variantPolicy=selected.",
			},
		};
	}
	return { params };
}

function dependencyMutation(
	params: ConfigureParameterDependencyDefinition,
	overlaySpecFiles?: string[],
): AscetSetElementDependencyParams {
	return {
		targetPath: params.consumer.componentPath,
		elementName: params.local.element.name,
		dependency: "dependent",
		dependencyFormula: params.dependency.formula,
		dependencyFormals: params.dependency.formals,
		bindingPolicy: params.dependency.bindingPolicy,
		dependencyMappings: params.dependency.mappings,
		variantPolicy: params.dependency.variantPolicy,
		variants: params.dependency.variants,
		dryRun: true,
		verifyReadback: true,
		overlaySpecFiles,
	};
}

function preflightFailure(
	stage: ChainStageName,
	operation: ChainStageReport["operation"],
	target: string,
	code: string,
	message: string,
): ChainStageReport {
	return { stage, operation, target, status: "failed", error: { code, message } };
}

interface PreparedChainElement {
	componentPath: string;
	elementName: string;
	specDocument: { elements: Record<string, unknown>[] };
	specHash: string;
	specFile: string;
}

function prepareInlineElement(
	input: ConfigureParameterDependencyElement<
		| AscetProviderExportedParameterCreateInput
		| AscetConsumerImportedParameterCreateInput
		| AscetLocalDependentParameterCreateInput
	>,
	options: ConfigureParameterDependencyChainOptions,
): PreparedChainElement {
	const normalized = normalizeAscetElementSpec("create", [input.element], []);
	const specDocument = normalized.spec;
	return {
		componentPath: input.componentPath,
		elementName: input.element.name,
		specDocument,
		specHash: fingerprintJson(specDocument),
		specFile: writeTemporaryElementSpec(
			specDocument,
			getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
		),
	};
}

async function captureRollbackEvidence(
	stage: Exclude<ChainStageName, "dependency">,
	input: Pick<PreparedChainElement, "componentPath" | "elementName">,
	options: ConfigureParameterDependencyChainOptions,
): Promise<ConfigureParameterDependencyRollbackEvidence | ChainStageReport> {
	const raw = await runAscetCliJson(
		["exec", "read_element_catalog", normalizeAscetPath(input.componentPath), "--json"],
		{ ...options, toolName: "ascet_edit", commandId: "read_element_catalog", jobKind: "read" },
	);
	if (!raw.ok) {
		return preflightFailure(
			stage,
			"apply_element_spec",
			input.componentPath,
			raw.error?.code ?? "ascet_cli_failed",
			raw.error?.message ?? "Rollback evidence read failed.",
		);
	}
	const document = findElementSpecDocument(raw.data);
	if (document === undefined) {
		return preflightFailure(
			stage,
			"apply_element_spec",
			input.componentPath,
			"rollback_evidence_unavailable",
			"read_element_catalog did not return a recoverable {elements: []} specification document.",
		);
	}
	return {
		kind: "element-spec",
		stage,
		target: input.componentPath,
		componentPath: input.componentPath,
		elementName: input.elementName,
		specDocument: document,
	};
}

function findElementSpecDocument(value: unknown): unknown | undefined {
	if (!isRecord(value)) {
		return undefined;
	}
	if (Array.isArray(value.elements)) {
		return { elements: value.elements };
	}
	if (isRecord(value.result)) {
		return findElementSpecDocument(value.result);
	}
	return undefined;
}

async function runApplySpecPreflight(
	stage: Exclude<ChainStageName, "dependency">,
	input: PreparedChainElement,
	options: ConfigureParameterDependencyChainOptions,
): Promise<ChainStageReport> {
	const evidence = await captureRollbackEvidence(stage, input, options);
	if ("stage" in evidence && "status" in evidence && evidence.status === "failed") {
		return evidence;
	}
	const raw = await runAscetCliJson(
		["exec", "diff_element_spec", normalizeAscetPath(input.componentPath), input.specFile, "--json"],
		{ ...options, toolName: "ascet_edit", commandId: "diff_element_spec", jobKind: "read" },
	);
	if (!raw.ok) {
		return preflightFailure(
			stage,
			"apply_element_spec",
			input.componentPath,
			raw.error?.code ?? "ascet_cli_failed",
			raw.error?.message ?? "Element spec diff failed.",
		);
	}
	return {
		stage,
		operation: "apply_element_spec",
		target: input.componentPath,
		status: "preflighted",
		result: raw.data,
		specHash: input.specHash,
		rollbackEvidence: evidence as ConfigureParameterDependencyRollbackEvidence,
	};
}

function findNamedField(value: unknown, fieldName: string): unknown {
	if (Array.isArray(value)) {
		for (const entry of value) {
			const found = findNamedField(entry, fieldName);
			if (found !== undefined) return found;
		}
		return undefined;
	}
	if (!isRecord(value)) return undefined;
	if (Object.hasOwn(value, fieldName)) return value[fieldName];
	for (const entry of Object.values(value)) {
		const found = findNamedField(entry, fieldName);
		if (found !== undefined) return found;
	}
	return undefined;
}

function nestedString(value: unknown, parent: string, field: string, legacyField: string): string | undefined {
	const legacy = findNamedField(value, legacyField);
	if (typeof legacy === "string") return legacy;
	const parentValue = findNamedField(value, parent);
	if (!isRecord(parentValue)) return undefined;
	const nested = parentValue[field];
	return typeof nested === "string" ? nested : undefined;
}

function normalizeRollbackTargetKind(value: unknown): ConfigureParameterDependencyTarget["kind"] | undefined {
	if (typeof value !== "string") return undefined;
	const normalized = value.replace(/[_-]/gu, "").toLowerCase();
	if (normalized === "parameter" || normalized === "constant") return normalized;
	return normalized === "systemconstant" ? "systemConstant" : undefined;
}

function parseBeforeMappings(result: unknown): {
	beforeMappings?: Record<string, ConfigureParameterDependencyTarget>;
	beforeVariantMappings?: Record<string, Record<string, ConfigureParameterDependencyTarget>>;
	variantPolicy?: "default" | "selected";
	variants?: string[];
} {
	const raw = findNamedField(result, "beforeMappings");
	if (!Array.isArray(raw)) return {};
	const byVariant: Record<string, Record<string, ConfigureParameterDependencyTarget>> = {};
	for (const entry of raw) {
		if (!isRecord(entry)) continue;
		const formal = typeof entry.formal === "string" ? entry.formal : "";
		const name = typeof entry.valueName === "string" ? entry.valueName : "";
		const kind = normalizeRollbackTargetKind(entry.targetKind);
		const variant = typeof entry.variant === "string" && entry.variant.length > 0 ? entry.variant : "default";
		if (!formal || !name || !kind) continue;
		const mappings = byVariant[variant] ?? {};
		mappings[formal] = { kind, name };
		byVariant[variant] = mappings;
	}
	const variants = Object.keys(byVariant).sort();
	if (variants.length === 0) return {};
	if (variants.length === 1 && variants[0] === "default") {
		return { beforeMappings: byVariant.default, variantPolicy: "default" };
	}
	return {
		beforeVariantMappings: byVariant,
		variantPolicy: "selected",
		variants,
	};
}

function dependencyRollbackEvidence(
	params: ConfigureParameterDependencyDefinition,
	result: unknown,
): ConfigureParameterDependencyDependencyRollbackEvidence {
	const beforeDependency =
		nestedString(result, "dependency", "before", "beforeDependency") === "dependent" ? "dependent" : "independent";
	const beforeFormula = nestedString(result, "formula", "before", "beforeFormula") ?? "";
	const mappings = parseBeforeMappings(result);
	return {
		kind: "dependency",
		stage: "dependency",
		target: params.consumer.componentPath,
		targetPath: params.consumer.componentPath,
		elementName: params.local.element.name,
		beforeDependency,
		beforeFormula,
		...mappings,
		preflightResult: result,
	};
}

async function runDependencyPreflight(
	params: ConfigureParameterDependencyExecutionParams,
	overlaySpecFiles: string[],
	options: ConfigureParameterDependencyChainOptions,
): Promise<ChainStageReport> {
	const raw = await runAscetSetElementDependency(dependencyMutation(params, overlaySpecFiles), options);
	if (!raw.ok) {
		return preflightFailure(
			"dependency",
			"set_element_dependency",
			params.consumer.componentPath,
			raw.error?.code ?? "ascet_cli_failed",
			raw.error?.message ?? "Dependency dry-run failed.",
		);
	}
	const rollbackEvidence = dependencyRollbackEvidence(params, raw.data);
	if (
		rollbackEvidence.beforeDependency === "dependent" &&
		rollbackEvidence.beforeMappings === undefined &&
		rollbackEvidence.beforeVariantMappings === undefined
	) {
		return preflightFailure(
			"dependency",
			"set_element_dependency",
			params.consumer.componentPath,
			"dependency_rollback_evidence_missing",
			"The existing dependent state did not expose complete beforeMappings for compensating rollback.",
		);
	}
	return {
		stage: "dependency",
		operation: "set_element_dependency",
		target: params.consumer.componentPath,
		status: "preflighted",
		result: raw.data,
		rollbackEvidence,
	};
}

async function runPreflightStages(
	params: ConfigureParameterDependencyExecutionParams,
	options: ConfigureParameterDependencyChainOptions,
): Promise<ChainStageReport[]> {
	const stages: ChainStageReport[] = [];
	const prepared: Array<{ stage: Exclude<ChainStageName, "dependency">; input: PreparedChainElement }> = [];
	try {
		for (const [stage, input] of [
			["provider_spec", params.provider],
			["consumer_spec", params.consumer],
			["local_spec", params.local],
		] as const) {
			try {
				const materialized = prepareInlineElement(input, options);
				prepared.push({ stage, input: materialized });
				stages.push(await runApplySpecPreflight(stage, materialized, options));
			} catch (error) {
				stages.push(
					preflightFailure(
						stage,
						"apply_element_spec",
						input.componentPath,
						"configure_parameter_dependency_chain_preflight_exception",
						error instanceof Error ? error.message : String(error),
					),
				);
			}
		}
		const consumer = prepared.find((entry) => entry.stage === "consumer_spec")?.input;
		const local = prepared.find((entry) => entry.stage === "local_spec")?.input;
		if (!consumer || !local) {
			stages.push(
				preflightFailure(
					"dependency",
					"set_element_dependency",
					params.consumer.componentPath,
					"dependency_overlay_unavailable",
					"Dependency preflight requires valid inline Consumer and Local Element definitions.",
				),
			);
		} else {
			try {
				stages.push(await runDependencyPreflight(params, [consumer.specFile, local.specFile], options));
			} catch (error) {
				stages.push(
					preflightFailure(
						"dependency",
						"set_element_dependency",
						params.consumer.componentPath,
						"configure_parameter_dependency_chain_preflight_exception",
						error instanceof Error ? error.message : String(error),
					),
				);
			}
		}
		return stages;
	} finally {
		for (const entry of prepared) {
			removeTemporaryElementSpec(entry.input.specFile);
		}
	}
}

function stageError(stages: ChainStageReport[]): { code: string; message: string } | undefined {
	const failed = stages.find((stage) => stage.status === "failed");
	return failed?.error
		? {
				code: `configure_parameter_dependency_chain_${failed.stage}_preflight_failed`,
				message: `${failed.stage} preflight failed: ${failed.error.code}: ${failed.error.message}`,
			}
		: undefined;
}

function findBooleanField(value: unknown, names: ReadonlySet<string>): boolean | undefined {
	if (Array.isArray(value)) {
		for (const entry of value) {
			const found = findBooleanField(entry, names);
			if (found !== undefined) return found;
		}
		return undefined;
	}
	if (!isRecord(value)) return undefined;
	for (const [key, entry] of Object.entries(value)) {
		if (names.has(key.toLowerCase()) && typeof entry === "boolean") return entry;
	}
	for (const entry of Object.values(value)) {
		const found = findBooleanField(entry, names);
		if (found !== undefined) return found;
	}
	return undefined;
}

function commitStageReport(
	stage: ChainStageName,
	operation: ChainStageReport["operation"],
	target: string,
	raw: AscetCliJsonResult,
): ChainStageReport {
	if (!raw.ok) {
		return {
			stage,
			operation,
			target,
			status: "failed",
			rollbackEligible: false,
			error: { code: raw.error?.code ?? "ascet_cli_failed", message: raw.error?.message ?? "ASCET write failed." },
		};
	}
	const readbackVerified = findBooleanField(raw.data, new Set(["readbackverified"]));
	if (readbackVerified !== true) {
		return {
			stage,
			operation,
			target,
			status: "failed",
			rollbackEligible: true,
			result: raw.data,
			readbackVerified: false,
			error: {
				code: "readback_not_verified",
				message: "ASCET write returned success but did not prove readbackVerified=true.",
			},
		};
	}
	return {
		stage,
		operation,
		target,
		status: "committed",
		rollbackEligible: true,
		result: raw.data,
		readbackVerified: true,
	};
}

async function runInlineElementWrite(
	input: ConfigureParameterDependencyElement<
		| AscetProviderExportedParameterCreateInput
		| AscetConsumerImportedParameterCreateInput
		| AscetLocalDependentParameterCreateInput
	>,
	options: ConfigureParameterDependencyChainOptions,
): Promise<AscetCliJsonResult> {
	const prepared = prepareInlineElement(input, options);
	try {
		return await runAscetApplyElementSpec(
			{ componentPath: input.componentPath, specFile: prepared.specFile, verifyReadback: true },
			options,
		);
	} finally {
		removeTemporaryElementSpec(prepared.specFile);
	}
}

async function runCommitStages(
	params: ConfigureParameterDependencyExecutionParams,
	options: ConfigureParameterDependencyChainOptions,
	stages: ChainStageReport[],
): Promise<ChainStageReport[]> {
	const writes: Array<{
		stage: ChainStageName;
		operation: ChainStageReport["operation"];
		target: string;
		run: () => Promise<AscetCliJsonResult>;
	}> = [
		{
			stage: "provider_spec",
			operation: "apply_element_spec",
			target: params.provider.componentPath,
			run: () => runInlineElementWrite(params.provider, options),
		},
		{
			stage: "consumer_spec",
			operation: "apply_element_spec",
			target: params.consumer.componentPath,
			run: () => runInlineElementWrite(params.consumer, options),
		},
		{
			stage: "local_spec",
			operation: "apply_element_spec",
			target: params.local.componentPath,
			run: () => runInlineElementWrite(params.local, options),
		},
		{
			stage: "dependency",
			operation: "set_element_dependency",
			target: params.consumer.componentPath,
			run: () =>
				runAscetSetElementDependency(
					{
						targetPath: params.consumer.componentPath,
						elementName: params.local.element.name,
						dependency: "dependent",
						dependencyFormula: params.dependency.formula,
						dependencyFormals: params.dependency.formals,
						bindingPolicy: params.dependency.bindingPolicy,
						dependencyMappings: params.dependency.mappings,
						variantPolicy: params.dependency.variantPolicy,
						variants: params.dependency.variants,
						verifyReadback: true,
					},
					options,
				),
		},
	];
	for (const write of writes) {
		try {
			const report = commitStageReport(write.stage, write.operation, write.target, await write.run());
			const evidence = stages.find((stage) => stage.stage === write.stage)?.rollbackEvidence;
			if (evidence !== undefined) {
				report.rollbackEvidence = evidence;
			}
			stages.push(report);
			if (report.status === "failed") break;
		} catch (error) {
			stages.push({
				stage: write.stage,
				operation: write.operation,
				target: write.target,
				status: "failed",
				rollbackEligible: false,
				error: {
					code: "configure_parameter_dependency_chain_commit_exception",
					message: error instanceof Error ? error.message : String(error),
				},
			});
			break;
		}
	}
	return stages;
}

function toRollbackStages(stages: ChainStageReport[]): CompensatingRollbackStage[] {
	return stages
		.filter((stage) => stage.rollbackEligible === true && stage.rollbackEvidence !== undefined)
		.map((stage) => ({ stage: stage.stage, target: stage.target, evidence: stage.rollbackEvidence }));
}

function createDefaultRollbackOrchestrator(
	options: ConfigureParameterDependencyChainOptions,
): CompensatingRollbackOrchestrator {
	return createCompensatingRollbackOrchestrator(async (stage, context) => {
		const evidence = stage.evidence;
		if (isRecord(evidence) && evidence.kind === "dependency") {
			const dependencyEvidence = evidence as unknown as ConfigureParameterDependencyDependencyRollbackEvidence;
			const result = await runAscetSetElementDependency(
				{
					targetPath: dependencyEvidence.targetPath,
					elementName: dependencyEvidence.elementName,
					dependency: dependencyEvidence.beforeDependency,
					dependencyFormula:
						dependencyEvidence.beforeDependency === "dependent" ? dependencyEvidence.beforeFormula : undefined,
					dependencyMappings: dependencyEvidence.beforeMappings,
					variantMappings: dependencyEvidence.beforeVariantMappings,
					variantPolicy: dependencyEvidence.variantPolicy,
					variants: dependencyEvidence.variants,
					valueRestoration:
						dependencyEvidence.beforeDependency === "independent" ? { policy: "fromSnapshot" } : undefined,
					verifyReadback: true,
				},
				options,
			);
			if (!result.ok) {
				throw new Error(
					`${result.error?.code ?? "dependency_rollback_failed"}: ${result.error?.message ?? "Dependency restore failed."}`,
				);
			}
			if (findBooleanField(result.data, new Set(["readbackverified"])) !== true) {
				throw new Error("Dependency rollback did not prove readbackVerified=true.");
			}
			return;
		}
		if (!isRecord(evidence) || evidence.kind !== "element-spec" || evidence.specDocument === undefined) {
			throw new Error(`Missing rollback evidence for ${stage.stage}.`);
		}
		const elementEvidence = evidence as unknown as ConfigureParameterDependencyRollbackEvidence;
		const root = join(
			getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
			"chain-rollback",
			context.planId,
		);
		mkdirSync(root, { recursive: true });
		const specFile = join(root, `${stage.stage}.json`);
		writeFileSync(specFile, `${JSON.stringify(elementEvidence.specDocument, null, 2)}\n`, {
			encoding: "utf8",
			mode: 0o600,
		});
		const result = await runAscetApplyElementSpec(
			{
				componentPath: elementEvidence.componentPath,
				specFile,
				mode: "restore",
				deleteMissing: true,
				verifyReadback: true,
			},
			options,
		);
		if (!result.ok) {
			throw new Error(
				`${result.error?.code ?? "rollback_write_failed"}: ${result.error?.message ?? "ASCET restore failed."}`,
			);
		}
		if (findBooleanField(result.data, new Set(["readbackverified"])) !== true) {
			throw new Error("Rollback restore did not prove readbackVerified=true.");
		}
	});
}

function storeError(error: unknown): { code: string; message: string; details?: unknown } {
	if (error instanceof AscetPlanStoreError)
		return { code: error.code, message: error.message, details: error.details };
	return { code: "plan_store_error", message: error instanceof Error ? error.message : String(error) };
}

function summary(params: ConfigureParameterDependencyDefinition, planId: string): string {
	return [
		"Configure ASCET parameter dependency chain",
		`planId: ${planId}`,
		`provider: ${params.provider.componentPath} :: ${params.provider.element.name}`,
		`consumer: ${params.consumer.componentPath} :: ${params.consumer.element.name}`,
		`local dependent: ${params.local.componentPath} :: ${params.local.element.name}`,
		`variantPolicy: ${params.dependency.variantPolicy}`,
		`formula: ${params.dependency.formula}`,
	].join("\n");
}

async function runConfigureParameterDependencyChainInternal(
	value: unknown,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetEditApprovalContext,
): Promise<ConfigureParameterDependencyChainResult> {
	const validated = validateChainParams(value);
	if ("error" in validated) {
		const mode = isRecord(value) && value.mode === "commit" ? "commit" : "plan";
		return createBaseFailure(mode, [], validated.error);
	}
	const requestedParams = validated.params;
	const planStore =
		options.planStore ??
		new AscetPlanStore({ artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined) });
	let existingPlan: AscetPlanRecord | undefined;
	let params: ConfigureParameterDependencyExecutionParams;
	let definition: AscetPlanJsonValue;
	if (requestedParams.mode === "commit") {
		try {
			existingPlan = planStore.load(requestedParams.planId, createAscetPlanBinding(options));
		} catch (error) {
			const failure = storeError(error);
			return createBaseFailure("commit", [], failure, requestedParams.planId);
		}
		if (existingPlan.operation !== PLAN_OPERATION) {
			return createBaseFailure(
				"commit",
				[],
				{
					code: "plan_operation_mismatch",
					message: `Plan ${requestedParams.planId} is not for ${PLAN_OPERATION}.`,
				},
				requestedParams.planId,
				existingPlan.fingerprint,
			);
		}
		if (!Value.Check(configureDefinitionSchema, existingPlan.params)) {
			return createBaseFailure(
				"commit",
				[],
				{ code: "plan_corrupt", message: `Plan ${requestedParams.planId} has an invalid chain definition.` },
				requestedParams.planId,
				existingPlan.fingerprint,
			);
		}
		const storedDefinition = existingPlan.params as unknown as ConfigureParameterDependencyDefinition;
		const storedValidation = validateChainParams({ mode: "plan", ...storedDefinition });
		if ("error" in storedValidation || storedValidation.params.mode !== "plan") {
			return createBaseFailure(
				"commit",
				[],
				{
					code: "plan_corrupt",
					message: "The persisted chain definition no longer satisfies the current contract.",
					details: "error" in storedValidation ? storedValidation.error : undefined,
				},
				requestedParams.planId,
				existingPlan.fingerprint,
			);
		}
		params = { ...storedValidation.params, mode: "commit", planId: requestedParams.planId };
		definition = existingPlan.params;
	} else {
		params = requestedParams;
		definition = definitionWithoutControl(requestedParams);
	}
	const preflightStages = await runPreflightStages(params, options);
	const preflightError = stageError(preflightStages);
	if (preflightError) {
		return createBaseFailure(
			params.mode,
			preflightStages,
			preflightError,
			params.mode === "commit" ? params.planId : undefined,
			existingPlan?.fingerprint,
		);
	}
	const backendPreflight = createBackendPreflightPayload(preflightStages);
	if (params.mode === "plan") {
		try {
			const created = planStore.create({
				operation: PLAN_OPERATION,
				params: definition,
				backendPreflight,
				binding: createAscetPlanBinding(options),
			});
			return {
				status: "planned",
				mode: "plan",
				planId: created.planId,
				fingerprint: created.fingerprint,
				stages: preflightStages,
				writesPerformed: false,
				atomic: false,
				rollback: noRollbackReport(false, true),
				limitations: [...PLAN_LIMITATIONS],
			};
		} catch (error) {
			return createBaseFailure("plan", preflightStages, storeError(error), undefined);
		}
	}
	try {
		planStore.verify({
			planId: params.planId,
			operation: PLAN_OPERATION,
			params: definition,
			backendPreflight,
			binding: createAscetPlanBinding(options),
		});
	} catch (error) {
		const failure = storeError(error);
		return createBaseFailure("commit", preflightStages, failure, params.planId, existingPlan?.fingerprint);
	}
	const approval = await requestAscetEditApproval(
		{
			executeWrite: true,
			title: "Confirm ASCET dependency chain write",
			message: summary(params, params.planId),
			signal: options.signal,
			errorPrefix: "ascet_edit",
		},
		ctx,
	);
	if (!approval.approved) {
		return {
			status: "blocked",
			mode: "commit",
			planId: params.planId,
			fingerprint: existingPlan?.fingerprint ?? "",
			writesPerformed: false,
			atomic: false,
			error: { code: approval.code, message: approval.message },
			stages: preflightStages,
			rollback: noRollbackReport(false, true),
			limitations: [...PLAN_LIMITATIONS],
		};
	}
	const committedStages = await runCommitStages(params, options, [...preflightStages]);
	const failed = committedStages.find((stage) => stage.status === "failed");
	const rollbackStages = toRollbackStages(committedStages);
	const rollback = async (): Promise<CompensatingRollbackResult> => {
		const rollbackOrchestrator = options.rollbackOrchestrator ?? createDefaultRollbackOrchestrator(options);
		try {
			return await rollbackOrchestrator.rollback({
				planId: params.planId,
				failedStage: failed?.stage,
				completedStages: rollbackStages,
			});
		} catch (error) {
			return {
				status: "failed",
				attempted: true,
				stages: [
					{
						stage: failed?.stage ?? "plan",
						target: failed?.target ?? params.consumer.componentPath,
						status: "failed",
						error: {
							code: "compensating_rollback_exception",
							message: error instanceof Error ? error.message : String(error),
						},
					},
				],
			};
		}
	};
	if (failed) {
		const rollbackResult = await rollback();
		const originalError = {
			code: `configure_parameter_dependency_chain_${failed.stage}_commit_failed`,
			message: `${failed.stage} commit failed: ${failed.error?.code ?? "unknown"}: ${failed.error?.message ?? "ASCET write failed."}`,
		};
		return createBaseFailure(
			"commit",
			committedStages,
			rollbackResult.status === "failed"
				? {
						code: "write_rollback_failed",
						message: `${originalError.message}; compensating rollback failed.`,
						details: { originalError, rollback: rollbackResult },
					}
				: originalError,
			params.planId,
			existingPlan?.fingerprint,
			rollbackStages.length > 0,
			{
				required: rollbackStages.length > 0,
				evidenceCaptured: preflightStages.some((stage) => stage.rollbackEvidence !== undefined),
				result: rollbackResult,
			},
		);
	}
	const allReadbackVerified =
		committedStages.length === 8 &&
		committedStages.slice(-4).every((stage) => stage.status === "committed" && stage.readbackVerified === true);
	if (!allReadbackVerified) {
		const rollbackResult = await rollback();
		return createBaseFailure(
			"commit",
			committedStages,
			rollbackResult.status === "failed"
				? {
						code: "write_rollback_failed",
						message: "Readback was incomplete and compensating rollback failed.",
						details: { rollback: rollbackResult },
					}
				: {
						code: "configure_parameter_dependency_chain_readback_incomplete",
						message: "All four writes must complete with readbackVerified=true before atomic can be true.",
					},
			params.planId,
			existingPlan?.fingerprint,
			rollbackStages.length > 0,
			{ required: rollbackStages.length > 0, evidenceCaptured: true, result: rollbackResult },
		);
	}
	let consumed: AscetPlanRecord;
	try {
		consumed = planStore.consume({
			planId: params.planId,
			operation: PLAN_OPERATION,
			params: definition,
			backendPreflight,
			binding: createAscetPlanBinding(options),
		});
	} catch (error) {
		const rollbackResult = await rollback();
		const storeFailure = storeError(error);
		return createBaseFailure(
			"commit",
			committedStages,
			rollbackResult.status === "failed"
				? {
						code: "write_rollback_failed",
						message: `${storeFailure.message}; compensating rollback failed.`,
						details: { originalError: storeFailure, rollback: rollbackResult },
					}
				: storeFailure,
			params.planId,
			existingPlan?.fingerprint,
			true,
			{ required: true, evidenceCaptured: true, result: rollbackResult },
		);
	}
	return {
		status: "committed",
		mode: "commit",
		planId: consumed.planId,
		fingerprint: consumed.fingerprint,
		stages: committedStages,
		writesPerformed: true,
		atomic: true,
		rollback: noRollbackReport(false, true),
		limitations: [...PLAN_LIMITATIONS],
	};
}

export async function runConfigureParameterDependencyChain(
	value: unknown,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetEditApprovalContext,
): Promise<ConfigureParameterDependencyChainResult> {
	const startedAt = Date.now();
	const result = await runConfigureParameterDependencyChainInternal(value, options, ctx);
	recordAscetWriteTelemetry(options, {
		operation: PLAN_OPERATION,
		phase: result.mode,
		outcome:
			result.status === "planned"
				? "plan_ready"
				: result.status === "committed"
					? "committed"
					: result.status === "blocked"
						? "blocked"
						: "error",
		durationMs: Math.max(0, Date.now() - startedAt),
		...(result.status === "error" ? { errorCode: result.error.code } : {}),
		...(result.planId ? { planId: result.planId } : {}),
	});
	return result;
}

export function formatConfigureParameterDependencyChainResult(result: ConfigureParameterDependencyChainResult): string {
	return JSON.stringify(result, null, 2);
}

export const configureParameterDependencyChainTool = defineSequentialAscetTool({
	name: "configure_parameter_dependency_chain",
	label: "Configure ASCET parameter dependency chain",
	description:
		"Plan or commit an explicit ASCET Provider Exported Parameter -> Consumer Imported Parameter -> Local Dependent Parameter chain without guessing ASCET data.",
	promptSnippet: "Use configure_parameter_dependency_chain for one explicit provider/consumer/local dependency chain.",
	promptGuidelines: [
		"Always call mode=plan first; use the returned random planId unchanged for mode=commit.",
		"Provide complete role-specific inline elements. Never create or pass provider, consumer, or local specFile paths.",
		"Provider and Local decision groups are mandatory; Imported Parameter is the only lightweight exception.",
		"Use explicit dependency formals and mappings with kind=parameter, constant, or systemConstant; never rely on formula token inference.",
		"variantPolicy and verifyReadback=true are mandatory. Use selected only with an explicit variants list.",
		"Commit revalidates the persisted plan, captures component rollback evidence, consumes the plan after confirmation, and reports compensating rollback execution on failure.",
		...buildToolPromptGuidelines({ tool: "configure_parameter_dependency_chain" }),
	],
	parameters: configureParameterDependencyChainParameters,
	renderCall: renderAscetToolCall,
	renderResult: renderAscetToolResult,
	async execute(
		_toolCallId: string,
		params: ConfigureParameterDependencyChainParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext & {
			env?: Record<string, string | undefined>;
			executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
		},
	) {
		const result = await runConfigureParameterDependencyChain(
			params,
			{
				cwd: ctx.cwd,
				agentId: ctx.agentId,
				sessionId: ctx.sessionId,
				env: ctx.env,
				signal,
				timeoutMs: 180_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		return {
			content: [{ type: "text", text: formatConfigureParameterDependencyChainResult(result) }],
			details: {
				tool: "configure_parameter_dependency_chain",
				mode: params.mode,
				planId: "planId" in params ? params.planId : undefined,
				outcome: result,
			},
		};
	},
});

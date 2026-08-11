import { type TProperties, Type } from "typebox";
import { Value } from "typebox/value";
import {
	type AscetApplyElementSpecParams,
	createApplyElementSpecSummary,
	runApprovedAscetApplyElementSpec,
	runAscetApplyElementSpec,
} from "../apply-element-spec.ts";
import { runApprovedAscetApplyProjectFormula } from "../apply-project-formula.ts";
import { type AscetCliJsonResult, runAscetCliJson } from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import { type AscetToolOutcome, createPreflightOutcome } from "../core/results.ts";
import { withInlineCodeFile } from "../core/temp-files.ts";
import { runApprovedAscetCreateComponent } from "../create-component.ts";
import { runApprovedAscetCreateFolder } from "../create-folder.ts";
import { runApprovedAscetCreateMethod } from "../create-method.ts";
import { runApprovedAscetDeleteComponent } from "../delete-component.ts";
import { runApprovedAscetDeleteFolder } from "../delete-folder.ts";
import { runApprovedAscetDeleteMethod } from "../delete-method.ts";
import {
	type AscetApplyElementCommitParams,
	type AscetApplyElementPlanParams,
	ascetApplyElementSpecCommitSchema,
	ascetApplyElementSpecPlanSchema,
	type NormalizedElementSpecResult,
	normalizeAscetElementSpec,
} from "../element-spec-contract.ts";
import { getAscetDatabaseIdentity } from "../get.ts";
import {
	type AscetCreateMethodComponentKind,
	getDefaultCreateMethodKind,
	validateCreateMethodKindCompatibility,
} from "../method-kind-compatibility.ts";
import { getAscetArtifactRoot } from "../observation-store.ts";
import {
	type AscetDependencyMappingTarget,
	type AscetDependencyRestorationValue,
	createSetElementDependencySummary,
	resolveSetElementDependencyMappings,
	runApprovedAscetSetElementDependency,
	runAscetSetElementDependency,
} from "../set-element-dependency.ts";
import { runApprovedAscetSetEnumerators } from "../set-enumerators.ts";
import { runApprovedAscetSetMethodCode } from "../set-method-code.ts";
import { runApprovedAscetSetMethodSignature } from "../set-method-signature.ts";
import { runApprovedAscetSetModuleCode } from "../set-module-code.ts";
import {
	ASCET_SET_STATE_MACHINE_CODE_OPERATIONS,
	runApprovedAscetSetStateMachineCode,
} from "../set-state-machine-code.ts";
import { compactObject, toToolFailurePayload, unwrapToolSuccessPayload } from "../tool-response-contract.ts";
import { openAiObjectUnionSchema } from "../tools/_shared/openai-schema.ts";
import { selectAscetPublicSchemaVariants } from "../tools/actions/schema-registry.ts";
import { type AscetEditApprovalContext, isAscetEditApprovalBlockedCode, requestAscetEditApproval } from "./approval.ts";
import {
	type AscetObservationInvalidation,
	invalidateAscetEditObservations,
	type RunAscetEditOperationOptions,
} from "./common.ts";
import { type AscetEditActionId, getAscetEditAction } from "./contract.ts";
import {
	type AscetEditabilityParams,
	formatAscetEditabilityResult,
	runApprovedAscetEditability,
} from "./editability.ts";
import {
	findElementSpecDocument,
	fingerprintJson,
	removeTemporaryElementSpec,
	writeTemporaryElementSpec,
} from "./element-spec-plan.ts";
import {
	type AscetPlanDatabaseIdentity,
	type AscetPlanJsonValue,
	AscetPlanStore,
	AscetPlanStoreError,
	type AscetPlanTargetIdentity,
	createAscetPlanBinding,
	createAscetPlanContractFingerprint,
} from "./plan-store.ts";
import {
	type AscetEditExecutionClassification,
	type AscetEditMutationStatus,
	type AscetEditVerification,
	classifyAscetEditExecution,
} from "./verification.ts";
import { ascetWriteControlProperties as writeControlSchema } from "./write-control-contract.ts";
import { recordAscetWriteTelemetry } from "./write-telemetry.ts";

type CodeSource = { code?: string; codeFile?: string };
const VALID_STATE_MACHINE_OPERATIONS = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const VALID_STATE_MACHINE_OPERATIONS_TEXT = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

export type AscetMutationParams =
	| { action: "create_folder"; folderPath: string; executeWrite?: boolean }
	| {
			action: "create_component";
			componentPath: string;
			kind: "class" | "module" | "statemachine" | "enumeration";
			language?: "ESDL" | "BDE" | "C";
			ifExists?: "fail" | "return-existing";
			rollbackOnFailure?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "create_method";
			componentPath: string;
			componentKind?: AscetCreateMethodComponentKind;
			methodName: string;
			methodKind?: "abstract" | "process" | "action" | "condition" | "trigger";
			ifExists?: "fail" | "return-existing";
			executeWrite?: boolean;
	  }
	| {
			action: "set_method_signature";
			componentPath: string;
			methodName: string;
			returnType?: "cont" | "sdisc" | "udisc" | "log";
			ifReturnExists?: "fail" | "keep" | "replace";
			arguments?: Array<{
				name: string;
				type: "cont" | "sdisc" | "udisc" | "log";
				ifExists?: "fail" | "keep" | "replace";
			}>;
			executeWrite?: boolean;
	  }
	| {
			action: "delete_component";
			componentPath: string;
			ifMissing?: "fail" | "ignore";
			executeWrite?: boolean;
	  }
	| {
			action: "delete_method";
			componentPath: string;
			methodName: string;
			ifMissing?: "fail" | "ignore";
			executeWrite?: boolean;
	  }
	| {
			action: "delete_folder";
			folderPath: string;
			ifMissing?: "fail" | "ignore";
			executeWrite?: boolean;
	  }
	| ({
			action: "set_method_code";
			componentPath: string;
			methodName: string;
			executeWrite?: boolean;
	  } & CodeSource)
	| ({
			action: "set_module_code";
			modulePath: string;
			operation?: "set-method" | "set-header" | "set-external-c-code";
			section?: "set-method" | "set-header" | "set-external-c-code";
			methodName?: string;
			executeWrite?: boolean;
	  } & CodeSource)
	| ({
			action: "set_state_machine_code";
			stateMachinePath: string;
			operation:
				| "set-method"
				| "set-state-entry-esdl"
				| "set-state-exit-esdl"
				| "set-state-static-esdl"
				| "bind-state-entry-method"
				| "bind-state-exit-method"
				| "bind-state-static-method"
				| "set-transition-condition-esdl"
				| "set-transition-action-esdl"
				| "bind-transition-condition-method"
				| "bind-transition-action-method"
				| "set-start-state";
			stateName?: string;
			sourceState?: string;
			targetState?: string;
			priority?: number;
			methodName?: string;
			executeWrite?: boolean;
	  } & CodeSource)
	| {
			action: "set_enumerators";
			componentPath: string;
			enumerators: string[];
			executeWrite?: boolean;
	  }
	| (AscetApplyElementPlanParams & { executeWrite?: boolean })
	| (AscetApplyElementCommitParams & { executeWrite?: boolean })
	| {
			action: "apply_project_formula";
			projectPath: string;
			specFile: string;
			mode?: "restore";
			deleteMissing?: boolean;
			executeWrite?: boolean;
	  }
	| {
			action: "set_element_dependency";
			phase?: "plan" | "commit";
			planId?: string;
			targetPath?: string;
			componentPath?: string;
			elementName?: string;
			dependency?: "dependent" | "independent";
			dependencyFormula?: string;
			dependencyFormals?: string[];
			bindingPolicy?: "explicit" | "autoExactName";
			dependencyMappings?: Record<string, string | AscetDependencyMappingTarget>;
			variantMappings?: Record<string, Record<string, string | AscetDependencyMappingTarget>>;
			variantPolicy?: "default" | "selected" | "all";
			variants?: string[];
			valueRestoration?: {
				policy: "fromSnapshot" | "explicit" | "ascetDefault";
				valuesByVariant?: Record<string, AscetDependencyRestorationValue>;
			};
			clearDependencyFormula?: boolean;
			targetKind?: "auto" | "component" | "folder";
			match?: "exact" | "all";
			dryRun?: boolean;
			backupDir?: string;
			executeWrite?: boolean;
	  };

type ExecutableAscetMutationParams = AscetMutationParams & {
	executeWrite: true;
	verifyReadback: true;
};

export type AscetEditParams = AscetMutationParams | AscetEditabilityParams;

export type AscetEditInvocation =
	| { kind: "mutation"; action: AscetMutationParams["action"] }
	| { kind: "editability"; mode: AscetEditabilityParams["mode"] };

export interface AscetEditResult {
	content: Array<{ type: "text"; text: string }>;
	details: {
		outcome: AscetToolOutcome;
		raw?: AscetCliJsonResult;
		observations?: AscetObservationInvalidation;
		verification?: AscetEditVerification;
		error?: { code: string; message: string };
	};
}

function strictObject<T extends TProperties>(properties: T) {
	return Type.Object(properties, { additionalProperties: false });
}

const codeSourceSchema = {
	code: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String()),
};
const primitiveSignatureTypeSchema = Type.Union([
	Type.Literal("cont"),
	Type.Literal("sdisc"),
	Type.Literal("udisc"),
	Type.Literal("log"),
]);
const methodSignatureArgumentSchema = strictObject({
	name: Type.String({ minLength: 1 }),
	type: primitiveSignatureTypeSchema,
	ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
});
const componentKindSchema = Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]);
const writeComponentKindSchema = Type.Union([
	Type.Literal("class"),
	Type.Literal("module"),
	Type.Literal("statemachine"),
	Type.Literal("enumeration"),
]);
const methodKindSchema = Type.Union([
	Type.Literal("abstract"),
	Type.Literal("process"),
	Type.Literal("action"),
	Type.Literal("condition"),
	Type.Literal("trigger"),
]);
const stateMachineOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-state-entry-esdl"),
	Type.Literal("set-state-exit-esdl"),
	Type.Literal("set-state-static-esdl"),
	Type.Literal("bind-state-entry-method"),
	Type.Literal("bind-state-exit-method"),
	Type.Literal("bind-state-static-method"),
	Type.Literal("set-transition-condition-esdl"),
	Type.Literal("set-transition-action-esdl"),
	Type.Literal("bind-transition-condition-method"),
	Type.Literal("bind-transition-action-method"),
	Type.Literal("set-start-state"),
]);
const moduleCodeOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-header"),
	Type.Literal("set-external-c-code"),
]);

export const ascetMutationActionSchemas = [
	strictObject({
		action: Type.Literal("create_folder"),
		folderPath: Type.String({ minLength: 1 }),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("create_component"),
		componentPath: Type.String({ minLength: 1 }),
		kind: writeComponentKindSchema,
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
		ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
		rollbackOnFailure: Type.Optional(Type.Boolean()),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("create_method"),
		componentPath: Type.String({ minLength: 1 }),
		componentKind: Type.Optional(componentKindSchema),
		methodName: Type.String({ minLength: 1 }),
		methodKind: Type.Optional(methodKindSchema),
		ifExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("return-existing")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_method_signature"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		returnType: Type.Optional(primitiveSignatureTypeSchema),
		arguments: Type.Optional(Type.Array(methodSignatureArgumentSchema)),
		ifReturnExists: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("keep"), Type.Literal("replace")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("delete_component"),
		componentPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("delete_method"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("delete_folder"),
		folderPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_method_code"),
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_module_code"),
		modulePath: Type.String({ minLength: 1 }),
		operation: Type.Optional(moduleCodeOperationSchema),
		section: Type.Optional(moduleCodeOperationSchema),
		methodName: Type.Optional(Type.String({ minLength: 1 })),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_state_machine_code"),
		stateMachinePath: Type.String({ minLength: 1 }),
		operation: stateMachineOperationSchema,
		stateName: Type.Optional(Type.String()),
		sourceState: Type.Optional(Type.String()),
		targetState: Type.Optional(Type.String()),
		priority: Type.Optional(Type.Number()),
		methodName: Type.Optional(Type.String({ minLength: 1 })),
		...codeSourceSchema,
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_enumerators"),
		componentPath: Type.String({ minLength: 1 }),
		enumerators: Type.Array(Type.String({ minLength: 1 }), { minItems: 1 }),
		...writeControlSchema,
	}),
	ascetApplyElementSpecPlanSchema,
	ascetApplyElementSpecCommitSchema,
	strictObject({
		action: Type.Literal("apply_project_formula"),
		projectPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_element_dependency"),
		phase: Type.Optional(Type.Literal("plan")),
		targetPath: Type.Optional(Type.String({ minLength: 1 })),
		componentPath: Type.Optional(Type.String({ minLength: 1 })),
		elementName: Type.String({ minLength: 1 }),
		dependency: Type.Union([Type.Literal("dependent"), Type.Literal("independent")]),
		dependencyFormula: Type.Optional(Type.String({ minLength: 1 })),
		dependencyFormals: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
		bindingPolicy: Type.Optional(Type.Union([Type.Literal("explicit"), Type.Literal("autoExactName")])),
		dependencyMappings: Type.Optional(
			Type.Record(
				Type.String({ minLength: 1 }),
				Type.Union([
					Type.String({ minLength: 1 }),
					strictObject({
						kind: Type.Union([
							Type.Literal("parameter"),
							Type.Literal("constant"),
							Type.Literal("systemConstant"),
						]),
						name: Type.String({ minLength: 1 }),
					}),
				]),
			),
		),
		variantMappings: Type.Optional(
			Type.Record(
				Type.String({ minLength: 1 }),
				Type.Record(
					Type.String({ minLength: 1 }),
					Type.Union([
						Type.String({ minLength: 1 }),
						strictObject({
							kind: Type.Union([
								Type.Literal("parameter"),
								Type.Literal("constant"),
								Type.Literal("systemConstant"),
							]),
							name: Type.String({ minLength: 1 }),
						}),
					]),
				),
			),
		),
		variantPolicy: Type.Optional(
			Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")]),
		),
		variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
		valueRestoration: Type.Optional(
			strictObject({
				policy: Type.Union([Type.Literal("fromSnapshot"), Type.Literal("explicit"), Type.Literal("ascetDefault")]),
				valuesByVariant: Type.Optional(
					Type.Record(Type.String({ minLength: 1 }), Type.Union([Type.String(), Type.Number(), Type.Boolean()])),
				),
			}),
		),
		clearDependencyFormula: Type.Optional(Type.Boolean()),
		targetKind: Type.Optional(Type.Union([Type.Literal("auto"), Type.Literal("component"), Type.Literal("folder")])),
		match: Type.Optional(Type.Union([Type.Literal("exact"), Type.Literal("all")])),
		...writeControlSchema,
	}),
	strictObject({
		action: Type.Literal("set_element_dependency"),
		phase: Type.Literal("commit"),
		planId: Type.String({ minLength: 1 }),
		...writeControlSchema,
	}),
] as const;

export const ascetMutationParameters = openAiObjectUnionSchema<AscetMutationParams>(ascetMutationActionSchemas);

function outcomeFromCliResult(result: AscetCliJsonResult): AscetToolOutcome {
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_edit_failed";
	const message = result.error?.message ?? "ASCET edit failed.";
	if (isAscetEditApprovalBlockedCode(code)) {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

function asResponse(
	outcome: AscetToolOutcome,
	raw?: AscetCliJsonResult,
	observations?: AscetObservationInvalidation,
	verification?: AscetEditVerification,
): AscetEditResult {
	return {
		content: [{ type: "text", text: formatAscetEditOutcomeContent(outcome) }],
		details: {
			outcome,
			raw,
			observations,
			verification,
			error: outcome.status === "error" ? outcome.error : undefined,
		},
	};
}

function formatAscetEditOutcomeContent(outcome: AscetToolOutcome): string {
	if (outcome.status === "ok") {
		return JSON.stringify(compactObject(outcome.data) ?? {}, null, 2);
	}
	if (outcome.status === "error") {
		return JSON.stringify(toToolFailurePayload(outcome.error), null, 2);
	}
	if (outcome.status === "blocked") {
		return JSON.stringify(toToolFailurePayload({ code: outcome.code, message: outcome.message }), null, 2);
	}
	return JSON.stringify(compactObject(outcome) ?? {}, null, 2);
}

export function resolveAscetEditInvocation(params: unknown): AscetEditInvocation | undefined {
	if (!isRecord(params)) {
		return undefined;
	}
	if (Object.hasOwn(params, "action")) {
		const action =
			typeof params.action === "string" ? getAscetEditAction(params.action as AscetEditActionId) : undefined;
		if (!action || action.discriminator.field !== "action") {
			return undefined;
		}
		if (
			Object.hasOwn(params, "mode") &&
			!(params.mode === "restore" && (action.id === "apply_element_spec" || action.id === "apply_project_formula"))
		) {
			return undefined;
		}
		return { kind: "mutation", action: action.id as AscetMutationParams["action"] };
	}
	if (!Object.hasOwn(params, "mode")) {
		return undefined;
	}
	const mode = typeof params.mode === "string" ? getAscetEditAction(params.mode as AscetEditActionId) : undefined;
	return mode?.discriminator.field === "mode"
		? { kind: "editability", mode: mode.id as AscetEditabilityParams["mode"] }
		: undefined;
}

export function getAscetEditActionId(params: unknown): AscetEditActionId | undefined {
	const invocation = resolveAscetEditInvocation(params);
	return invocation?.kind === "mutation" ? invocation.action : invocation?.mode;
}

export async function runAscetEdit(
	params: unknown,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const invocation = resolveAscetEditInvocation(params);
	if (!invocation || !isRecord(params)) {
		return asResponse({
			status: "error",
			error: {
				code: "ascet_edit_invalid_parameter",
				message:
					"ascet_edit requires exactly one supported discriminator: action for a mutation, or mode=check/set for editability.",
			},
		});
	}
	if (invocation.kind === "mutation") {
		return runAscetMutation(params as AscetMutationParams, options, ctx);
	}

	const editabilityParams = params as unknown as AscetEditabilityParams;
	const raw = await runApprovedAscetEditability(editabilityParams, options, ctx);
	const outcome = outcomeFromCliResult(raw);
	return {
		content: [{ type: "text", text: formatAscetEditabilityResult(raw, editabilityParams) }],
		details: {
			outcome,
			raw,
			error: outcome.status === "error" ? outcome.error : undefined,
		},
	};
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

async function withEditCode<T>(
	params: CodeSource & { action: string },
	run: (codeFile: string) => Promise<T>,
): Promise<T> {
	return withInlineCodeFile({ code: params.code, codeFile: params.codeFile, prefix: params.action }, run);
}

export async function runAscetMutation(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const startedAt = Date.now();
	const lifecycle: AscetWriteLifecycleEvidence = {
		beforeBridge: false,
		bridgeEntered: false,
		backendResponseReceived: false,
	};
	const trackedOptions = withWriteLifecycleTracking(options, lifecycle);
	try {
		const result = await runAscetMutationCore(params, trackedOptions, ctx);
		recordMutationTelemetry(params, result, options, startedAt, lifecycle);
		return result;
	} catch (error) {
		const phase = resolveTelemetryPhase(params);
		const mutationStatus = phase !== "plan" && lifecycle.bridgeEntered ? "unknown" : "not_started";
		const errorCode = isRecord(error) && typeof error.code === "string" ? error.code : "unexpected_exception";
		recordAscetWriteTelemetry(options, {
			operation: params.action,
			phase,
			outcome: mutationStatus === "unknown" ? "outcome_unknown" : "error",
			durationMs: Math.max(0, Date.now() - startedAt),
			errorCode,
			...("planId" in params && typeof params.planId === "string" ? { planId: params.planId } : {}),
			mutationStatus,
			bridgeEntered: lifecycle.bridgeEntered,
			backendResponseReceived: lifecycle.backendResponseReceived,
			mutationStarted: mutationStatus === "unknown",
			writesPerformed: false,
			cleanupRequired: mutationStatus === "unknown",
		});
		throw error;
	}
}

async function runAscetMutationCore(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const normalizedParams = normalizeAscetMutationParams(params);
	const contractValidation = validateAscetMutationContract(normalizedParams);
	if (contractValidation) {
		return asResponse(contractValidation);
	}
	if (isPlanManagedCommit(normalizedParams)) {
		return runPlanManagedCommit(normalizedParams, options, ctx);
	}
	const validation = validateAscetMutationParams(normalizedParams);
	if (validation) {
		return asResponse(validation);
	}
	const localInputValidation = validateLocalMutationInputs(normalizedParams, options);
	if (localInputValidation) {
		return asResponse(localInputValidation);
	}
	if (isPlanManagedPlan(normalizedParams)) {
		return runPlanManagedPlan(normalizedParams, options);
	}
	if (!params.executeWrite) {
		const backendPreflight = await runBackendMutationPreflight(normalizedParams, options);
		if (backendPreflight) {
			return asResponse(backendPreflight.outcome, backendPreflight.raw);
		}
		return asResponse(createPreflightOutcome({ action: normalizedParams.action, params: normalizedParams }));
	}

	const raw = await dispatchMutation(prepareExecutableMutation(normalizedParams), options, ctx);
	return finalizeAscetMutation({ params: normalizedParams, raw, options });
}

interface AscetWriteLifecycleEvidence {
	beforeBridge: boolean;
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
}

function withWriteLifecycleTracking(
	options: RunAscetEditOperationOptions,
	lifecycle: AscetWriteLifecycleEvidence,
): RunAscetEditOperationOptions {
	return {
		...options,
		onLifecycle: (event) => {
			if (event.stage === "before_bridge") lifecycle.beforeBridge = true;
			if (event.stage === "bridge_entered") lifecycle.bridgeEntered = true;
			if (event.stage === "backend_response_received") lifecycle.backendResponseReceived = true;
			options.onLifecycle?.(event);
		},
	};
}

function resolveTelemetryPhase(params: AscetMutationParams): "plan" | "commit" | "execute" {
	if (params.action === "apply_element_spec" || params.action === "set_element_dependency") {
		return params.phase === "commit" ? "commit" : "plan";
	}
	return "execute";
}

function recordMutationTelemetry(
	params: AscetMutationParams,
	result: AscetEditResult,
	options: RunAscetEditOperationOptions,
	startedAt: number,
	lifecycle: AscetWriteLifecycleEvidence,
): void {
	const outcome = result.details.outcome;
	const phase = resolveTelemetryPhase(params);
	const mutationStatus =
		phase === "plan" || outcome.status === "preflight" || !lifecycle.bridgeEntered
			? "not_started"
			: result.details.raw
				? classifyAscetEditExecution(result.details.raw).mutationStatus
				: (partialMutationStatus(outcome) ?? "not_started");
	const planId =
		"planId" in params && typeof params.planId === "string"
			? params.planId
			: outcome.status === "preflight" && typeof outcome.plan.planId === "string"
				? outcome.plan.planId
				: undefined;
	recordAscetWriteTelemetry(options, {
		operation: params.action,
		phase,
		outcome:
			outcome.status === "preflight"
				? "plan_ready"
				: outcome.status === "ok"
					? "committed"
					: outcome.status === "partial"
						? mutationStatus === "unknown"
							? "outcome_unknown"
							: "committed_unverified"
						: outcome.status === "blocked"
							? "blocked"
							: "error",
		durationMs: Math.max(0, Date.now() - startedAt),
		...(outcome.status === "error" ? { errorCode: outcome.error.code } : {}),
		...(planId ? { planId } : {}),
		...(result.details.verification ? { verificationStatus: result.details.verification.status } : {}),
		mutationStatus,
		bridgeEntered: lifecycle.bridgeEntered,
		backendResponseReceived: lifecycle.backendResponseReceived,
		mutationStarted: mutationStatus === "applied" || mutationStatus === "unknown",
		writesPerformed: mutationStatus === "applied",
		cleanupRequired: mutationStatus === "unknown",
	});
}

type PlanManagedPlanParams =
	| (AscetApplyElementPlanParams & {
			phase?: "plan";
			componentPath: string;
	  })
	| (Extract<AscetMutationParams, { action: "set_element_dependency" }> & {
			phase?: "plan";
			targetPath: string;
			elementName: string;
			dependency: "dependent" | "independent";
	  });
type PlanManagedCommitParams =
	| (AscetApplyElementCommitParams & { executeWrite?: boolean })
	| (Extract<AscetMutationParams, { action: "set_element_dependency" }> & { phase: "commit"; planId: string });

interface BackendMutationPreflight {
	outcome: AscetToolOutcome;
	raw: AscetCliJsonResult;
	preparedParams?: AscetMutationParams;
	temporarySpecFile?: string;
}

function isPlanManagedPlan(params: AscetMutationParams): params is PlanManagedPlanParams {
	return (
		(params.action === "apply_element_spec" || params.action === "set_element_dependency") &&
		params.phase !== "commit"
	);
}

function isPlanManagedCommit(params: AscetMutationParams): params is PlanManagedCommitParams {
	return (
		(params.action === "apply_element_spec" || params.action === "set_element_dependency") &&
		params.phase === "commit"
	);
}

function toPlanJson(value: unknown): AscetPlanJsonValue {
	return JSON.parse(JSON.stringify(value)) as AscetPlanJsonValue;
}

function createPlanStore(options: RunAscetEditOperationOptions): AscetPlanStore {
	return new AscetPlanStore({ artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined) });
}

function createPlanContractFingerprint(params: PlanManagedPlanParams): string {
	const selection = selectAscetPublicSchemaVariants(ascetMutationParameters, params);
	if (selection.status !== "selected" || selection.variants.length === 0) {
		throw new AscetPlanStoreError(
			"invalid_plan_input",
			`Unable to resolve the current public contract for ${params.action}.`,
		);
	}
	return createAscetPlanContractFingerprint(toPlanJson(selection.variants.map((variant) => variant.schema)));
}

async function readCurrentPlanDatabaseIdentity(
	options: RunAscetEditOperationOptions,
): Promise<AscetPlanDatabaseIdentity> {
	const raw = await runAscetCliJson(["exec", "get_database_identity", "--request-json", "{}", "--json"], {
		...options,
		toolName: "ascet_edit",
		commandId: "get_database_identity",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
	const payload = unwrapToolSuccessPayload(raw.data);
	const identity = raw.ok && isRecord(payload) ? getAscetDatabaseIdentity(payload) : undefined;
	if (!identity) {
		throw new AscetPlanStoreError(
			"plan_database_identity_missing",
			raw.error?.message ?? "Plan preflight did not return the current ASCET database identity.",
		);
	}
	return identity;
}

function readString(record: Record<string, unknown> | undefined, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record?.[key];
		if (typeof value === "string" && value.trim().length > 0) return value;
	}
	return undefined;
}

function getPlanTargetIdentity(
	params: PlanManagedPlanParams,
	backendPreflight: AscetPlanJsonValue,
): AscetPlanTargetIdentity {
	const preflight = isRecord(backendPreflight) ? backendPreflight : undefined;
	if (params.action === "apply_element_spec") {
		const identity = asRecord(preflight?.catalogIdentity);
		const oid = readString(identity, "componentOID", "componentOid", "oid");
		if (oid && params.componentPath) {
			return { path: normalizeAscetPath(params.componentPath), oid, kind: "component" };
		}
	} else {
		const result = asRecord(preflight?.result);
		const payload = asRecord(result?.payload);
		const identity = asRecord(payload?.identity) ?? asRecord(result?.identity);
		const path =
			params.targetPath && params.elementName
				? `${normalizeAscetPath(params.targetPath)}::${params.elementName}`
				: undefined;
		const elementOid = readString(identity, "elementOID", "elementOid");
		if (elementOid && path) {
			return { path, oid: elementOid, kind: "element" };
		}
		const componentOid = readString(identity, "componentOID", "componentOid");
		if (componentOid && path) {
			return { path, oid: componentOid, kind: "component_element" };
		}
	}
	throw new AscetPlanStoreError(
		"plan_target_identity_missing",
		`Plan preflight did not return a stable target OID/path/kind for ${params.action}.`,
	);
}

function planStoreFailure(error: unknown): AscetEditResult {
	if (error instanceof AscetPlanStoreError) {
		return asResponse({ status: "error", error: { code: error.code, message: error.message } });
	}
	throw error;
}

function storedCommitParams(params: PlanManagedPlanParams): AscetPlanJsonValue {
	const stored = { ...params } as Record<string, unknown>;
	delete stored.phase;
	delete stored.planId;
	delete stored.executeWrite;
	return toPlanJson(stored);
}

async function runPlanManagedPlan(
	params: PlanManagedPlanParams,
	options: RunAscetEditOperationOptions,
): Promise<AscetEditResult> {
	const backend = await runBackendMutationPreflight(params, options);
	if (!backend) {
		return asResponse({
			status: "error",
			error: {
				code: "plan_preflight_unavailable",
				message: `${params.action} did not produce a backend preflight.`,
			},
		});
	}
	if (backend.outcome.status !== "preflight") {
		try {
			return asResponse(backend.outcome, backend.raw);
		} finally {
			if (backend.temporarySpecFile) removeTemporaryElementSpec(backend.temporarySpecFile);
		}
	}
	const backendPreflight = toPlanJson(backend.outcome.plan.backendPreflight ?? {});
	try {
		const databaseIdentity = await readCurrentPlanDatabaseIdentity(options);
		const targetIdentity = getPlanTargetIdentity(params, backendPreflight);
		const record = createPlanStore(options).create({
			operation: params.action,
			params: storedCommitParams(params),
			binding: createAscetPlanBinding(options),
			databaseIdentity,
			targetIdentity,
			backendPreflight,
			contractFingerprint: createPlanContractFingerprint(params),
		});
		return asResponse(
			{
				status: "preflight",
				plan: {
					...backend.outcome.plan,
					version: record.version,
					planId: record.planId,
					planFingerprint: record.planFingerprint,
					contractFingerprint: record.contractFingerprint,
					evidenceFingerprint: record.evidenceFingerprint,
					databaseIdentity: record.databaseIdentity,
					targetIdentity: record.targetIdentity,
					expiresAt: record.expiresAt,
				},
				nextStep: `Call ${params.action} with phase=commit and planId=${record.planId}.`,
			},
			backend.raw,
		);
	} catch (error) {
		return planStoreFailure(error);
	} finally {
		if (backend.temporarySpecFile) {
			removeTemporaryElementSpec(backend.temporarySpecFile);
		}
	}
}

async function runPlanManagedCommit(
	params: PlanManagedCommitParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetEditResult> {
	const store = createPlanStore(options);
	let temporarySpecFile: string | undefined;
	try {
		const record = store.load(params.planId);
		if (record.operation !== params.action || !isRecord(record.params)) {
			return asResponse({
				status: "error",
				error: { code: "plan_operation_mismatch", message: `Plan ${params.planId} is not for ${params.action}.` },
			});
		}
		const planned = normalizeAscetMutationParams(record.params as unknown as AscetMutationParams);
		if (!isPlanManagedPlan(planned) || planned.action !== params.action) {
			return asResponse({
				status: "error",
				error: { code: "plan_corrupt", message: `Plan ${params.planId} does not contain valid commit parameters.` },
			});
		}
		const contractError = validateAscetMutationContract(planned);
		const parameterError = validateAscetMutationParams(planned);
		const localError = validateLocalMutationInputs(planned, options);
		if (contractError || parameterError || localError) {
			return asResponse(contractError ?? parameterError ?? localError!);
		}
		const contractFingerprint = createPlanContractFingerprint(planned);
		const databaseIdentity = await readCurrentPlanDatabaseIdentity(options);
		const backend = await runBackendMutationPreflight(planned, options);
		temporarySpecFile = backend?.temporarySpecFile;
		if (!backend || backend.outcome.status !== "preflight") {
			return backend
				? asResponse(backend.outcome, backend.raw)
				: asResponse({
						status: "error",
						error: { code: "plan_preflight_unavailable", message: "Commit preflight unavailable." },
					});
		}
		temporarySpecFile = backend.temporarySpecFile;
		const backendPreflight = toPlanJson(backend.outcome.plan.backendPreflight ?? {});
		const targetIdentity = getPlanTargetIdentity(planned, backendPreflight);
		const verificationInput = {
			planId: params.planId,
			operation: params.action,
			params: record.params,
			binding: createAscetPlanBinding(options),
			databaseIdentity,
			targetIdentity,
			backendPreflight,
			contractFingerprint,
		};
		store.verify(verificationInput);
		const prepared = backend.preparedParams;
		const summary =
			planned.action === "apply_element_spec"
				? createApplyElementSpecSummary(requirePreparedApplyElementParams(prepared))
				: createSetElementDependencySummary({ ...planned, targetPath: planned.targetPath! });
		const approval = await requestAscetEditApproval(
			{
				executeWrite: true,
				title: `Confirm ${params.action} plan`,
				message: `planId: ${params.planId}
planFingerprint: ${record.planFingerprint}
${summary}`,
				signal: options.signal,
			},
			ctx,
		);
		if (!approval.approved) {
			return asResponse({ status: "blocked", code: approval.code, message: approval.message });
		}
		store.consume(verificationInput);
		const raw =
			planned.action === "apply_element_spec"
				? await runAscetApplyElementSpec(
						{
							...requirePreparedApplyElementParams(prepared),
							executeWrite: true,
							verifyReadback: true,
						},
						options,
					)
				: await runAscetSetElementDependency(
						{
							...planned,
							targetPath: planned.targetPath!,
							dryRun: false,
							executeWrite: true,
							verifyReadback: true,
						},
						options,
					);
		return finalizeAscetMutation({ params: planned, raw, options });
	} catch (error) {
		return planStoreFailure(error);
	} finally {
		if (temporarySpecFile) {
			removeTemporaryElementSpec(temporarySpecFile);
		}
	}
}

function hasInternalSpecFile(params: AscetMutationParams): params is AscetMutationParams & {
	action: "apply_element_spec";
	specFile: string;
} {
	return (
		params.action === "apply_element_spec" &&
		typeof (params as unknown as Record<string, unknown>).specFile === "string"
	);
}

function requirePreparedApplyElementParams(params: AscetMutationParams | undefined): AscetApplyElementSpecParams {
	if (!params || params.action !== "apply_element_spec" || !hasInternalSpecFile(params)) {
		throw new Error("Apply element spec preparation was not retained.");
	}
	return params as AscetApplyElementSpecParams;
}

function validateAscetMutationContract(params: AscetMutationParams): AscetToolOutcome | undefined {
	const action = params.action;
	if (Value.Check(ascetMutationParameters, params)) {
		return undefined;
	}
	return {
		status: "error",
		error: {
			code: "ascet_edit_invalid_parameter",
			message: `Invalid parameters for ascet_edit action '${action}'. Unknown properties and values not accepted by the action contract are rejected.`,
		},
	};
}

function validateLocalMutationInputs(
	_params: AscetMutationParams,
	_options: RunAscetEditOperationOptions,
): AscetToolOutcome | undefined {
	return undefined;
}

async function runBackendMutationPreflight(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
): Promise<BackendMutationPreflight | undefined> {
	if (params.action === "apply_element_spec" && params.phase !== "commit") {
		if (!params.componentPath || !params.intent || !params.elements) {
			return undefined;
		}
		const catalogRaw = await runAscetCliJson(
			["exec", "read_element_catalog", normalizeAscetPath(params.componentPath), "--json"],
			{
				...options,
				toolName: "ascet_edit",
				commandId: "read_element_catalog",
				jobKind: "read",
			},
		);
		if (!catalogRaw.ok) {
			return { outcome: outcomeFromCliResult(catalogRaw), raw: catalogRaw };
		}
		const catalog = findElementSpecDocument(catalogRaw.data);
		if (!catalog) {
			return {
				outcome: {
					status: "error",
					error: {
						code: "element_catalog_invalid",
						message: "read_element_catalog did not return a recoverable {elements: []} document.",
					},
				},
				raw: catalogRaw,
			};
		}
		let normalized: NormalizedElementSpecResult;
		try {
			normalized = normalizeAscetElementSpec(params.intent, params.elements, catalog.elements);
		} catch (error) {
			return {
				outcome: {
					status: "error",
					error: {
						code: "element_spec_invalid",
						message: error instanceof Error ? error.message : String(error),
					},
				},
				raw: catalogRaw,
			};
		}
		const specFile = writeTemporaryElementSpec(
			normalized.spec,
			getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
		);
		const raw = await runAscetCliJson(
			["exec", "diff_element_spec", normalizeAscetPath(params.componentPath), specFile, "--json"],
			{
				...options,
				toolName: "ascet_edit",
				commandId: "diff_element_spec",
				jobKind: "read",
			},
		);
		const preparedParams = { ...params, specFile, executeWrite: false } as unknown as AscetMutationParams;
		if (!raw.ok) {
			return { outcome: outcomeFromCliResult(raw), raw, preparedParams, temporarySpecFile: specFile };
		}
		return {
			outcome: createPreflightOutcome({
				action: params.action,
				params,
				backendPreflight: {
					operation: "diff_element_spec",
					validated: true,
					liveElementCount: catalog.elements.length,
					liveSnapshotHash: fingerprintJson(catalog),
					catalogSnapshot: catalog,
					catalogIdentity: isRecord(catalog.identity) ? catalog.identity : undefined,
					normalizedSpecHash: fingerprintJson(normalized.spec),
					resolvedIntent: normalized.resolvedIntent,
					resolvedOperations: normalized.resolvedOperations,
					warnings: normalized.warnings,
					normalizedSpec: normalized.spec,
					result: unwrapToolSuccessPayload(raw.data),
					limitations: [
						"diff_element_spec validates and plans the spec without applying Data/Implementation writes or readback.",
						...(params.projectPath
							? ["projectPath-specific formula validation remains deferred to apply_element_spec commit."]
							: []),
					],
				},
			}),
			raw,
			preparedParams,
			temporarySpecFile: specFile,
		};
	}
	if (
		params.action === "set_element_dependency" &&
		params.phase !== "commit" &&
		params.targetPath &&
		params.elementName &&
		params.dependency
	) {
		const raw = await runAscetSetElementDependency(
			{
				targetPath: params.targetPath,
				elementName: params.elementName,
				dependency: params.dependency,
				dependencyFormula: params.dependencyFormula,
				dependencyFormals: params.dependencyFormals,
				bindingPolicy: params.bindingPolicy,
				dependencyMappings: params.dependencyMappings,
				variantPolicy: params.variantPolicy,
				variants: params.variants,
				valueRestoration: params.valueRestoration,
				clearDependencyFormula: params.clearDependencyFormula,
				targetKind: params.targetKind,
				match: params.match,
				dryRun: true,
				backupDir: params.backupDir,
				executeWrite: false,
			},
			options,
		);
		if (!raw.ok) {
			return { outcome: outcomeFromCliResult(raw), raw };
		}
		return {
			outcome: createPreflightOutcome({
				action: params.action,
				params,
				backendPreflight: {
					operation: "set_element_dependency",
					validated: true,
					dryRun: true,
					result: unwrapToolSuccessPayload(raw.data),
					limitations: [
						"Preflight uses the existing backend dry-run contract; XML mutation/readback coverage remains owned by that backend implementation.",
					],
				},
			}),
			raw,
		};
	}
	return undefined;
}

function prepareExecutableMutation(params: AscetMutationParams): ExecutableAscetMutationParams {
	return { ...params, executeWrite: true, verifyReadback: true } as ExecutableAscetMutationParams;
}

interface FinalizeAscetMutationInput {
	params: AscetMutationParams;
	raw: AscetCliJsonResult;
	options: RunAscetEditOperationOptions;
}

function finalizeAscetMutation(input: FinalizeAscetMutationInput): AscetEditResult {
	const errorCode = input.raw.error?.code;
	if (
		errorCode &&
		(isAscetEditApprovalBlockedCode(errorCode) ||
			errorCode.endsWith("_confirmation_ui_failed") ||
			errorCode.endsWith("_preflight_required"))
	) {
		return asResponse(outcomeFromCliResult(input.raw), input.raw);
	}

	const classification = classifyAscetEditExecution(input.raw);
	if (classification.mutationStatus === "not_started") {
		return asResponse(outcomeFromCliResult(input.raw), input.raw, undefined, classification.verification);
	}

	const observations = classification.shouldInvalidateObservations
		? invalidateAscetEditObservations(input.params, input.options)
		: { invalidated: [] };

	if (input.raw.ok && classification.verification.status === "passed") {
		return asResponse(
			createVerifiedEditOutcome(input.raw, classification.verification, observations),
			input.raw,
			observations,
			classification.verification,
		);
	}

	return asResponse(
		createPartialEditOutcome(input.raw, classification, observations),
		input.raw,
		observations,
		classification.verification,
	);
}

const VERIFICATION_RESULT_KEYS = [
	"readback",
	"verify",
	"verification",
	"verifyReadbackRequested",
	"VerifyReadbackRequested",
	"readbackVerified",
	"ReadbackVerified",
] as const;

function extractChangedPayload(raw: AscetCliJsonResult): unknown {
	const payload = unwrapToolSuccessPayload(raw.data);
	const record = asRecord(payload);
	return record ? omitKeys(record, VERIFICATION_RESULT_KEYS) : payload;
}

function createVerifiedEditOutcome(
	raw: AscetCliJsonResult,
	verification: AscetEditVerification,
	observations: AscetObservationInvalidation,
): AscetToolOutcome {
	return {
		status: "ok",
		verified: true,
		data: {
			changed: extractChangedPayload(raw),
			verification,
			observations,
		},
		warnings: [],
	};
}

function createPartialEditOutcome(
	raw: AscetCliJsonResult,
	classification: AscetEditExecutionClassification,
	observations: AscetObservationInvalidation,
): AscetToolOutcome {
	const code = raw.error?.code ?? verificationFailureCode(classification.verification.status);
	const message = raw.error?.message ?? "ASCET write completed without proven automatic readback verification.";
	return {
		status: "partial",
		data: {
			mutationStatus: classification.mutationStatus,
			...(raw.ok ? { changed: extractChangedPayload(raw) } : {}),
			verification: classification.verification,
			observations,
		},
		failures: [{ code, message, retryable: false, requiresFreshRead: true }],
	};
}

function verificationFailureCode(status: AscetEditVerification["status"]): string {
	switch (status) {
		case "failed":
			return "ascet_edit_readback_failed";
		case "missing":
			return "ascet_edit_verification_evidence_missing";
		case "unknown":
			return "ascet_edit_write_outcome_unknown";
		case "passed":
			return "ascet_edit_verification_failed";
	}
}

function partialMutationStatus(outcome: AscetToolOutcome): AscetEditMutationStatus | undefined {
	if (outcome.status !== "partial" || !isRecord(outcome.data)) {
		return undefined;
	}
	const status = outcome.data.mutationStatus;
	return status === "applied" || status === "not_started" || status === "unknown" ? status : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function omitKeys(record: Record<string, unknown>, keys: readonly string[]): Record<string, unknown> {
	const omit = new Set(keys);
	return Object.fromEntries(Object.entries(record).filter(([key]) => !omit.has(key)));
}

function normalizeAscetMutationParams(params: AscetMutationParams): AscetMutationParams {
	if (
		params.action === "create_component" &&
		!params.language &&
		(params.kind === "class" || params.kind === "module")
	) {
		return { ...params, language: "ESDL" };
	}
	if (params.action === "create_method" && !params.methodKind && params.componentKind) {
		const defaultMethodKind = getDefaultCreateMethodKind(params.componentKind);
		if (defaultMethodKind) {
			return { ...params, methodKind: defaultMethodKind };
		}
	}
	if (params.action === "set_module_code" && !params.operation && params.section) {
		return { ...params, operation: params.section };
	}
	if (
		(params.action === "apply_element_spec" || params.action === "set_element_dependency") &&
		params.phase === "commit"
	) {
		return params;
	}
	if (params.action === "apply_element_spec" && params.phase === undefined) {
		return { ...params, phase: "plan" };
	}
	if (params.action === "set_element_dependency") {
		const targetPath = params.targetPath ?? params.componentPath;
		if (targetPath) {
			return {
				...params,
				phase: params.phase ?? "plan",
				targetPath,
				dependencyMappings: resolveSetElementDependencyMappings(params),
			};
		}
	}
	return params;
}

function validateAscetMutationParams(params: AscetMutationParams): AscetToolOutcome | undefined {
	if (params.action === "set_element_dependency") {
		if (
			params.targetPath &&
			params.componentPath &&
			normalizeAscetPath(params.targetPath) !== normalizeAscetPath(params.componentPath)
		) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_conflicting_parameter",
					message:
						"set_element_dependency targetPath and componentPath must identify the same target when both are provided.",
				},
			};
		}
		if (!params.targetPath && !params.componentPath) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires targetPath or componentPath.",
				},
			};
		}
		if (!params.elementName) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires elementName.",
				},
			};
		}
		if (!params.dependency) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_parameter",
					message: "set_element_dependency requires dependency.",
				},
			};
		}
		if (params.dependency === "independent" && params.dependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: 'set_element_dependency dependencyFormula is only valid with dependency="dependent".',
				},
			};
		}
		if (params.dependencyFormula && params.clearDependencyFormula) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency dependencyFormula and clearDependencyFormula cannot be used together.",
				},
			};
		}
		if (params.bindingPolicy === "autoExactName") {
			if (!params.dependencyFormula || !params.dependencyFormals?.length) {
				return {
					status: "error",
					error: {
						code: "dependency_formals_required",
						message: "bindingPolicy=autoExactName requires dependencyFormula and explicit dependencyFormals.",
					},
				};
			}
			if (params.variantMappings) {
				return {
					status: "error",
					error: {
						code: "ascet_edit_invalid_parameter",
						message: "autoExactName does not combine with per-variant explicit mappings.",
					},
				};
			}
			const mappings = params.dependencyMappings ?? {};
			const formals = new Set(params.dependencyFormals);
			const deterministic =
				Object.keys(mappings).length === formals.size &&
				Object.entries(mappings).every(
					([formal, target]) => formals.has(formal) && typeof target === "string" && target === formal,
				);
			if (!deterministic) {
				return {
					status: "error",
					error: {
						code: "auto_exact_name_mapping_mismatch",
						message: "autoExactName mappings must be the unique exact-name mapping for every declared formal.",
					},
				};
			}
		}
		if (
			params.dependencyFormula &&
			params.bindingPolicy !== "autoExactName" &&
			(!params.dependencyMappings || Object.keys(params.dependencyMappings).length === 0) &&
			(!params.variantMappings || Object.keys(params.variantMappings).length === 0)
		) {
			return {
				status: "error",
				error: {
					code: "dependency_mappings_required",
					message:
						"set_element_dependency dependencyFormula requires explicit dependencyMappings, or autoExactName with explicit dependencyFormals; formula token inference is disabled.",
				},
			};
		}
		if (params.dependencyFormals && params.bindingPolicy !== "autoExactName") {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "dependencyFormals is only valid with bindingPolicy=autoExactName.",
				},
			};
		}
		if (
			((params.dependencyMappings && Object.keys(params.dependencyMappings).length > 0) ||
				(params.variantMappings && Object.keys(params.variantMappings).length > 0)) &&
			!params.dependencyFormula
		) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency dependencyMappings requires dependencyFormula.",
				},
			};
		}
		const writesData = params.dependency === "independent" || params.dependencyFormula !== undefined;
		if (writesData && !params.variantPolicy) {
			return {
				status: "error",
				error: {
					code: "data_variant_selection_required",
					message: "set_element_dependency data writes require explicit variantPolicy: default, selected, or all.",
				},
			};
		}
		if (params.variantPolicy === "selected" && (!params.variants || params.variants.length === 0)) {
			return {
				status: "error",
				error: {
					code: "data_variant_selection_required",
					message: 'set_element_dependency variantPolicy="selected" requires variants.',
				},
			};
		}
		if (params.variantPolicy !== "selected" && params.variants) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency variants is only valid with variantPolicy=selected.",
				},
			};
		}
		if (params.variantMappings && params.variantPolicy !== "selected") {
			return {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message: "set_element_dependency variantMappings requires variantPolicy=selected.",
				},
			};
		}
		if (params.variantMappings && params.variants) {
			const selected = new Set(params.variants);
			const mapped = Object.keys(params.variantMappings);
			if (
				mapped.some((variant) => !selected.has(variant)) ||
				params.variants.some((variant) => !params.variantMappings?.[variant])
			) {
				return {
					status: "error",
					error: {
						code: "data_variant_mapping_mismatch",
						message: "variantMappings must define exactly every selected DataVariant.",
					},
				};
			}
		}
		if (params.dependency === "independent" && !params.valueRestoration) {
			return {
				status: "error",
				error: {
					code: "independent_value_restoration_required",
					message:
						"set_element_dependency independent conversion requires valueRestoration fromSnapshot, explicit, or ascetDefault.",
				},
			};
		}
		if (
			params.valueRestoration?.policy === "explicit" &&
			(!params.valueRestoration.valuesByVariant || Object.keys(params.valueRestoration.valuesByVariant).length === 0)
		) {
			return {
				status: "error",
				error: {
					code: "independent_value_restoration_required",
					message: "Explicit independent restoration requires valuesByVariant.",
				},
			};
		}
	}
	if (params.action === "create_method") {
		if (params.executeWrite && !params.componentKind) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_component_kind",
					message:
						"create_method with executeWrite=true requires componentKind; inspect the target first so methodKind can be validated before ASCET ToolAPI execution.",
				},
			};
		}
		if (params.executeWrite && !params.methodKind) {
			return {
				status: "error",
				error: {
					code: "ascet_edit_missing_method_kind",
					message:
						"create_method requires methodKind for statemachine targets; inspect the target and choose action, condition, or trigger.",
				},
			};
		}
		const compatibility = validateCreateMethodKindCompatibility(params);
		if (compatibility) {
			return {
				status: "error",
				error: compatibility,
			};
		}
	}
	if (params.action === "set_module_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "section parameter is required for set_module_code",
			},
		};
	}
	if (params.action === "set_state_machine_code" && !params.operation) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: `operation parameter is required for set_state_machine_code. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	if (params.action === "set_state_machine_code" && !VALID_STATE_MACHINE_OPERATIONS.has(params.operation)) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_invalid_operation",
				message: `Unknown state-machine write operation '${params.operation}'. Valid values: ${VALID_STATE_MACHINE_OPERATIONS_TEXT}.`,
			},
		};
	}
	if (params.action === "set_enumerators" && params.enumerators.length === 0) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "set_enumerators requires at least one enumerator.",
			},
		};
	}
	if (
		params.action === "set_method_signature" &&
		!params.returnType &&
		(!params.arguments || params.arguments.length === 0)
	) {
		return {
			status: "error",
			error: {
				code: "ascet_edit_missing_parameter",
				message: "set_method_signature requires returnType or at least one argument.",
			},
		};
	}
	if (params.action === "set_element_dependency" && params.targetKind === "folder" && params.match !== "all") {
		return {
			status: "error",
			error: {
				code: "ascet_edit_invalid_scope",
				message: 'set_element_dependency folder writes require match="all" to modify multiple candidates.',
			},
		};
	}
	return undefined;
}

async function dispatchMutation(
	params: ExecutableAscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_folder":
			return runApprovedAscetCreateFolder(params, options, ctx);
		case "create_component":
			return runApprovedAscetCreateComponent(params, options, ctx);
		case "create_method":
			if (!params.methodKind) {
				throw new Error("create_method requires methodKind after validation.");
			}
			return runApprovedAscetCreateMethod({ ...params, methodKind: params.methodKind }, options, ctx);
		case "set_method_signature":
			return runApprovedAscetSetMethodSignature(params, options, ctx);
		case "delete_component":
			return runApprovedAscetDeleteComponent(params, options, ctx);
		case "delete_method":
			return runApprovedAscetDeleteMethod(params, options, ctx);
		case "delete_folder":
			return runApprovedAscetDeleteFolder(params, options, ctx);
		case "set_method_code":
			return withEditCode(params, (codeFile) =>
				runApprovedAscetSetMethodCode({ ...params, codeFile }, options, ctx),
			);
		case "set_module_code":
			return withEditCode(params, (codeFile) =>
				runApprovedAscetSetModuleCode({ ...params, operation: params.operation!, codeFile }, options, ctx),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withEditCode(params, (codeFile) =>
					runApprovedAscetSetStateMachineCode({ ...params, codeFile }, options, ctx),
				);
			}
			return runApprovedAscetSetStateMachineCode(params, options, ctx);
		case "set_enumerators":
			return runApprovedAscetSetEnumerators(params, options, ctx);
		case "apply_element_spec":
			if (params.phase === "commit") {
				throw new Error("apply_element_spec commit must be invoked with planId.");
			}
			return runApprovedAscetApplyElementSpec(requirePreparedApplyElementParams(params), options, ctx);
		case "apply_project_formula":
			return runApprovedAscetApplyProjectFormula(params, options, ctx);
		case "set_element_dependency":
			if (!params.targetPath || !params.elementName || !params.dependency || params.phase === "commit") {
				throw new Error(
					"set_element_dependency requires planned targetPath/elementName/dependency after validation.",
				);
			}
			return runApprovedAscetSetElementDependency(
				{
					...params,
					targetPath: params.targetPath,
					elementName: params.elementName,
					dependency: params.dependency,
				},
				options,
				ctx,
			);
	}
}

export function formatAscetEditResult(result: AscetEditResult): string {
	return result.content[0]?.text ?? "";
}

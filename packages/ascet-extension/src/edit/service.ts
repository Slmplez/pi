import { Value } from "typebox/value";
import {
	type AscetApplyElementSpecParams,
	buildApplyElementSpecArgs,
	createApplyElementSpecSummary,
	runAscetApplyElementSpec,
} from "../apply-element-spec.ts";
import { buildApplyProjectFormulaArgs, runAscetApplyProjectFormula } from "../apply-project-formula.ts";
import { type AscetCliJsonResult, type AscetCliLifecycleEvent, runAscetCliJson } from "../cli.ts";
import { normalizeAscetPath } from "../core/path.ts";
import { type AscetToolOutcome, createPreflightOutcome } from "../core/results.ts";
import { withInlineCodeFile } from "../core/temp-files.ts";
import { runAscetCreateComponent } from "../create-component.ts";
import { type AscetCreateDependentChainParams, runAscetCreateDependentChain } from "../create-dependent-chain.ts";
import { runAscetCreateFolder } from "../create-folder.ts";
import { runAscetCreateMethod } from "../create-method.ts";
import { buildDeleteComponentArgs, runAscetDeleteComponent } from "../delete-component.ts";
import { runAscetDeleteFolder } from "../delete-folder.ts";
import { buildDeleteMethodArgs, runAscetDeleteMethod } from "../delete-method.ts";
import {
	type AscetApplyElementPlanParams,
	type NormalizedElementSpecResult,
	normalizeAscetElementSpec,
} from "../element-spec-contract.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "../get.ts";
import {
	type AscetCreateMethodComponentKind,
	validateCreateMethodKindCompatibility,
} from "../method-kind-compatibility.ts";
import { getAscetArtifactRoot } from "../observation-store.ts";
import { type AscetPermissionSnapshot, resolveAscetPermissionSnapshot } from "../permissions/types.ts";
import {
	type AscetDependencyMappingTarget,
	type AscetDependencyRestorationValue,
	buildSetElementDependencyArgs,
	createSetElementDependencySummary,
	resolveSetElementDependencyMappings,
	runAscetSetElementDependency,
} from "../set-element-dependency.ts";
import { buildSetEnumeratorsArgs, runAscetSetEnumerators } from "../set-enumerators.ts";
import { buildSetMethodCodeArgs, runAscetSetMethodCode } from "../set-method-code.ts";
import {
	buildSetMethodSignatureArgs,
	createMethodSignatureSpec,
	runAscetSetMethodSignature,
} from "../set-method-signature.ts";
import { buildSetModuleCodeArgs, runAscetSetModuleCode } from "../set-module-code.ts";
import {
	ASCET_SET_STATE_MACHINE_CODE_OPERATIONS,
	buildSetStateMachineCodeArgs,
	runAscetSetStateMachineCode,
} from "../set-state-machine-code.ts";
import { compactObject, toToolFailurePayload, unwrapToolSuccessPayload } from "../tool-response-contract.ts";
import { openAiObjectUnionSchema } from "../tools/_shared/openai-schema.ts";
import { ascetMutationActionSchemas } from "../tools/actions/contracts/edit.ts";
import { selectAscetPublicSchemaVariants } from "../tools/actions/schema-registry.ts";
import { type AscetEditApprovalContext, isAscetEditApprovalBlockedCode } from "./approval.ts";
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
	runAscetEditability,
} from "./editability.ts";
import { isAscetEditableWriteGateBlockedCode } from "./editable-write-gate.ts";
import {
	findElementSpecDocument,
	fingerprintJson,
	removeTemporaryElementSpec,
	writeTemporaryElementSpec,
} from "./element-spec-plan.ts";
import { runGuardedAscetMutation } from "./guarded-mutation.ts";
import { AscetMutationCoordinator, AscetMutationCoordinatorError } from "./mutation-coordinator.ts";
import { AscetMutationGuardStore, AscetMutationGuardStoreError } from "./mutation-guard-store.ts";
import type { AscetMutationResultEnvelope } from "./mutation-result.ts";
import {
	type AscetPlanDatabaseIdentity,
	type AscetPlanJsonValue,
	AscetPlanStore,
	AscetPlanStoreError,
	type AscetPlanTargetIdentity,
	createAscetPlanBinding,
	createAscetPlanContractFingerprint,
	type VerifyAscetPlanInput,
} from "./plan-store.ts";
import { AscetMutationPreflightRegistry, createAscetMutationPreflightEvidence } from "./preflight/service.ts";
import type { AscetMutationPreflightEvidence, AscetPlannedEffect } from "./preflight/types.ts";
import { type AscetTargetImpact, type AscetTargetImpactEntry, resolveAscetTargetImpact } from "./target-impact.ts";
import {
	type AscetEditExecutionClassification,
	type AscetEditMutationStatus,
	type AscetEditVerification,
	classifyAscetEditExecution,
} from "./verification.ts";
import type { AscetMutationIntent } from "./write-control-contract.ts";
import { recordAscetWriteTelemetry } from "./write-telemetry.ts";

type CodeSource = { code?: string; codeFile?: string };
const VALID_STATE_MACHINE_OPERATIONS = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const VALID_STATE_MACHINE_OPERATIONS_TEXT = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

export type AscetMutationParams =
	| { action: "create_folder"; folderPath: string; intent: AscetMutationIntent }
	| {
			action: "create_component";
			componentPath: string;
			kind: "class" | "module" | "statemachine" | "enumeration";
			language?: "ESDL" | "BDE" | "C";
			ifExists?: "fail" | "return-existing";
			rollbackOnFailure?: boolean;
			intent: AscetMutationIntent;
	  }
	| {
			action: "create_method";
			componentPath: string;
			componentKind?: AscetCreateMethodComponentKind;
			methodName: string;
			methodKind: "abstract" | "process" | "action" | "condition" | "trigger";
			diagram?: string;
			ifExists?: "fail" | "return-existing";
			intent: AscetMutationIntent;
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
			intent: AscetMutationIntent;
	  }
	| {
			action: "delete_component";
			componentPath: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetMutationIntent;
	  }
	| {
			action: "delete_method";
			componentPath: string;
			methodName: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetMutationIntent;
	  }
	| {
			action: "delete_folder";
			folderPath: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetMutationIntent;
	  }
	| ({
			action: "set_method_code";
			componentPath: string;
			methodName: string;
			intent: AscetMutationIntent;
	  } & CodeSource)
	| ({
			action: "set_module_code";
			modulePath: string;
			operation?: "set-method" | "set-header" | "set-external-c-code";
			section?: "set-method" | "set-header" | "set-external-c-code";
			methodName?: string;
			intent: AscetMutationIntent;
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
			intent: AscetMutationIntent;
	  } & CodeSource)
	| {
			action: "set_enumerators";
			componentPath: string;
			enumerators: string[];
			intent: AscetMutationIntent;
	  }
	| AscetApplyElementPlanParams
	| {
			action: "apply_project_formula";
			projectPath: string;
			specFile: string;
			mode?: "restore";
			deleteMissing?: boolean;
			intent: AscetMutationIntent;
	  }
	| {
			action: "set_element_dependency";
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
			intent: AscetMutationIntent;
	  };

type ExecutableAscetMutationParams = AscetMutationParams & {
	intent: "apply";
	verifyReadback: true;
};

export type AscetEditParams = AscetMutationParams | AscetCreateDependentChainParams | AscetEditabilityParams;

export type AscetEditInvocation =
	| { kind: "mutation"; action: AscetMutationParams["action"] | "create_dependent_chain" }
	| { kind: "editability"; mode: AscetEditabilityParams["mode"] };

export interface AscetEditResult {
	content: Array<{ type: "text"; text: string }>;
	details: {
		outcome: AscetToolOutcome;
		raw?: AscetCliJsonResult;
		observations?: AscetObservationInvalidation;
		verification?: AscetEditVerification;
		mutationResult?: AscetMutationResultEnvelope;
		error?: { code: string; message: string };
	};
}

interface AscetEditRuntimeContext extends AscetEditApprovalContext {
	ascetPermission?: AscetPermissionSnapshot;
}

export const ascetMutationParameters = openAiObjectUnionSchema<AscetMutationParams>(ascetMutationActionSchemas);

function outcomeFromCliResult(result: AscetCliJsonResult): AscetToolOutcome {
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_edit_failed";
	const message = result.error?.message ?? "ASCET edit failed.";
	if (isAscetEditApprovalBlockedCode(code) || isAscetEditableWriteGateBlockedCode(code)) {
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

function outcomeError(outcome: AscetToolOutcome): { code: string; message: string } | undefined {
	if (outcome.status === "error") return outcome.error;
	if (outcome.status === "blocked") return { code: outcome.code, message: outcome.message };
	if (outcome.status === "partial") {
		const failure = outcome.failures[0];
		return failure && typeof failure.code === "string" && typeof failure.message === "string"
			? { code: failure.code, message: failure.message }
			: undefined;
	}
	return undefined;
}

function recoveryActions(raw: AscetCliJsonResult | undefined): string[] {
	const details = asRecord(raw?.error?.details);
	const values = details?.recoveryActions;
	return Array.isArray(values)
		? values.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		: [];
}

function guardedEditability(
	raw: AscetCliJsonResult | undefined,
): AscetMutationResultEnvelope["editability"] | undefined {
	const payload = asRecord(unwrapToolSuccessPayload(raw?.data));
	const errorDetails = asRecord(raw?.error?.details);
	const guarded =
		asRecord(payload?.guardedMutation) ??
		(Array.isArray(payload?.targets) || typeof payload?.initiallyEditable === "boolean" ? payload : undefined) ??
		errorDetails;
	const targets = Array.isArray(guarded?.targets)
		? guarded.targets.map(asRecord).filter((value) => value !== undefined)
		: [];
	if (targets.length === 0) {
		if (
			typeof guarded?.initiallyEditable !== "boolean" &&
			typeof guarded?.editabilityAcquired !== "boolean" &&
			typeof guarded?.finalEditable !== "boolean"
		) {
			return undefined;
		}
		const acquired = guarded?.editabilityAcquired === true;
		const initiallyEditable = guarded?.initiallyEditable === true;
		const finalKnown = typeof guarded?.finalEditable === "boolean";
		return {
			status: acquired ? "acquired" : initiallyEditable ? "editable" : finalKnown ? "blocked" : "unknown",
			initiallyEditable,
			acquiredByThisOperation: acquired,
			finalEditableState: finalKnown ? (guarded.finalEditable === true ? "editable" : "read_only") : "unknown",
		};
	}
	const acquired = targets.some((target) => target.editabilityAcquired === true);
	const initiallyEditable = targets.every((target) => target.initiallyEditable === true);
	const finalKnown = targets.every((target) => typeof target.finalEditable === "boolean");
	const finalEditable = finalKnown && targets.every((target) => target.finalEditable === true);
	return {
		status: acquired ? "acquired" : initiallyEditable ? "editable" : finalKnown ? "blocked" : "unknown",
		initiallyEditable,
		acquiredByThisOperation: acquired,
		finalEditableState: finalKnown ? (finalEditable ? "editable" : "read_only") : "unknown",
	};
}

function createMutationResultEnvelope(
	params: AscetMutationParams,
	result: AscetEditResult,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): AscetMutationResultEnvelope {
	const outcome = result.details.outcome;
	const classification = result.details.raw ? classifyAscetEditExecution(result.details.raw) : undefined;
	const partialStatus = partialMutationStatus(outcome);
	const preflightPlan = outcome.status === "preflight" ? outcome.plan : undefined;
	const noOp =
		preflightPlan && isRecord(preflightPlan.backendPreflight)
			? asRecord(preflightPlan.backendPreflight.result)?.noOp === true
			: false;
	const mutationStatus =
		outcome.status === "preflight"
			? noOp
				? "no_op"
				: "not_started"
			: outcome.status === "blocked" || (outcome.status === "error" && !lifecycle.bridgeEntered)
				? "not_started"
				: (partialStatus ??
					classification?.mutationStatus ??
					(outcome.status === "ok" && lifecycle.bridgeEntered ? "applied" : "not_started"));
	const verificationStatus =
		outcome.status === "preflight"
			? noOp
				? "passed"
				: "not_applicable"
			: (result.details.verification?.status ?? classification?.verification.status ?? "not_applicable");
	const guardedEditabilityResult = guardedEditability(result.details.raw);
	const error =
		outcomeError(outcome) ??
		(result.details.raw?.error
			? { code: result.details.raw.error.code, message: result.details.raw.error.message }
			: undefined);
	const status: AscetMutationResultEnvelope["status"] =
		mutationStatus === "rolled_back"
			? "rolled_back"
			: mutationStatus === "unknown"
				? "unknown"
				: mutationStatus === "partially_applied" || outcome.status === "partial"
					? "partial"
					: outcome.status === "blocked"
						? "blocked"
						: outcome.status === "error"
							? "error"
							: "ok";
	const actions = recoveryActions(result.details.raw);
	if (
		guardedEditabilityResult?.acquiredByThisOperation === true &&
		(mutationStatus === "partially_applied" || mutationStatus === "unknown")
	) {
		actions.push(
			"Component editability was acquired and may remain changed; inspect the reported final editable state before retrying.",
		);
	}
	if (actions.length === 0) {
		if (mutationStatus === "unknown") {
			actions.push("Re-read the target and reconcile the mutation outcome before retrying.");
		} else if (mutationStatus === "partially_applied") {
			actions.push("Re-read every affected target and reconcile partial changes before retrying.");
		} else if (
			mutationStatus === "applied" &&
			(verificationStatus === "failed" || verificationStatus === "missing" || verificationStatus === "unknown")
		) {
			actions.push("Re-read the target and verify the applied change before retrying.");
		}
	}
	const preflightEvidence = lifecycle.preflight ?? preflightPlan;
	return {
		status,
		permission: lifecycle.permission ?? { mode: resolveAscetPermissionSnapshot(ctx).mode, decision: "not_evaluated" },
		preflight: {
			status: preflightEvidence
				? "passed"
				: !lifecycle.bridgeEntered && outcome.status === "error"
					? "failed"
					: "not_run",
			...(preflightEvidence ? { evidence: preflightEvidence } : {}),
		},
		editability:
			guardedEditabilityResult ??
			lifecycle.editability ??
			(getAscetEditAction(params.action)?.permission?.requiresEditableTarget
				? { status: "unknown" }
				: { status: "not_applicable" }),
		mutation: { status: mutationStatus },
		verification: { status: verificationStatus },
		...(error ? { error } : {}),
		...(lifecycle.audit ? { audit: lifecycle.audit } : {}),
		bridge: {
			beforeBridge: lifecycle.beforeBridge,
			bridgeEntered: lifecycle.bridgeEntered,
			backendResponseReceived: lifecycle.backendResponseReceived,
		},
		recovery: {
			required:
				outcome.status === "partial" ||
				mutationStatus === "unknown" ||
				mutationStatus === "partially_applied" ||
				actions.length > 0,
			actions,
		},
	};
}

function attachMutationResultEnvelope(
	params: AscetMutationParams,
	result: AscetEditResult,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): AscetEditResult {
	const mutationResult = createMutationResultEnvelope(params, result, ctx, lifecycle);
	return {
		...result,
		content: [{ type: "text", text: JSON.stringify(compactObject(mutationResult) ?? mutationResult, null, 2) }],
		details: { ...result.details, mutationResult },
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
		return { kind: "mutation", action: action.id as AscetMutationParams["action"] | "create_dependent_chain" };
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
	ctx: AscetEditRuntimeContext,
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
		if (invocation.action === "create_dependent_chain") {
			return runAscetCreateDependentChain(params as unknown as AscetCreateDependentChainParams, options, ctx);
		}
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
	ctx: AscetEditRuntimeContext,
): Promise<AscetEditResult> {
	const startedAt = Date.now();
	const lifecycle: AscetWriteLifecycleEvidence = {
		beforeBridge: false,
		bridgeEntered: false,
		backendResponseReceived: false,
	};
	try {
		const result = await runAscetMutationCore(params, options, ctx, lifecycle);
		const enriched = attachMutationResultEnvelope(params, result, ctx, lifecycle);
		recordMutationTelemetry(params, enriched, options, startedAt, lifecycle);
		return enriched;
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
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): Promise<AscetEditResult> {
	const normalizedParams = normalizeAscetMutationParams(params);
	const contractValidation = validateAscetMutationContract(normalizedParams);
	if (contractValidation) {
		return asResponse(contractValidation);
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
		return normalizedParams.intent === "preview"
			? runPlanManagedPlan(normalizedParams, options, lifecycle)
			: runPlanManagedSingleCall(normalizedParams, options, ctx, lifecycle);
	}
	if (params.intent === "preview") {
		return runDirectMutationPreview(normalizedParams, options, lifecycle);
	}

	return runCoordinatedDirectMutation(normalizedParams, options, ctx, lifecycle);
}

interface AscetWriteLifecycleEvidence {
	beforeBridge: boolean;
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
	permission?: AscetMutationResultEnvelope["permission"];
	preflight?: Record<string, unknown>;
	editability?: AscetMutationResultEnvelope["editability"];
	audit?: AscetMutationResultEnvelope["audit"];
}

function withWriteLifecycleTracking(
	options: RunAscetEditOperationOptions,
	lifecycle: AscetWriteLifecycleEvidence,
	onCoordinatorLifecycle: (event: AscetCliLifecycleEvent) => void,
): RunAscetEditOperationOptions {
	return {
		...options,
		onLifecycle: (event) => {
			onCoordinatorLifecycle(event);
			if (event.stage === "before_bridge") lifecycle.beforeBridge = true;
			if (event.stage === "bridge_entered") lifecycle.bridgeEntered = true;
			if (event.stage === "backend_response_received") lifecycle.backendResponseReceived = true;
			options.onLifecycle?.(event);
		},
	};
}

function resolveTelemetryPhase(params: AscetMutationParams): "plan" | "commit" | "execute" {
	if (params.action === "apply_element_spec" || params.action === "set_element_dependency") {
		return params.intent === "preview" ? "plan" : "commit";
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
		...(result.details.verification ? { verificationStatus: result.details.verification.status } : {}),
		mutationStatus,
		bridgeEntered: lifecycle.bridgeEntered,
		backendResponseReceived: lifecycle.backendResponseReceived,
		mutationStarted: mutationStatus === "applied" || mutationStatus === "rolled_back" || mutationStatus === "unknown",
		writesPerformed: mutationStatus === "applied" || mutationStatus === "rolled_back",
		cleanupRequired: mutationStatus === "unknown",
	});
}

type PlanManagedPlanParams =
	| AscetApplyElementPlanParams
	| (Extract<AscetMutationParams, { action: "set_element_dependency" }> & {
			targetPath: string;
			elementName: string;
			dependency: "dependent" | "independent";
	  });

interface BackendMutationPreflight {
	outcome: AscetToolOutcome;
	raw: AscetCliJsonResult;
	preparedParams?: AscetMutationParams;
	temporarySpecFile?: string;
}

const backendMutationPreflightRegistry = new AscetMutationPreflightRegistry<BackendMutationPreflight | undefined>(
	async () => undefined,
);

const BACKEND_PREFLIGHT_ACTIONS = [
	"create_folder",
	"create_component",
	"create_method",
	"set_method_signature",
	"delete_component",
	"delete_method",
	"delete_folder",
	"set_method_code",
	"set_module_code",
	"set_state_machine_code",
	"set_enumerators",
	"apply_element_spec",
	"apply_project_formula",
	"set_element_dependency",
] as const satisfies readonly AscetMutationParams["action"][];

for (const action of BACKEND_PREFLIGHT_ACTIONS) {
	backendMutationPreflightRegistry.register(action, async ({ params, options }) => {
		if (params.action !== action) {
			throw new Error(`ASCET preflight registry dispatched '${params.action}' to '${action}'.`);
		}
		return runRegisteredBackendMutationPreflight(params, options);
	});
}

function isPlanManagedPlan(params: AscetMutationParams): params is PlanManagedPlanParams {
	return params.action === "apply_element_spec" || params.action === "set_element_dependency";
}

function toPlanJson(value: unknown): AscetPlanJsonValue {
	return JSON.parse(JSON.stringify(value)) as AscetPlanJsonValue;
}

function createPlanStore(options: RunAscetEditOperationOptions): AscetPlanStore {
	return new AscetPlanStore({ artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined) });
}

function createMutationGuardStore(options: RunAscetEditOperationOptions): AscetMutationGuardStore {
	return new AscetMutationGuardStore({
		artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
	});
}

interface AscetTreeSafetyEvidence {
	complete: boolean;
	databaseIdentity?: AscetPlanDatabaseIdentity;
	entries: AscetTargetImpactEntry[];
}

async function readTreeSafetyEvidence(options: RunAscetEditOperationOptions): Promise<AscetTreeSafetyEvidence> {
	let evidence: AscetTreeSafetyEvidence = { complete: false, entries: [] };
	const treeOptions = { ...options, timeoutMs: Math.max(options.timeoutMs ?? 0, 300_000) };
	for (let attempt = 0; attempt < 2; attempt++) {
		const raw = await runAscetGet({ action: "tree", scope: "database", delivery: "stored" }, treeOptions);
		const payload = raw.ok ? unwrapToolSuccessPayload(raw.data) : undefined;
		const result = isRecord(payload) ? payload : undefined;
		const coverage = asRecord(result?.coverage);
		const databaseIdentity = result ? getAscetDatabaseIdentity(result) : undefined;
		const complete =
			raw.ok &&
			databaseIdentity !== undefined &&
			coverage?.status === "complete_for_scope" &&
			coverage.completeness === "complete" &&
			coverage.collectorCompleted === true &&
			result?.truncated !== true;
		const entries = Array.isArray(result?.items)
			? result.items.flatMap((entry) => {
					const item = asRecord(entry);
					const path = readString(item, "path");
					const oid = readString(item, "oid");
					const kind = readString(item, "kind");
					return path && oid && kind ? [{ path, oid, kind }] : [];
				})
			: [];
		evidence = { complete, databaseIdentity, entries };
		if (complete) break;
	}
	return evidence;
}

async function readPlanTargetImpact(
	targetIdentity: AscetPlanTargetIdentity,
	databaseIdentity: AscetPlanDatabaseIdentity,
	options: RunAscetEditOperationOptions,
): Promise<AscetTargetImpact> {
	const tree = await readTreeSafetyEvidence(options);
	const databaseMatches = tree.databaseIdentity?.fingerprint === databaseIdentity.fingerprint;
	const targetObserved = tree.entries.some((entry) => entry.oid === targetIdentity.oid);
	return resolveAscetTargetImpact({
		targetOid: targetIdentity.oid,
		requestedPath: targetIdentity.path,
		completeness: tree.complete && databaseMatches && targetObserved ? "complete" : "unknown",
		entries: tree.entries,
	});
}

function directMutationAnchorPath(params: AscetMutationParams): string | undefined {
	switch (params.action) {
		case "create_folder":
			return parentAscetPath(params.folderPath);
		case "create_component":
			return parentAscetPath(params.componentPath);
		case "create_method":
		case "set_method_signature":
		case "delete_component":
		case "delete_method":
		case "set_method_code":
		case "set_enumerators":
			return params.componentPath;
		case "delete_folder":
			return params.folderPath;
		case "set_module_code":
			return params.modulePath;
		case "set_state_machine_code":
			return params.stateMachinePath;
		case "apply_project_formula":
			return params.projectPath;
		case "apply_element_spec":
		case "set_element_dependency":
			return undefined;
	}
}

function parentAscetPath(path: string): string | undefined {
	const normalized = normalizeAscetPath(path);
	const separator = normalized.lastIndexOf("\\");
	return separator > 0 ? normalized.slice(0, separator) : undefined;
}

function findTreeTargetIdentity(
	params: AscetMutationParams,
	tree: AscetTreeSafetyEvidence,
): AscetPlanTargetIdentity | undefined {
	let targetPath = directMutationAnchorPath(params);
	const mayUseAncestor = params.action === "create_folder" || params.action === "create_component";
	while (targetPath) {
		const normalizedTarget = normalizeAscetPath(targetPath).toLocaleLowerCase();
		const entry = tree.entries.find(
			(candidate) => normalizeAscetPath(candidate.path).toLocaleLowerCase() === normalizedTarget,
		);
		if (entry) return { path: normalizeAscetPath(targetPath), oid: entry.oid, kind: entry.kind };
		if (!mayUseAncestor) return undefined;
		targetPath = parentAscetPath(targetPath);
	}
	if (mayUseAncestor && tree.complete && tree.databaseIdentity) {
		return {
			path: normalizeAscetPath(tree.databaseIdentity.path),
			oid: `database:${tree.databaseIdentity.fingerprint}`,
			kind: "database",
		};
	}
	return undefined;
}

function storedDirectMutationParams(params: AscetMutationParams): AscetPlanJsonValue {
	const stored = { ...params } as Record<string, unknown>;
	delete stored.intent;
	delete stored.verifyReadback;
	if (typeof stored.code === "string") {
		stored.codeFingerprint = fingerprintJson(stored.code);
		delete stored.code;
	}
	return toPlanJson(stored);
}

function createPlanContractFingerprint(params: AscetMutationParams): string {
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
	if (
		error instanceof AscetPlanStoreError ||
		error instanceof AscetMutationGuardStoreError ||
		error instanceof AscetMutationCoordinatorError
	) {
		return asResponse({ status: "error", error: { code: error.code, message: error.message } });
	}
	throw error;
}

function storedCommitParams(params: PlanManagedPlanParams): AscetPlanJsonValue {
	const stored = { ...params } as Record<string, unknown>;
	delete stored.phase;
	return toPlanJson(stored);
}

async function runPlanManagedPlan(
	params: PlanManagedPlanParams,
	options: RunAscetEditOperationOptions,
	lifecycle?: AscetWriteLifecycleEvidence,
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
		const targetImpact = await readPlanTargetImpact(targetIdentity, databaseIdentity, options);
		if (!targetImpact.writeAllowed) {
			return asResponse({
				status: "error",
				error: {
					code: targetImpact.blockingCode ?? "shared_object_impact_unknown",
					message: `Complete shared-object impact evidence is required before planning ${params.action}.`,
				},
			});
		}
		const guardCheck = createMutationGuardStore(options).assertClear(
			databaseIdentity.fingerprint,
			targetIdentity.oid,
		);
		if (!guardCheck.clear) {
			return asResponse({
				status: "blocked",
				code: "mutation_target_quarantined",
				message: `Target OID ${targetIdentity.oid} is quarantined and requires reconciliation.`,
			});
		}
		if (lifecycle) {
			lifecycle.preflight = {
				backendPreflight,
				databaseIdentity,
				targetIdentity,
				targetImpact: toPlanJson(targetImpact),
				guardGeneration: guardCheck.generation,
			};
		}
		return asResponse(
			{
				status: "preflight",
				plan: {
					...backend.outcome.plan,
					databaseIdentity,
					targetIdentity,
					targetImpact: toPlanJson(targetImpact),
					guardGeneration: guardCheck.generation,
				},
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

async function runPlanManagedSingleCall(
	params: PlanManagedPlanParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): Promise<AscetEditResult> {
	return runPlanManagedCommit(params, options, ctx, lifecycle);
}

interface PlanManagedCommitEvidence {
	backend: BackendMutationPreflight;
	backendPreflight: AscetPlanJsonValue;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetTargetImpact;
	guardGeneration: number;
	prepared: AscetMutationParams;
	editable: boolean | "not_applicable";
	editableTargets: string[];
	editability: Array<{ path: string; editable: boolean }>;
	preflight: AscetMutationPreflightEvidence;
}

type PlanManagedCommitEvidenceResult =
	| { status: "ready"; evidence: PlanManagedCommitEvidence }
	| { status: "result"; result: AscetEditResult };

async function collectPlanManagedCommitEvidence(
	planned: PlanManagedPlanParams,
	options: RunAscetEditOperationOptions,
): Promise<PlanManagedCommitEvidenceResult> {
	const databaseIdentity = await readCurrentPlanDatabaseIdentity(options);
	const backend = await runBackendMutationPreflight(planned, options);
	if (!backend || backend.outcome.status !== "preflight") {
		return {
			status: "result",
			result: backend
				? asResponse(backend.outcome, backend.raw)
				: asResponse({
						status: "error",
						error: { code: "plan_preflight_unavailable", message: "Commit preflight unavailable." },
					}),
		};
	}
	const backendPreflight = toPlanJson(backend.outcome.plan.backendPreflight ?? {});
	const targetIdentity = getPlanTargetIdentity(planned, backendPreflight);
	const targetImpact = await readPlanTargetImpact(targetIdentity, databaseIdentity, options);
	if (!targetImpact.writeAllowed) {
		return {
			status: "result",
			result: asResponse({
				status: "error",
				error: {
					code: targetImpact.blockingCode ?? "shared_object_impact_unknown",
					message: `Complete shared-object impact evidence is required before committing ${planned.action}.`,
				},
			}),
		};
	}
	const guardCheck = createMutationGuardStore(options).assertClear(databaseIdentity.fingerprint, targetIdentity.oid);
	if (!guardCheck.clear) {
		return {
			status: "result",
			result: asResponse({
				status: "blocked",
				code: "mutation_target_quarantined",
				message: `Target OID ${targetIdentity.oid} is quarantined and requires reconciliation.`,
			}),
		};
	}
	const descriptor = getAscetEditAction(planned.action)?.permission;
	if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${planned.action}.`);
	let editable: boolean | "not_applicable" = "not_applicable";
	const editableTargets = descriptor.requiresEditableTarget
		? planManagedEditableTargets(planned, backendPreflight)
		: [];
	const editability: Array<{ path: string; editable: boolean }> = [];
	if (descriptor.requiresEditableTarget) {
		if (editableTargets.length === 0) {
			return {
				status: "result",
				result: asResponse({
					status: "error",
					error: {
						code: "ascet_edit_editability_targets_missing",
						message: `No complete editable-target set was available for ${planned.action}.`,
					},
				}),
			};
		}
		for (const path of editableTargets) {
			const check = await runAscetEditability({ mode: "check", componentPath: path }, options);
			if (!check.ok || typeof check.data !== "boolean") {
				return { status: "result", result: asResponse(outcomeFromCliResult(check), check) };
			}
			editability.push({ path, editable: check.data });
		}
		editable = editability.every((entry) => entry.editable);
	}
	const prepared = backend.preparedParams ?? planned;
	const backendRecord = isRecord(backendPreflight) ? backendPreflight : undefined;
	const backendResult = asRecord(backendRecord?.result);
	const summary =
		planned.action === "apply_element_spec"
			? createApplyElementSpecSummary(requirePreparedApplyElementParams(prepared))
			: createSetElementDependencySummary({ ...planned, targetPath: planned.targetPath! });
	const effects: AscetPlannedEffect[] = [
		...editability
			.filter((entry) => !entry.editable)
			.map((entry) => ({
				kind: "request_editability",
				target: entry.path,
				description: `Request component editability for ${entry.path}`,
			})),
		{
			kind: planned.action,
			target: targetIdentity.path,
			description: summary,
		},
	];
	const preflight = createAscetMutationPreflightEvidence({
		action: planned.action,
		params: storedCommitParams(planned),
		database: { path: databaseIdentity.path, fingerprint: databaseIdentity.fingerprint },
		target: targetIdentity,
		impact: {
			complete: targetImpact.completeness === "complete",
			sharedObject: targetImpact.sharedObject,
			ownerPath: targetImpact.ownerPath,
			affectedProjects: [...targetImpact.affectedProjects],
			fingerprint: targetImpact.fingerprint,
		},
		capability: {
			status: "supported",
			operation: readString(backendRecord, "operation") ?? planned.action,
			evidence: backendResult ?? { source: "authoritative_backend_preflight" },
		},
		editability: {
			applicable: descriptor.requiresEditableTarget,
			status: !descriptor.requiresEditableTarget ? "not_applicable" : editable ? "editable" : "read_only",
			canRequestEditable: descriptor.requiresEditableTarget && editable === false,
		},
		effects,
		verification: {
			available: descriptor.requiresReadback,
			operation: `${planned.action}_readback`,
			target: { path: targetIdentity.path },
		},
		riskModifiers:
			planned.action === "set_element_dependency" && planned.variants
				? [`variant_count:${planned.variants.length}`]
				: [],
		noOp: backendResult?.noOp === true,
	});
	return {
		status: "ready",
		evidence: {
			backend,
			backendPreflight,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration: guardCheck.generation,
			prepared,
			editable,
			editableTargets,
			editability,
			preflight,
		},
	};
}

async function runPlanManagedCommit(
	planned: PlanManagedPlanParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): Promise<AscetEditResult> {
	const temporarySpecFiles = new Set<string>();
	try {
		const contractError = validateAscetMutationContract(planned);
		const parameterError = validateAscetMutationParams(planned);
		const localError = validateLocalMutationInputs(planned, options);
		if (contractError || parameterError || localError) {
			return asResponse(contractError ?? parameterError ?? localError!);
		}
		const contractFingerprint = createPlanContractFingerprint(planned);
		const binding = createAscetPlanBinding(options);
		const collectedByFingerprint = new Map<string, PlanManagedCommitEvidence>();
		let latestCollected: PlanManagedCommitEvidence | undefined;
		let preflightFailure: AscetEditResult | undefined;
		let executionRaw: AscetCliJsonResult | undefined;
		const permission = resolveAscetPermissionSnapshot(ctx);
		const guarded = await runGuardedAscetMutation({
			action: planned.action,
			intent: "apply",
			permissionMode: permission.mode,
			rules: permission.rules,
			signal: options.signal,
			ctx,
			maxMaterialChanges: 1,
			preflight: async () => {
				const collected = await collectPlanManagedCommitEvidence(planned, options);
				if (collected.status === "result") {
					preflightFailure = collected.result;
					const failure = outcomeError(collected.result.details.outcome) ?? {
						code: "ascet_edit_preflight_failed",
						message: "Authoritative ASCET preflight failed.",
					};
					return {
						status: "failed" as const,
						code: failure.code,
						message: failure.message,
						mutationStatus: "not_started" as const,
						raw: collected.result,
					};
				}
				latestCollected = collected.evidence;
				if (collected.evidence.backend.temporarySpecFile) {
					temporarySpecFiles.add(collected.evidence.backend.temporarySpecFile);
				}
				collectedByFingerprint.set(collected.evidence.preflight.approvalMaterialFingerprint, collected.evidence);
				return {
					status: "passed" as const,
					evidence: collected.evidence.preflight,
					raw: collected.evidence.backend.raw,
				};
			},
			execute: async (preflight, executionContext) => {
				const evidence = collectedByFingerprint.get(preflight.approvalMaterialFingerprint) ?? latestCollected;
				if (!evidence) throw new Error("Revalidated plan-managed ASCET evidence was not retained for execution.");
				const executionBackendPreflight = toPlanJson({
					operation: "authoritative_single_call_preflight",
					validated: true,
					authoritativePlan: evidence.backendPreflight,
					normalizedEvidence: evidence.preflight,
					permissionMode: executionContext.decision.mode,
					permissionDecision: executionContext.decision.behavior,
					risk: executionContext.decision.risk,
					matchedRule: executionContext.decision.rule,
					approvalMaterialFingerprint: evidence.preflight.approvalMaterialFingerprint,
					approvedAt: executionContext.approvedAt,
					revalidatedAt: executionContext.revalidatedAt,
					targetIdentity: evidence.targetIdentity,
					targetImpactFingerprint: evidence.targetImpact.fingerprint,
					editabilityInitiallyEditable: evidence.editable,
				});
				const store = createPlanStore(options);
				const record = store.create({
					operation: planned.action,
					params: storedCommitParams(planned),
					binding,
					databaseIdentity: evidence.databaseIdentity,
					targetIdentity: evidence.targetIdentity,
					targetImpact: toPlanJson(evidence.targetImpact),
					guardGeneration: evidence.guardGeneration,
					backendPreflight: executionBackendPreflight,
					contractFingerprint,
				});
				const verificationInput: VerifyAscetPlanInput = {
					planId: record.planId,
					operation: planned.action,
					params: record.params,
					binding,
					databaseIdentity: record.databaseIdentity,
					targetIdentity: record.targetIdentity,
					targetImpact: record.targetImpact,
					guardGeneration: record.guardGeneration,
					backendPreflight: record.backendPreflight,
					contractFingerprint: record.contractFingerprint,
				};
				const authorizedRecord = store.startExecutionAuthorization(verificationInput);
				const coordinator = new AscetMutationCoordinator({
					artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
				});
				const raw = await coordinator.execute({
					action: planned.action,
					planId: authorizedRecord.planId,
					planFingerprint: authorizedRecord.planFingerprint,
					databaseFingerprint: authorizedRecord.databaseIdentity.fingerprint,
					targetOid: authorizedRecord.targetIdentity.oid,
					targetKind: authorizedRecord.targetIdentity.kind,
					canonicalPath: authorizedRecord.targetIdentity.path,
					targetImpactFingerprint: evidence.targetImpact.fingerprint,
					guardGeneration: authorizedRecord.guardGeneration,
					sessionId: authorizedRecord.binding.sessionId,
					approvalTtlMs: Math.max(1, Date.parse(authorizedRecord.expiresAt) - Date.now()),
					journal: {
						beforeSnapshot: authorizedRecord.backendPreflight,
						attemptedMutation: authorizedRecord.params,
					},
					beginExecution: () => {
						store.beginExecution(verificationInput);
					},
					completeExecution: () => {
						store.consume(verificationInput);
					},
					dispatch: async (onLifecycle) => {
						const writeOptions = withWriteLifecycleTracking(options, lifecycle, onLifecycle);
						const executable = prepareExecutableMutation(evidence.prepared);
						if (preflight.editability.status === "read_only") {
							return runGuardedMutationBackend(executable, evidence.editableTargets, writeOptions);
						}
						return planned.action === "apply_element_spec"
							? runAscetApplyElementSpec(
									{
										...requirePreparedApplyElementParams(executable),
										intent: "apply",
										verifyReadback: true,
									},
									writeOptions,
								)
							: runAscetSetElementDependency(
									{
										...planned,
										targetPath: planned.targetPath!,
										dryRun: false,
										intent: "apply",
										verifyReadback: true,
									},
									writeOptions,
								);
					},
				});
				executionRaw = raw;
				const classification = classifyAscetEditExecution(raw);
				return {
					mutationStatus: classification.mutationStatus,
					verificationStatus: classification.verification.status,
					editabilityStatus: guardedEditability(raw),
					...(raw.error ? { error: { code: raw.error.code, message: raw.error.message } } : {}),
					raw,
				};
			},
		});

		lifecycle.permission = guarded.permission;
		lifecycle.preflight = guarded.preflight.evidence ? { ...guarded.preflight.evidence } : undefined;
		lifecycle.editability = guarded.editability;
		lifecycle.audit = guarded.audit;
		if (executionRaw) return finalizeAscetMutation({ params: planned, raw: executionRaw, options });
		if (preflightFailure) return preflightFailure;
		if (guarded.mutation.status === "no_op" && latestCollected) {
			const raw: AscetCliJsonResult = {
				...latestCollected.backend.raw,
				ok: true,
				data: {
					mutationStatus: "no_op",
					verificationStatus: "passed",
					preflight: latestCollected.preflight,
				},
				error: undefined,
			};
			return asResponse(
				{
					status: "ok",
					data: {
						preflight: latestCollected.preflight,
						mutation: { status: "no_op" },
						verification: { status: "passed" },
					},
					warnings: [],
					verified: true,
				},
				raw,
			);
		}
		const error = guarded.error ?? {
			code: "ascet_edit_guarded_mutation_failed",
			message: "Guarded ASCET mutation ended without an execution result.",
		};
		return guarded.status === "blocked"
			? asResponse({ status: "blocked", code: error.code, message: error.message })
			: asResponse({ status: "error", error });
	} catch (error) {
		return planStoreFailure(error);
	} finally {
		for (const temporarySpecFile of temporarySpecFiles) {
			removeTemporaryElementSpec(temporarySpecFile);
		}
	}
}

async function runDirectMutationPreview(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	lifecycle: AscetWriteLifecycleEvidence,
): Promise<AscetEditResult> {
	try {
		const authoritative = await runBackendMutationPreflight(params, options);
		if (!authoritative) {
			return asResponse({
				status: "blocked",
				code: "ascet_edit_action_not_migrated",
				message: `ASCET action '${params.action}' has no authoritative preview implementation.`,
			});
		}
		if (authoritative.outcome.status !== "preflight") {
			return asResponse(authoritative.outcome, authoritative.raw);
		}
		const authoritativePlan = toPlanJson(authoritative.outcome.plan.backendPreflight ?? {});
		const authoritativeResult =
			isRecord(authoritativePlan) && isRecord(authoritativePlan.result) ? authoritativePlan.result : undefined;
		const databaseIdentity = await readCurrentPlanDatabaseIdentity(options);
		const tree = await readTreeSafetyEvidence(options);
		if (!tree.complete || tree.databaseIdentity?.fingerprint !== databaseIdentity.fingerprint) {
			return asResponse({
				status: "error",
				error: {
					code: "shared_object_impact_unknown",
					message: `Complete current-database Tree evidence is required before previewing ${params.action}.`,
				},
			});
		}
		const targetIdentity = findTreeTargetIdentity(params, tree);
		if (!targetIdentity) {
			return asResponse({
				status: "error",
				error: {
					code: "plan_target_identity_missing",
					message: `The mutation anchor for ${params.action} was not found in the complete database Tree.`,
				},
			});
		}
		const targetImpact = resolveAscetTargetImpact({
			targetOid: targetIdentity.oid,
			requestedPath: targetIdentity.path,
			completeness: "complete",
			entries: tree.entries,
		});
		const guardCheck = createMutationGuardStore(options).assertClear(
			databaseIdentity.fingerprint,
			targetIdentity.oid,
		);
		if (!guardCheck.clear) {
			return asResponse({
				status: "blocked",
				code: "mutation_target_quarantined",
				message: `Target OID ${targetIdentity.oid} is quarantined and requires reconciliation.`,
			});
		}
		const descriptor = getAscetEditAction(params.action)?.permission;
		if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${params.action}.`);
		const editability = descriptor.requiresEditableTarget
			? authoritativeResult?.editable === true
				? "editable"
				: authoritativeResult?.editable === false
					? "read_only"
					: "unknown"
			: "not_applicable";
		if (editability === "unknown") {
			return asResponse({
				status: "error",
				error: {
					code: "editable_state_unknown",
					message: `Authoritative editability evidence is unavailable for ${params.action}.`,
				},
			});
		}
		const evidence = {
			action: params.action,
			params,
			backendPreflight: authoritativePlan,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			editability,
			guardGeneration: guardCheck.generation,
			readbackAvailable: descriptor.requiresReadback,
		};
		lifecycle.preflight = evidence;
		lifecycle.editability =
			editability === "editable"
				? { status: "editable", initiallyEditable: true, acquiredByThisOperation: false }
				: editability === "read_only"
					? { status: "blocked", initiallyEditable: false, acquiredByThisOperation: false }
					: { status: "not_applicable" };
		return asResponse(
			createPreflightOutcome({
				...evidence,
				preflightFingerprint: fingerprintJson(evidence),
			}),
			authoritative.raw,
		);
	} catch (error) {
		return planStoreFailure(error);
	}
}

interface CollectedDirectMutationEvidence {
	raw: AscetCliJsonResult;
	authoritativePlan: AscetPlanJsonValue;
	authoritativeResult: Record<string, unknown> | undefined;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetTargetImpact;
	guardGeneration: number;
	preflight: AscetMutationPreflightEvidence;
}

type DirectMutationEvidenceCollection =
	| { status: "evidence"; evidence: CollectedDirectMutationEvidence }
	| { status: "result"; result: AscetEditResult };

function directPreflightEffects(
	params: AscetMutationParams,
	authoritativeResult: Record<string, unknown> | undefined,
	targetIdentity: AscetPlanTargetIdentity,
): AscetPlannedEffect[] {
	const effects: AscetPlannedEffect[] = [];
	if (authoritativeResult?.editable === false) {
		effects.push({
			kind: "request_editability",
			target: directMutationAnchorPath(params) ?? targetIdentity.path,
			description: `Request component editability for ${directMutationAnchorPath(params) ?? targetIdentity.path}`,
		});
	}
	if (Array.isArray(authoritativeResult?.plannedEffects)) {
		for (const value of authoritativeResult.plannedEffects) {
			const effect = asRecord(value);
			if (!effect) continue;
			const kind = readString(effect, "kind") ?? "mutation";
			const target = readString(effect, "target") ?? directMutationAnchorPath(params) ?? targetIdentity.path;
			effects.push({
				kind,
				target,
				description: readString(effect, "description") ?? `${kind}: ${target}`,
			});
		}
	} else if (Array.isArray(authoritativeResult?.willCreate)) {
		for (const value of authoritativeResult.willCreate) {
			const target = String(value);
			effects.push({ kind: "create_folder", target, description: `Create folder ${target}` });
		}
	}
	if (effects.every((effect) => effect.kind === "request_editability")) {
		const target = directMutationAnchorPath(params) ?? targetIdentity.path;
		effects.push({ kind: params.action, target, description: `${params.action}: ${target}` });
	}
	return effects;
}

function directPreflightCapability(
	params: AscetMutationParams,
	authoritativePlan: AscetPlanJsonValue,
	authoritativeResult: Record<string, unknown> | undefined,
): AscetMutationPreflightEvidence["capability"] {
	const plan = isRecord(authoritativePlan) ? authoritativePlan : undefined;
	const capability = asRecord(authoritativeResult?.capability);
	const rawStatus = readString(capability, "status");
	const status = rawStatus === "unsupported" || rawStatus === "unknown" ? rawStatus : "supported";
	return {
		status,
		operation:
			readString(authoritativeResult, "requiredMethod") ??
			readString(capability, "operation") ??
			readString(plan, "operation") ??
			params.action,
		evidence: capability ?? { source: readString(plan, "operation") ?? "registered_preflight" },
	};
}

async function collectDirectMutationEvidence(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	guardStore: AscetMutationGuardStore,
): Promise<DirectMutationEvidenceCollection> {
	const authoritative = await runBackendMutationPreflight(params, options);
	if (!authoritative) {
		return {
			status: "result",
			result: asResponse({
				status: "blocked",
				code: "ascet_edit_action_not_migrated",
				message: `ASCET action '${params.action}' has not been migrated to authoritative single-call guarded execution.`,
			}),
		};
	}
	if (authoritative.outcome.status !== "preflight") {
		return { status: "result", result: asResponse(authoritative.outcome, authoritative.raw) };
	}
	const authoritativePlan = toPlanJson(authoritative.outcome.plan.backendPreflight ?? {});
	const authoritativeResult =
		isRecord(authoritativePlan) && isRecord(authoritativePlan.result) ? authoritativePlan.result : undefined;
	const databaseIdentity = await readCurrentPlanDatabaseIdentity(options);
	const tree = await readTreeSafetyEvidence(options);
	if (!tree.complete || tree.databaseIdentity?.fingerprint !== databaseIdentity.fingerprint) {
		return {
			status: "result",
			result: asResponse({
				status: "error",
				error: {
					code: "shared_object_impact_unknown",
					message: `Complete current-database Tree evidence is required before executing ${params.action}.`,
				},
			}),
		};
	}
	const targetIdentity = findTreeTargetIdentity(params, tree);
	if (!targetIdentity) {
		return {
			status: "result",
			result: asResponse({
				status: "error",
				error: {
					code: "plan_target_identity_missing",
					message: `The mutation anchor for ${params.action} was not found in the complete database Tree.`,
				},
			}),
		};
	}
	const targetImpact = resolveAscetTargetImpact({
		targetOid: targetIdentity.oid,
		requestedPath: targetIdentity.path,
		completeness: "complete",
		entries: tree.entries,
	});
	const guardCheck = guardStore.assertClear(databaseIdentity.fingerprint, targetIdentity.oid);
	if (!guardCheck.clear) {
		return {
			status: "result",
			result: asResponse({
				status: "blocked",
				code: "mutation_target_quarantined",
				message: `Target OID ${targetIdentity.oid} is quarantined and requires reconciliation.`,
			}),
		};
	}
	const descriptor = getAscetEditAction(params.action)?.permission;
	if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${params.action}.`);
	const editabilityStatus = !descriptor.requiresEditableTarget
		? "not_applicable"
		: authoritativeResult?.editable === true
			? "editable"
			: authoritativeResult?.editable === false
				? "read_only"
				: "unknown";
	const preflight = createAscetMutationPreflightEvidence({
		action: params.action,
		params: storedDirectMutationParams(params),
		database: { path: databaseIdentity.path, fingerprint: databaseIdentity.fingerprint },
		target: targetIdentity,
		impact: {
			complete: targetImpact.completeness === "complete",
			sharedObject: targetImpact.sharedObject,
			ownerPath: targetImpact.ownerPath,
			affectedProjects: [...targetImpact.affectedProjects],
			fingerprint: targetImpact.fingerprint,
		},
		capability: directPreflightCapability(params, authoritativePlan, authoritativeResult),
		editability: {
			applicable: descriptor.requiresEditableTarget,
			status: editabilityStatus,
			canRequestEditable: descriptor.requiresEditableTarget && authoritativeResult?.editable === false,
		},
		effects: directPreflightEffects(params, authoritativeResult, targetIdentity),
		verification: {
			available: !descriptor.requiresReadback || authoritativeResult?.readbackAvailable !== false,
			operation: `${params.action}_readback`,
			target: { path: directMutationAnchorPath(params) ?? targetIdentity.path },
		},
		riskModifiers:
			params.action === "create_method" && authoritativeResult?.diagramExists === false
				? ["minimum_risk:medium", "missing_diagram_creation"]
				: [],
		noOp: authoritativeResult?.noOp === true,
	});
	return {
		status: "evidence",
		evidence: {
			raw: authoritative.raw,
			authoritativePlan,
			authoritativeResult,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration: guardCheck.generation,
			preflight,
		},
	};
}
async function runCoordinatedDirectMutation(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): Promise<AscetEditResult> {
	try {
		const guardStore = createMutationGuardStore(options);
		const collectedByFingerprint = new Map<string, CollectedDirectMutationEvidence>();
		let latestCollected: CollectedDirectMutationEvidence | undefined;
		let preflightFailure: AscetEditResult | undefined;
		let executionRaw: AscetCliJsonResult | undefined;
		const permission = resolveAscetPermissionSnapshot(ctx);
		const guarded = await runGuardedAscetMutation({
			action: params.action,
			intent: "apply",
			permissionMode: permission.mode,
			rules: permission.rules,
			signal: options.signal,
			ctx,
			maxMaterialChanges: 1,
			preflight: async () => {
				const collected = await collectDirectMutationEvidence(params, options, guardStore);
				if (collected.status === "result") {
					preflightFailure = collected.result;
					const failure = outcomeError(collected.result.details.outcome) ?? {
						code: "ascet_edit_preflight_failed",
						message: "Authoritative ASCET preflight failed.",
					};
					return {
						status: "failed" as const,
						code: failure.code,
						message: failure.message,
						mutationStatus: "not_started" as const,
						raw: collected.result,
					};
				}
				latestCollected = collected.evidence;
				collectedByFingerprint.set(collected.evidence.preflight.approvalMaterialFingerprint, collected.evidence);
				return {
					status: "passed" as const,
					evidence: collected.evidence.preflight,
					raw: collected.evidence.raw,
				};
			},
			execute: async (evidence, executionContext) => {
				const current = collectedByFingerprint.get(evidence.approvalMaterialFingerprint) ?? latestCollected;
				if (!current) throw new Error("Revalidated ASCET evidence was not retained for execution.");
				const storedParams = storedDirectMutationParams(params);
				const backendPreflight = toPlanJson({
					operation: "authoritative_single_call_preflight",
					validated: true,
					authoritativePlan: current.authoritativePlan,
					normalizedEvidence: current.preflight,
					permissionMode: executionContext.decision.mode,
					permissionDecision: executionContext.decision.behavior,
					risk: executionContext.decision.risk,
					matchedRule: executionContext.decision.rule,
					approvedAt: executionContext.approvedAt,
					revalidatedAt: executionContext.revalidatedAt,
					targetIdentity: current.targetIdentity,
					targetImpactFingerprint: current.targetImpact.fingerprint,
				});
				const binding = createAscetPlanBinding(options);
				const store = createPlanStore(options);
				const record = store.create({
					operation: params.action,
					params: storedParams,
					binding,
					databaseIdentity: current.databaseIdentity,
					targetIdentity: current.targetIdentity,
					targetImpact: toPlanJson(current.targetImpact),
					guardGeneration: current.guardGeneration,
					backendPreflight,
					contractFingerprint: createPlanContractFingerprint(params),
				});
				const verificationInput = {
					planId: record.planId,
					operation: params.action,
					params: storedParams,
					binding,
					databaseIdentity: current.databaseIdentity,
					targetIdentity: current.targetIdentity,
					targetImpact: toPlanJson(current.targetImpact),
					guardGeneration: current.guardGeneration,
					backendPreflight,
					contractFingerprint: record.contractFingerprint,
				};
				const coordinator = new AscetMutationCoordinator({
					artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
				});
				const raw = await coordinator.execute({
					action: params.action,
					planId: record.planId,
					planFingerprint: record.planFingerprint,
					databaseFingerprint: current.databaseIdentity.fingerprint,
					targetOid: current.targetIdentity.oid,
					targetKind: current.targetIdentity.kind,
					canonicalPath: current.targetImpact.ownerPath,
					targetImpactFingerprint: current.targetImpact.fingerprint,
					guardGeneration: current.guardGeneration,
					sessionId: binding.sessionId,
					approvalTtlMs: Math.max(1, Date.parse(record.expiresAt) - Date.now()),
					journal: { beforeSnapshot: record.backendPreflight, attemptedMutation: record.params },
					beginExecution: () => {
						store.beginExecution(verificationInput);
					},
					completeExecution: () => {
						store.consume(verificationInput);
					},
					dispatch: (onLifecycle) => {
						const writeOptions = withWriteLifecycleTracking(options, lifecycle, onLifecycle);
						const executable = prepareExecutableMutation(params);
						if (params.action === "create_method") {
							return runGuardedCreateMethodMutation(
								params,
								evidence.editability.status === "read_only",
								writeOptions,
							);
						}
						if (evidence.editability.status === "read_only") {
							return runGuardedMutationBackend(executable, directMutationEditableTargets(params), writeOptions);
						}
						return dispatchMutation(executable, writeOptions);
					},
				});
				executionRaw = raw;
				const classification = classifyAscetEditExecution(raw);
				return {
					mutationStatus: classification.mutationStatus,
					verificationStatus: classification.verification.status,
					editabilityStatus: guardedEditability(raw),
					...(raw.error ? { error: { code: raw.error.code, message: raw.error.message } } : {}),
					raw,
				};
			},
		});

		lifecycle.permission = guarded.permission;
		lifecycle.preflight = guarded.preflight.evidence ? { ...guarded.preflight.evidence } : undefined;
		lifecycle.editability = guarded.editability;
		lifecycle.audit = guarded.audit;
		if (executionRaw) return finalizeAscetMutation({ params, raw: executionRaw, options });
		if (preflightFailure) return preflightFailure;
		if (guarded.mutation.status === "no_op" && latestCollected) {
			const raw: AscetCliJsonResult = {
				...latestCollected.raw,
				ok: true,
				data: {
					mutationStatus: "no_op",
					verificationStatus: "passed",
					preflight: latestCollected.preflight,
				},
				error: undefined,
			};
			return asResponse(
				{
					status: "ok",
					data: {
						preflight: latestCollected.preflight,
						mutation: { status: "no_op" },
						verification: { status: "passed" },
					},
					warnings: [],
					verified: true,
				},
				raw,
			);
		}
		const error = guarded.error ?? {
			code: "ascet_edit_guarded_mutation_failed",
			message: "Guarded ASCET mutation ended without an execution result.",
		};
		return guarded.status === "blocked"
			? asResponse({ status: "blocked", code: error.code, message: error.message })
			: asResponse({ status: "error", error });
	} catch (error) {
		return planStoreFailure(error);
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
	return {
		componentPath: params.componentPath,
		specFile: params.specFile,
		projectPath: params.projectPath,
		mode: params.elementIntent === "restore" ? "restore" : undefined,
		intent: params.intent,
		elementIntent: params.elementIntent,
		elements: params.elements,
		deleteMissing: params.deleteMissing,
		recreateIncompatible: params.recreateIncompatible,
	};
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

const AUTHORITATIVE_DATA_CONFIGURATION_SOURCES = new Set(["defaultDataConfiguration", "classDataConfiguration"]);
const AUTHORITATIVE_IMPLEMENTATION_CONFIGURATION_SOURCES = new Set([
	"defaultImplementationConfiguration",
	"classImplementationConfiguration",
]);

function isAuthoritativeConfiguration(
	value: Record<string, unknown> | "unresolved" | "not_applicable",
	allowedSources: ReadonlySet<string>,
): value is Record<string, unknown> {
	return (
		isRecord(value) &&
		value.selected === true &&
		typeof value.source === "string" &&
		allowedSources.has(value.source) &&
		typeof value.configurationName === "string" &&
		value.configurationName.trim().length > 0
	);
}

interface ElementPreflightCapability {
	name: string;
	operation: "create" | "patch";
	dataConfiguration: Record<string, unknown> | "unresolved" | "not_applicable";
	implementationConfiguration: Record<string, unknown> | "unresolved" | "not_applicable";
	dataItemResolvable: boolean;
	implementationItemResolvable: boolean;
	capabilityStatus: "validated" | "blocked";
	blockingCodes: string[];
}

interface ElementPreflightCapabilityResult {
	validated: boolean;
	elements: ElementPreflightCapability[];
}

function evaluateElementPreflightCapabilities(
	normalized: NormalizedElementSpecResult,
	liveElements: readonly Record<string, unknown>[],
	componentConfigurationProvenance: Record<string, unknown> | undefined,
): ElementPreflightCapabilityResult {
	const liveByName = new Map<string, Record<string, unknown>>();
	for (const element of liveElements) {
		if (typeof element.name === "string") liveByName.set(element.name, element);
	}
	const operationByName = new Map(normalized.resolvedOperations.map((entry) => [entry.name, entry.operation]));
	const elements = normalized.spec.elements.map((element): ElementPreflightCapability => {
		const name = typeof element.name === "string" ? element.name : "";
		const operation = operationByName.get(name) ?? "create";
		const isComponentReference = element.kind === "component";
		const live = liveByName.get(name);
		const provenance = isRecord(live?.configurationProvenance) ? live.configurationProvenance : undefined;
		const exported = element.scope === "exported";
		const createDataConfiguration = exported
			? (asRecord(componentConfigurationProvenance?.classDataConfiguration) ??
				asRecord(componentConfigurationProvenance?.defaultDataConfiguration))
			: asRecord(componentConfigurationProvenance?.defaultDataConfiguration);
		const createImplementationConfiguration = exported
			? (asRecord(componentConfigurationProvenance?.classImplementationConfiguration) ??
				asRecord(componentConfigurationProvenance?.defaultImplementationConfiguration))
			: asRecord(componentConfigurationProvenance?.defaultImplementationConfiguration);
		const dataConfiguration = isComponentReference
			? "not_applicable"
			: operation === "create"
				? (createDataConfiguration ?? "unresolved")
				: isRecord(provenance?.dataConfiguration)
					? provenance.dataConfiguration
					: "unresolved";
		const implementationConfiguration = isComponentReference
			? "not_applicable"
			: operation === "create"
				? (createImplementationConfiguration ?? "unresolved")
				: isRecord(provenance?.implementationConfiguration)
					? provenance.implementationConfiguration
					: "unresolved";
		const blockingCodes: string[] = [];
		if (!isComponentReference) {
			if (!isAuthoritativeConfiguration(dataConfiguration, AUTHORITATIVE_DATA_CONFIGURATION_SOURCES)) {
				blockingCodes.push("data_item_not_resolvable_preflight");
			}
			if (
				!isAuthoritativeConfiguration(
					implementationConfiguration,
					AUTHORITATIVE_IMPLEMENTATION_CONFIGURATION_SOURCES,
				)
			) {
				blockingCodes.push("implementation_item_not_resolvable_preflight");
			}
		}
		return {
			name,
			operation,
			dataConfiguration,
			implementationConfiguration,
			dataItemResolvable: isComponentReference || !blockingCodes.includes("data_item_not_resolvable_preflight"),
			implementationItemResolvable:
				isComponentReference || !blockingCodes.includes("implementation_item_not_resolvable_preflight"),
			capabilityStatus: blockingCodes.length === 0 ? "validated" : "blocked",
			blockingCodes,
		};
	});
	return { validated: elements.every((element) => element.capabilityStatus === "validated"), elements };
}

function createElementPreflightFailure(capabilities: ElementPreflightCapabilityResult): AscetToolOutcome | undefined {
	const blocked = capabilities.elements.filter((element) => element.capabilityStatus === "blocked");
	if (blocked.length === 0) return undefined;
	const firstCode = blocked[0]?.blockingCodes[0] ?? "element_preflight_unresolved";
	const summary = blocked.map((element) => `${element.name} (${element.blockingCodes.join(", ")})`).join("; ");
	return {
		status: "error",
		error: {
			code: firstCode,
			message: `Element preflight could not prove Data/Implementation item resolution for: ${summary}.`,
		},
	};
}

async function runBackendMutationPreflight(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
): Promise<BackendMutationPreflight | undefined> {
	return backendMutationPreflightRegistry.run({ params, options });
}

async function runRegisteredBackendMutationPreflight(
	params: AscetMutationParams,
	options: RunAscetEditOperationOptions,
): Promise<BackendMutationPreflight | undefined> {
	if (params.action === "create_folder") {
		const raw = await runAscetCliJson(
			["exec", "preflight_create_folder", normalizeAscetPath(params.folderPath), "--json"],
			{
				...options,
				toolName: "ascet_edit",
				commandId: "preflight_create_folder",
				jobKind: "read",
			},
		);
		if (!raw.ok) return { outcome: outcomeFromCliResult(raw), raw };
		const result = unwrapToolSuccessPayload(raw.data);
		if (!isRecord(result)) {
			return {
				outcome: {
					status: "error",
					error: {
						code: "create_folder_preflight_invalid",
						message: "preflight_create_folder returned an invalid result envelope.",
					},
				},
				raw,
			};
		}
		const conflicts = Array.isArray(result.conflicts) ? result.conflicts : [];
		const capability = isRecord(result.capability) ? result.capability : undefined;
		if (conflicts.length > 0) {
			const first = isRecord(conflicts[0]) ? conflicts[0] : undefined;
			return {
				outcome: {
					status: "error",
					error: {
						code: "create_folder_path_conflict",
						message: `Folder path conflicts at '${String(first?.path ?? params.folderPath)}' with observed kind '${String(first?.observedKind ?? "unknown")}'.`,
					},
				},
				raw,
			};
		}
		if (capability?.status !== "supported") {
			return {
				outcome: {
					status: "error",
					error: {
						code: "create_folder_capability_not_supported",
						message: "One or more create-folder path segments lack AddFolder, Save, or readback capability.",
					},
				},
				raw,
			};
		}
		return {
			outcome: createPreflightOutcome({
				action: params.action,
				params,
				backendPreflight: {
					operation: "preflight_create_folder",
					validated: true,
					result,
				},
			}),
			raw,
		};
	}
	if (params.action === "create_method") {
		const args = [
			"exec",
			"preflight_create_method",
			normalizeAscetPath(params.componentPath),
			params.methodName,
			"--method-kind",
			params.methodKind,
		];
		if (params.diagram) args.push("--diagram", params.diagram);
		if (params.ifExists) args.push("--if-exists", params.ifExists);
		args.push("--json");
		const raw = await runAscetCliJson(args, {
			...options,
			toolName: "ascet_edit",
			commandId: "preflight_create_method",
			jobKind: "read",
		});
		if (!raw.ok) return { outcome: outcomeFromCliResult(raw), raw };
		const result = unwrapToolSuccessPayload(raw.data);
		if (!isRecord(result)) {
			return {
				outcome: {
					status: "error",
					error: {
						code: "create_method_preflight_invalid",
						message: "preflight_create_method returned an invalid result envelope.",
					},
				},
				raw,
			};
		}
		const capability = isRecord(result.capability) ? result.capability : undefined;
		if (capability?.status !== "supported") {
			return {
				outcome: {
					status: "error",
					error: {
						code:
							typeof capability?.failureCode === "string" && capability.failureCode
								? capability.failureCode
								: "create_method_capability_not_supported",
						message:
							typeof capability?.failureMessage === "string" && capability.failureMessage
								? capability.failureMessage
								: `Diagram '${String(result.diagramName ?? "Main")}' does not support creating '${params.methodKind}'.`,
					},
				},
				raw,
			};
		}
		return {
			outcome: createPreflightOutcome({
				action: params.action,
				params,
				backendPreflight: {
					operation: "preflight_create_method",
					validated: true,
					result,
				},
			}),
			raw,
		};
	}
	if (params.action === "apply_element_spec") {
		if (!params.componentPath || !params.elementIntent || !params.elements) {
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
			normalized = normalizeAscetElementSpec(params.elementIntent, params.elements, catalog.elements);
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
		const capabilities = evaluateElementPreflightCapabilities(
			normalized,
			catalog.elements,
			asRecord(catalog.componentConfigurationProvenance),
		);
		const capabilityFailure = createElementPreflightFailure(capabilities);
		if (capabilityFailure) {
			return { outcome: capabilityFailure, raw: catalogRaw };
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
		const preparedParams = { ...params, specFile } as unknown as AscetMutationParams;
		if (!raw.ok) {
			return { outcome: outcomeFromCliResult(raw), raw, preparedParams, temporarySpecFile: specFile };
		}
		return {
			outcome: createPreflightOutcome({
				action: params.action,
				params,
				backendPreflight: {
					operation: "authoritative_element_preflight",
					validated: capabilities.validated,
					capabilities,
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
	if (params.action === "set_element_dependency" && params.targetPath && params.elementName && params.dependency) {
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
				intent: "preview",
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
	const descriptor = getAscetEditAction(params.action)?.permission;
	if (!descriptor) return undefined;
	const targetPath = directMutationAnchorPath(params);
	let editable: boolean | "not_applicable" = "not_applicable";
	let editabilityRaw: AscetCliJsonResult | undefined;
	if (descriptor.requiresEditableTarget) {
		if (!targetPath) {
			return {
				outcome: {
					status: "error",
					error: {
						code: "ascet_edit_target_missing",
						message: `No authoritative target path is available for ${params.action}.`,
					},
				},
				raw: {
					ok: false,
					data: null,
					request: { cwd: options.cwd, cliPath: options.cliPath ?? "", args: [] },
					stdout: "",
					stderr: "",
					exitCode: null,
					timedOut: false,
					error: {
						code: "ascet_edit_target_missing",
						message: `No authoritative target path is available for ${params.action}.`,
					},
				},
			};
		}
		editabilityRaw = await runAscetEditability({ mode: "check", componentPath: targetPath }, options);
		if (!editabilityRaw.ok || typeof editabilityRaw.data !== "boolean") {
			return { outcome: outcomeFromCliResult(editabilityRaw), raw: editabilityRaw };
		}
		editable = editabilityRaw.data;
	}
	const raw = editabilityRaw ?? {
		ok: true,
		data: { operation: "registered_guarded_operation_preflight" },
		request: { cwd: options.cwd, cliPath: options.cliPath ?? "", args: [] },
		stdout: "",
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
	return {
		outcome: createPreflightOutcome({
			action: params.action,
			params,
			backendPreflight: {
				operation: "registered_guarded_operation_preflight",
				validated: true,
				result: {
					targetPath,
					editable,
					capability: { status: "supported", source: "registered_closed_operation" },
					readbackAvailable: descriptor.requiresReadback,
					noOp: false,
				},
			},
		}),
		raw,
	};
}

function prepareExecutableMutation(params: AscetMutationParams): ExecutableAscetMutationParams {
	return { ...params, intent: "apply", verifyReadback: true } as ExecutableAscetMutationParams;
}

interface FinalizeAscetMutationInput {
	params: AscetMutationParams;
	raw: AscetCliJsonResult;
	options: RunAscetEditOperationOptions;
}

function finalizeAscetMutation(input: FinalizeAscetMutationInput): AscetEditResult {
	const errorCode = input.raw.error?.code;
	if (errorCode && isAscetEditableWriteGateBlockedCode(errorCode)) {
		return asResponse(outcomeFromCliResult(input.raw), input.raw);
	}
	if (errorCode && (isAscetEditApprovalBlockedCode(errorCode) || errorCode.endsWith("_confirmation_ui_failed"))) {
		return asResponse(outcomeFromCliResult(input.raw), input.raw);
	}

	const classification = classifyAscetEditExecution(input.raw);
	if (classification.mutationStatus === "not_started") {
		return asResponse(outcomeFromCliResult(input.raw), input.raw, undefined, classification.verification);
	}

	const observations = classification.shouldInvalidateObservations
		? invalidateAscetEditObservations(input.params, input.options)
		: { invalidated: [] };

	if (
		input.raw.ok &&
		(classification.mutationStatus === "applied" || classification.mutationStatus === "no_op") &&
		(classification.verification.status === "passed" || classification.verification.status === "not_applicable")
	) {
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
			consistencyStatus: classification.consistencyStatus,
			rollback: classification.rollback,
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
		case "not_applicable":
			return "ascet_edit_verification_failed";
	}
}

function partialMutationStatus(outcome: AscetToolOutcome): AscetEditMutationStatus | undefined {
	if (outcome.status !== "partial" || !isRecord(outcome.data)) {
		return undefined;
	}
	const status = outcome.data.mutationStatus;
	return status === "applied" ||
		status === "no_op" ||
		status === "not_started" ||
		status === "partially_applied" ||
		status === "rolled_back" ||
		status === "unknown"
		? status
		: undefined;
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
	if (params.action === "set_module_code" && !params.operation && params.section) {
		return { ...params, operation: params.section };
	}
	if (params.action === "set_element_dependency") {
		const targetPath = params.targetPath ?? params.componentPath;
		if (targetPath) {
			return {
				...params,
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
	if (params.action === "create_method" && params.componentKind) {
		const compatibility = validateCreateMethodKindCompatibility(params);
		if (compatibility) return { status: "error", error: compatibility };
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

function normalizeGuardedMutationResult(raw: AscetCliJsonResult): AscetCliJsonResult {
	if (!raw.ok) return raw;
	const guarded = unwrapToolSuccessPayload(raw.data);
	if (!isRecord(guarded)) {
		return {
			...raw,
			ok: false,
			error: {
				code: "guarded_mutation_invalid_result",
				message: "guarded_mutation returned an invalid result envelope.",
			},
		};
	}
	const primaryResult = asRecord(guarded.primaryResult);
	const guardedEvidence = omitKeys(guarded, ["primaryResult"]);
	const outer = asRecord(raw.data);
	const normalizedData = primaryResult
		? outer && "result" in outer
			? { ...outer, result: { ...primaryResult, guardedMutation: guardedEvidence } }
			: { ...primaryResult, guardedMutation: guardedEvidence }
		: raw.data;
	if (guarded.success === true && primaryResult) {
		return { ...raw, data: normalizedData };
	}
	const error = asRecord(guarded.error);
	return {
		...raw,
		ok: false,
		data: normalizedData,
		error: {
			code: typeof error?.code === "string" ? error.code : "guarded_mutation_failed",
			message: typeof error?.message === "string" ? error.message : "Guarded ASCET mutation failed.",
			details: guarded,
		},
	};
}

async function runGuardedMutationArgs(
	operation: string,
	fullArgs: string[],
	editableTargets: string[],
	options: RunAscetEditOperationOptions,
): Promise<AscetCliJsonResult> {
	if (fullArgs[0] !== "exec" || fullArgs[1] !== operation) {
		throw new Error(`Guarded mutation arguments do not match operation '${operation}'.`);
	}
	const targets = [...new Set(editableTargets.map((target) => normalizeAscetPath(target)))];
	if (targets.length === 0) {
		throw new Error(`Guarded mutation '${operation}' requires at least one editable target.`);
	}
	return withInlineCodeFile(
		{
			code: JSON.stringify({
				operation,
				operationArgs: fullArgs.slice(2),
				editableTargets: targets,
				acquireEditability: true,
			}),
			prefix: "guarded_mutation",
		},
		async (requestFile) => {
			const raw = await runAscetCliJson(["exec", "guarded_mutation", "--request-file", requestFile, "--json"], {
				...options,
				toolName: "ascet_edit",
				commandId: "guarded_mutation",
				jobKind: "write",
			});
			return normalizeGuardedMutationResult(raw);
		},
	);
}

async function runGuardedMutationBackend(
	params: ExecutableAscetMutationParams,
	editableTargets: string[],
	options: RunAscetEditOperationOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_method":
			return runGuardedCreateMethodMutation(params, true, options);
		case "set_method_signature":
			if (params.arguments?.length) {
				return withInlineCodeFile(
					{ code: JSON.stringify(createMethodSignatureSpec(params), null, 2), prefix: "set_method_signature" },
					(signatureJsonFile) =>
						runGuardedMutationArgs(
							params.action,
							buildSetMethodSignatureArgs(params, signatureJsonFile),
							editableTargets,
							options,
						),
				);
			}
			return runGuardedMutationArgs(params.action, buildSetMethodSignatureArgs(params), editableTargets, options);
		case "delete_component":
			return runGuardedMutationArgs(params.action, buildDeleteComponentArgs(params), editableTargets, options);
		case "delete_method":
			return runGuardedMutationArgs(params.action, buildDeleteMethodArgs(params), editableTargets, options);
		case "set_method_code":
			return withEditCode(params, (codeFile) =>
				runGuardedMutationArgs(
					params.action,
					buildSetMethodCodeArgs({ ...params, codeFile }),
					editableTargets,
					options,
				),
			);
		case "set_module_code":
			return withEditCode(params, (codeFile) =>
				runGuardedMutationArgs(
					params.action,
					buildSetModuleCodeArgs({ ...params, operation: params.operation!, codeFile }),
					editableTargets,
					options,
				),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withEditCode(params, (codeFile) =>
					runGuardedMutationArgs(
						params.action,
						buildSetStateMachineCodeArgs({ ...params, codeFile }),
						editableTargets,
						options,
					),
				);
			}
			return runGuardedMutationArgs(params.action, buildSetStateMachineCodeArgs(params), editableTargets, options);
		case "set_enumerators":
			return runGuardedMutationArgs(params.action, buildSetEnumeratorsArgs(params), editableTargets, options);
		case "apply_element_spec":
			return runGuardedMutationArgs(
				params.action,
				buildApplyElementSpecArgs(requirePreparedApplyElementParams(params)),
				editableTargets,
				options,
			);
		case "apply_project_formula":
			return runGuardedMutationArgs(params.action, buildApplyProjectFormulaArgs(params), editableTargets, options);
		case "set_element_dependency":
			if (!params.targetPath || !params.elementName || !params.dependency) {
				throw new Error("set_element_dependency guarded execution requires resolved target parameters.");
			}
			return runGuardedMutationArgs(
				params.action,
				buildSetElementDependencyArgs({
					...params,
					targetPath: params.targetPath,
					elementName: params.elementName,
					dependency: params.dependency,
				}),
				editableTargets,
				options,
			);
		case "create_folder":
		case "create_component":
		case "delete_folder":
			throw new Error(`ASCET action '${params.action}' does not use component editability acquisition.`);
	}
}

function directMutationEditableTargets(params: AscetMutationParams): string[] {
	switch (params.action) {
		case "create_method":
		case "set_method_signature":
		case "delete_component":
		case "delete_method":
		case "set_method_code":
		case "set_enumerators":
			return [params.componentPath];
		case "set_module_code":
			return [params.modulePath];
		case "set_state_machine_code":
			return [params.stateMachinePath];
		case "apply_element_spec":
			return [params.componentPath];
		case "apply_project_formula":
			return [params.projectPath];
		case "set_element_dependency":
			return params.targetPath ? [params.targetPath] : [];
		case "create_folder":
		case "create_component":
		case "delete_folder":
			return [];
	}
}

function planManagedEditableTargets(planned: PlanManagedPlanParams, backendPreflight: AscetPlanJsonValue): string[] {
	if (planned.action === "apply_element_spec") return [planned.componentPath];
	const preflight = isRecord(backendPreflight) ? backendPreflight : undefined;
	const result = asRecord(preflight?.result);
	const plan = asRecord(result?.plan);
	const matches = Array.isArray(plan?.matches) ? plan.matches : [];
	const componentPaths = matches.flatMap((value) => {
		const match = asRecord(value);
		return typeof match?.component === "string" && match.component.trim() ? [match.component] : [];
	});
	return [...new Set(componentPaths.length > 0 ? componentPaths : planned.targetPath ? [planned.targetPath] : [])];
}

async function runGuardedCreateMethodMutation(
	params: Extract<AscetMutationParams, { action: "create_method" }>,
	acquireEditability: boolean,
	options: RunAscetEditOperationOptions,
): Promise<AscetCliJsonResult> {
	const args = [
		"exec",
		"guarded_create_method",
		normalizeAscetPath(params.componentPath),
		params.methodName,
		"--method-kind",
		params.methodKind,
	];
	if (params.diagram) args.push("--diagram", params.diagram);
	if (params.ifExists) args.push("--if-exists", params.ifExists);
	if (acquireEditability) args.push("--acquire-editability");
	args.push("--json");
	const raw = await runAscetCliJson(args, {
		...options,
		toolName: "ascet_edit",
		commandId: "guarded_create_method",
		jobKind: "write",
	});
	if (!raw.ok) return raw;
	const result = unwrapToolSuccessPayload(raw.data);
	if (!isRecord(result) || result.success !== false) return raw;
	const error = isRecord(result.error) ? result.error : undefined;
	return {
		...raw,
		ok: false,
		error: {
			code: typeof error?.code === "string" ? error.code : "guarded_create_method_failed",
			message: typeof error?.message === "string" ? error.message : "Guarded create_method failed.",
			details: result,
		},
	};
}

async function dispatchMutation(
	params: ExecutableAscetMutationParams,
	options: RunAscetEditOperationOptions,
): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "create_folder":
			return runAscetCreateFolder(params, options);
		case "create_component":
			return runAscetCreateComponent(params, options);
		case "create_method":
			return runAscetCreateMethod(params, options);
		case "set_method_signature":
			return runAscetSetMethodSignature(params, options);
		case "delete_component":
			return runAscetDeleteComponent(params, options);
		case "delete_method":
			return runAscetDeleteMethod(params, options);
		case "delete_folder":
			return runAscetDeleteFolder(params, options);
		case "set_method_code":
			return withEditCode(params, (codeFile) => runAscetSetMethodCode({ ...params, codeFile }, options));
		case "set_module_code":
			return withEditCode(params, (codeFile) =>
				runAscetSetModuleCode({ ...params, operation: params.operation!, codeFile }, options),
			);
		case "set_state_machine_code":
			if (params.code !== undefined || params.codeFile !== undefined) {
				return withEditCode(params, (codeFile) => runAscetSetStateMachineCode({ ...params, codeFile }, options));
			}
			return runAscetSetStateMachineCode(params, options);
		case "set_enumerators":
			return runAscetSetEnumerators(params, options);
		case "apply_element_spec":
			return runAscetApplyElementSpec(requirePreparedApplyElementParams(params), options);
		case "apply_project_formula":
			return runAscetApplyProjectFormula(params, options);
		case "set_element_dependency":
			if (!params.targetPath || !params.elementName || !params.dependency) {
				throw new Error(
					"set_element_dependency requires planned targetPath/elementName/dependency after validation.",
				);
			}
			return runAscetSetElementDependency(
				{
					...params,
					targetPath: params.targetPath,
					elementName: params.elementName,
					dependency: params.dependency,
				},
				options,
			);
	}
}

export function formatAscetEditResult(result: AscetEditResult): string {
	return result.content[0]?.text ?? "";
}

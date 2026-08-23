import type { AscetCliJsonResult, AscetCliLifecycleEvent } from "../cli.ts";
import type { AscetToolOutcome } from "../core/results.ts";
import { withInlineCodeFile } from "../core/temp-files.ts";
import { type AscetCreateDependentChainParams, runAscetCreateDependentChain } from "../create-dependent-chain.ts";
import type { AscetApplyElementPlanParams } from "../element-spec-contract.ts";
import type { AscetCreateMethodComponentKind } from "../method-kind-compatibility.ts";
import { type AscetPermissionSnapshot, resolveAscetPermissionSnapshot } from "../permissions/types.ts";
import type { AscetDependencyMappingTarget, AscetDependencyRestorationValue } from "../set-element-dependency.ts";
import { compactObject, toToolFailurePayload, unwrapToolSuccessPayload } from "../tool-response-contract.ts";
import { openAiObjectUnionSchema } from "../tools/_shared/openai-schema.ts";
import { ascetMutationActionSchemas } from "../tools/actions/contracts/edit.ts";
import { type AscetEditApprovalContext, isAscetEditApprovalBlockedCode } from "./approval.ts";
import {
	type AscetObservationInvalidation,
	invalidateAscetEditObservations,
	type RunAscetEditOperationOptions,
} from "./common.ts";
import { type AscetEditActionId, getAscetEditAction, getAscetEditActionByDiscriminator } from "./contract.ts";
import {
	type AscetEditabilityParams,
	formatAscetEditabilityResult,
	runApprovedAscetEditability,
} from "./editability.ts";
import { isAscetEditableWriteGateBlockedCode } from "./editable-write-gate.ts";
import { runAscetFastMutation } from "./fast-path.ts";
import type { AscetMutationResultEnvelope } from "./mutation-result.ts";
import { readCanonicalMutationEvidence } from "./result-contract.ts";
import {
	type AscetEditExecutionClassification,
	type AscetEditMutationStatus,
	type AscetEditVerification,
	classifyAscetEditExecution,
} from "./verification.ts";
import type { AscetPublicMutationIntent } from "./write-control-contract.ts";
import { recordAscetWriteTelemetry } from "./write-telemetry.ts";

type CodeSource = { code?: string; codeFile?: string };

export type AscetMutationParams =
	| { action: "create_folder"; folderPath: string; intent: AscetPublicMutationIntent }
	| {
			action: "create_component";
			componentPath: string;
			kind: "class" | "module" | "statemachine" | "enumeration";
			language?: "ESDL" | "BDE" | "C";
			ifExists?: "fail" | "return-existing";
			rollbackOnFailure?: boolean;
			intent: AscetPublicMutationIntent;
	  }
	| {
			action: "create_method";
			componentPath: string;
			componentKind?: AscetCreateMethodComponentKind;
			methodName: string;
			methodKind: "abstract" | "process" | "action" | "condition" | "trigger";
			diagram?: string;
			ifExists?: "fail" | "return-existing";
			intent: AscetPublicMutationIntent;
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
			intent: AscetPublicMutationIntent;
	  }
	| {
			action: "delete_component";
			componentPath: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetPublicMutationIntent;
	  }
	| {
			action: "delete_method";
			componentPath: string;
			methodName: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetPublicMutationIntent;
	  }
	| {
			action: "delete_folder";
			folderPath: string;
			ifMissing?: "fail" | "ignore";
			intent: AscetPublicMutationIntent;
	  }
	| ({
			action: "set_method_code";
			componentPath: string;
			methodName: string;
			intent: AscetPublicMutationIntent;
	  } & CodeSource)
	| ({
			action: "set_module_code";
			modulePath: string;
			operation?: "set-method" | "set-header" | "set-external-c-code";
			section?: "set-method" | "set-header" | "set-external-c-code";
			methodName?: string;
			intent: AscetPublicMutationIntent;
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
			intent: AscetPublicMutationIntent;
	  } & CodeSource)
	| {
			action: "set_enumerators";
			componentPath: string;
			enumerators: string[];
			intent: AscetPublicMutationIntent;
	  }
	| AscetApplyElementPlanParams
	| {
			action: "apply_project_formula";
			projectPath: string;
			specFile: string;
			mode?: "restore";
			deleteMissing?: boolean;
			intent: AscetPublicMutationIntent;
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
			intent: AscetPublicMutationIntent;
	  };

type WithLegacyMutationIntent<T> = T extends { intent: AscetPublicMutationIntent }
	? Omit<T, "intent"> & { intent: "preview" | "apply" }
	: T;

export type AscetLegacyMutationParams = WithLegacyMutationIntent<AscetMutationParams>;

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

function canonicalWriteEvidence(raw: AscetCliJsonResult | undefined): Partial<AscetMutationResultEnvelope> {
	const evidence = readCanonicalMutationEvidence(raw?.data);
	return evidence ?? {};
}

function createMutationResultEnvelope(
	params: AscetMutationParams,
	result: AscetEditResult,
	ctx: AscetEditRuntimeContext,
	lifecycle: AscetWriteLifecycleEvidence,
): AscetMutationResultEnvelope {
	const outcome = result.details.outcome;
	const permissionSnapshot = resolveAscetPermissionSnapshot(ctx);
	const databaseFingerprintKnown = permissionSnapshot.databaseFingerprint !== undefined;
	const databaseFingerprintSource =
		permissionSnapshot.databaseFingerprintSource ?? (databaseFingerprintKnown ? "caller" : "unavailable");
	const audit: NonNullable<AscetMutationResultEnvelope["audit"]> = {
		databaseFingerprintKnown,
		databaseFingerprintSource,
		...(permissionSnapshot.databaseFingerprint
			? { databaseFingerprint: permissionSnapshot.databaseFingerprint }
			: {}),
		...lifecycle.audit,
	};
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
	const evidence = canonicalWriteEvidence(result.details.raw);
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
	const canonicalVerificationStatus = evidence.verificationStatus ?? verificationStatus;
	return {
		outcome: status === "ok" ? "succeeded" : "failed",
		status,
		changed: evidence.changed ?? mutationStatus === "applied",
		mutationStatus,
		saveAttempted: evidence.saveAttempted ?? false,
		saveSucceeded: evidence.saveSucceeded ?? false,
		saveState:
			evidence.saveState ??
			(mutationStatus === "no_op" || mutationStatus === "not_started" ? "not_required" : "unknown"),
		verified: evidence.verified ?? canonicalVerificationStatus === "passed",
		verificationStatus: canonicalVerificationStatus,
		verificationMode:
			evidence.verificationMode ?? (canonicalVerificationStatus === "not_applicable" ? "not_applicable" : "unknown"),
		sessionCount: evidence.sessionCount ?? (lifecycle.bridgeEntered ? 1 : 0),
		saveCount: evidence.saveCount ?? 0,
		editableRetryCount: evidence.editableRetryCount ?? 0,
		nativeMutationAttemptCount: evidence.nativeMutationAttemptCount ?? 0,
		permission:
			lifecycle.permission ??
			({
				mode: permissionSnapshot.mode,
				decision: "not_evaluated",
				databaseFingerprintKnown,
				databaseFingerprintSource,
				evidenceComplete: false,
				impactUnknown: true,
			} satisfies AscetMutationResultEnvelope["permission"]),
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
		verification: { status: canonicalVerificationStatus },
		...(error ? { error } : {}),
		audit,
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
			typeof params.action === "string" ? getAscetEditActionByDiscriminator("action", params.action) : undefined;
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
	const mode = typeof params.mode === "string" ? getAscetEditActionByDiscriminator("mode", params.mode) : undefined;
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

async function _withEditCode<T>(
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
	let raw: AscetCliJsonResult | undefined;
	try {
		raw = await runAscetFastMutation(params, options, ctx, lifecycle);
		const result = finalizeAscetMutation({ params, raw, options });
		const enriched = attachMutationResultEnvelope(params, result, ctx, lifecycle);
		recordMutationTelemetry(params, enriched, options, startedAt, lifecycle);
		return enriched;
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		const canonical = readCanonicalMutationEvidence(raw?.data);
		const mutationStatus = canonical?.mutationStatus ?? (lifecycle.bridgeEntered ? "unknown" : "not_started");
		const errorCode = canonical
			? "ascet_edit_post_processing_failed"
			: mutationStatus === "unknown"
				? "ascet_edit_write_outcome_unknown"
				: "ascet_edit_internal_error";
		const failureRaw: AscetCliJsonResult = {
			...(raw ?? {
				data: null,
				request: { cwd: options.cwd, cliPath: "", args: [] },
				stdout: "",
				stderr: "",
				exitCode: null,
				timedOut: false,
			}),
			ok: false,
			error: {
				code: errorCode,
				message,
				details: {
					mutationStatus,
					verificationStatus:
						canonical?.verificationStatus ?? (mutationStatus === "not_started" ? "not_applicable" : "unknown"),
					requiresReadback: mutationStatus !== "not_started" && !canonical,
					...(mutationStatus === "unknown"
						? { recoveryActions: ["Re-read the target and reconcile the mutation outcome before retrying."] }
						: {}),
				},
			},
		};
		const failed = asResponse({ status: "error", error: { code: errorCode, message } }, failureRaw);
		const enriched = attachMutationResultEnvelope(params, failed, ctx, lifecycle);
		recordMutationTelemetry(params, enriched, options, startedAt, lifecycle);
		return enriched;
	}
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

function _withWriteLifecycleTracking(
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

function resolveTelemetryPhase(_params: AscetMutationParams): "plan" | "commit" | "execute" {
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

function _prepareExecutableMutation(params: AscetMutationParams): ExecutableAscetMutationParams {
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

export function formatAscetEditResult(result: AscetEditResult): string {
	return result.content[0]?.text ?? "";
}

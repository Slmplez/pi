import { evaluateAscetPermission } from "../permissions/evaluate.ts";
import type { AscetPermissionDecision, AscetPermissionRule, PermissionMode } from "../permissions/types.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { requestAscetMutationApproval } from "./approval.ts";
import type { AscetEditActionId } from "./contract.ts";
import { getAscetEditAction } from "./contract.ts";
import type { AscetMutationResultEnvelope, AscetMutationStatus, AscetVerificationStatus } from "./mutation-result.ts";
import { compareAscetApprovalMaterial } from "./preflight/fingerprint.ts";
import type { AscetMutationPreflightEvidence, AscetMutationPreflightResult } from "./preflight/types.ts";

export interface AscetGuardedMutationExecutionResult {
	mutationStatus: AscetMutationStatus;
	verificationStatus: AscetVerificationStatus;
	editabilityStatus?: AscetMutationResultEnvelope["editability"];
	error?: { code: string; message: string };
	raw?: unknown;
}

export interface AscetGuardedMutationExecutionContext {
	decision: AscetPermissionDecision;
	approvedAt?: string;
	revalidatedAt: string;
}

export interface RunGuardedAscetMutationInput {
	action: AscetEditActionId;
	intent: "preview" | "apply";
	permissionMode: PermissionMode;
	rules: readonly AscetPermissionRule[];
	signal?: AbortSignal;
	ctx: AscetEditApprovalContext;
	preflight: () => Promise<AscetMutationPreflightResult>;
	execute: (
		evidence: AscetMutationPreflightEvidence,
		context: AscetGuardedMutationExecutionContext,
	) => Promise<AscetGuardedMutationExecutionResult>;
	maxMaterialChanges?: number;
}

function baseEnvelope(mode: PermissionMode): AscetMutationResultEnvelope {
	return {
		status: "error",
		permission: { mode, decision: "not_evaluated" },
		preflight: { status: "not_run" },
		editability: { status: "not_applicable" },
		mutation: { status: "not_started" },
		verification: { status: "not_applicable" },
		bridge: { beforeBridge: true, bridgeEntered: false, backendResponseReceived: false },
		recovery: { required: false, actions: [] },
	};
}

function plannedMutationTarget(action: AscetEditActionId, evidence: AscetMutationPreflightEvidence): string {
	return (
		evidence.effects.reduce<string | undefined>(
			(path, effect) => (effect.kind === action ? effect.target : path),
			undefined,
		) ?? evidence.target.path
	);
}

function decisionFor(
	input: RunGuardedAscetMutationInput,
	evidence: AscetMutationPreflightEvidence,
): AscetPermissionDecision {
	const descriptor = getAscetEditAction(input.action)?.permission;
	if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${input.action}.`);
	const variantModifier = evidence.riskModifiers.find((modifier) => modifier.startsWith("variant_count:"));
	const variantCount = variantModifier
		? Number.parseInt(variantModifier.slice("variant_count:".length), 10)
		: undefined;
	const permissionPath = plannedMutationTarget(input.action, evidence);
	return evaluateAscetPermission({
		mode: input.permissionMode,
		action: input.action,
		descriptor,
		rules: input.rules,
		path: permissionPath,
		databaseFingerprint: evidence.database.fingerprint,
		hardGatesPassed:
			evidence.capability.status === "supported" &&
			evidence.impact.complete &&
			evidence.verification.available &&
			evidence.editability.status !== "unknown",
		hardGateReason:
			evidence.capability.status !== "supported"
				? `Required capability '${evidence.capability.operation}' is ${evidence.capability.status}.`
				: !evidence.impact.complete
					? "Shared-object impact evidence is incomplete."
					: !evidence.verification.available
						? "Mandatory readback is unavailable."
						: evidence.editability.status === "unknown"
							? "Target editability is unknown."
							: undefined,
		evidenceComplete: Boolean(
			evidence.database.fingerprint &&
				evidence.target.oid &&
				evidence.target.kind &&
				evidence.impact.fingerprint &&
				evidence.approvalMaterialFingerprint,
		),
		noOp: evidence.noOp,
		minimumRisk: evidence.riskModifiers.includes("minimum_risk:medium") ? "medium" : undefined,
		variantCount: Number.isFinite(variantCount) ? variantCount : undefined,
		editableAcquisitionRequired: evidence.editability.status === "read_only",
		sharedObject: evidence.impact.sharedObject,
	});
}

function permissionFields(decision: AscetPermissionDecision): AscetMutationResultEnvelope["permission"] {
	return {
		mode: decision.mode,
		decision: decision.behavior,
		risk: decision.risk,
		reason: decision.reason,
		rule: decision.rule,
	};
}

function approvalMessage(action: AscetEditActionId, evidence: AscetMutationPreflightEvidence): string {
	const changes = evidence.effects.map((effect) => `- ${effect.description}`).join("\n");
	return [
		`Target: ${plannedMutationTarget(action, evidence)}`,
		"",
		"Changes:",
		changes || "- Apply the ASCET change",
		"",
		"Verification: Automatic readback",
	].join("\n");
}

function executionStatus(result: AscetGuardedMutationExecutionResult): AscetMutationResultEnvelope["status"] {
	if (result.mutationStatus === "rolled_back") return "rolled_back";
	if (result.mutationStatus === "unknown") return "unknown";
	if (result.mutationStatus === "partially_applied") return "partial";
	if (result.error) return result.mutationStatus === "not_started" ? "error" : "partial";
	if (
		(result.mutationStatus === "applied" || result.mutationStatus === "no_op") &&
		(result.verificationStatus === "passed" || result.verificationStatus === "not_applicable")
	) {
		return "ok";
	}
	return result.mutationStatus === "not_started" ? "blocked" : "partial";
}

export async function runGuardedAscetMutation(
	input: RunGuardedAscetMutationInput,
): Promise<AscetMutationResultEnvelope> {
	const envelope = baseEnvelope(input.permissionMode);
	let preflight = await input.preflight();
	if (preflight.status === "failed") {
		return {
			...envelope,
			preflight: { status: "failed", evidence: preflight.evidence },
			error: { code: preflight.code, message: preflight.message },
			raw: preflight.raw,
		};
	}

	let evidence = preflight.evidence;
	if (input.intent === "preview") {
		return {
			...envelope,
			status: "ok",
			preflight: { status: "passed", evidence },
			mutation: { status: evidence.noOp ? "no_op" : "not_started" },
			verification: { status: evidence.noOp ? "passed" : "not_applicable" },
			raw: preflight.raw,
		};
	}

	let materialChanges = 0;
	let approvedAt: string | undefined;
	let revalidatedAt: string | undefined;
	let decision: AscetPermissionDecision | undefined;
	while (true) {
		decision = decisionFor(input, evidence);
		envelope.permission = permissionFields(decision);
		envelope.preflight = { status: "passed", evidence };
		if (decision.behavior === "deny") {
			return {
				...envelope,
				status: "blocked",
				error: { code: "ascet_edit_permission_denied", message: decision.reason },
				raw: preflight.raw,
			};
		}
		if (evidence.noOp) {
			return {
				...envelope,
				status: "ok",
				mutation: { status: "no_op" },
				verification: { status: "passed" },
				audit: {
					approvedAt,
					revalidatedAt,
					preflightFingerprint: evidence.paramsFingerprint,
					approvalMaterialFingerprint: evidence.approvalMaterialFingerprint,
				},
				raw: preflight.raw,
			};
		}
		if (decision.behavior === "ask") {
			const approval = await requestAscetMutationApproval(
				{
					title: `Confirm ASCET ${input.action.replaceAll("_", " ")}`,
					message: approvalMessage(input.action, evidence),
					signal: input.signal,
				},
				input.ctx,
			);
			if (approval.status !== "approved") {
				const error =
					approval.status === "ui_unavailable"
						? {
								code: "ascet_edit_approval_required",
								message: "This operation requires an interactive approval channel.",
							}
						: approval.status === "cancelled"
							? {
									code: "ascet_edit_operation_aborted_before_write",
									message: "The operation was cancelled before mutation began.",
								}
							: approval.status === "ui_failed"
								? { code: "ascet_edit_confirmation_ui_failed", message: approval.message }
								: {
										code: "ascet_edit_confirmation_not_granted",
										message: "ASCET edit confirmation was not granted.",
									};
				return { ...envelope, status: "blocked", error, raw: preflight.raw };
			}
			approvedAt = approval.approvedAt;
		}

		preflight = await input.preflight();
		revalidatedAt = new Date().toISOString();
		if (preflight.status === "failed") {
			return {
				...envelope,
				status: "error",
				preflight: { status: "failed", evidence: preflight.evidence },
				error: { code: preflight.code, message: preflight.message },
				audit: {
					approvedAt,
					revalidatedAt,
					preflightFingerprint: evidence.paramsFingerprint,
					approvalMaterialFingerprint: evidence.approvalMaterialFingerprint,
				},
				raw: preflight.raw,
			};
		}
		const comparison = compareAscetApprovalMaterial(evidence, preflight.evidence);
		if (comparison.identical) {
			evidence = preflight.evidence;
			break;
		}
		materialChanges += 1;
		if (materialChanges > (input.maxMaterialChanges ?? 2)) {
			return {
				...envelope,
				status: "blocked",
				preflight: { status: "passed", evidence: preflight.evidence },
				error: {
					code: "ascet_edit_target_unstable",
					message: "The authoritative ASCET mutation scope changed repeatedly during approval.",
				},
				audit: {
					approvedAt,
					revalidatedAt,
					preflightFingerprint: preflight.evidence.paramsFingerprint,
					approvalMaterialFingerprint: evidence.approvalMaterialFingerprint,
				},
				raw: preflight.raw,
			};
		}
		evidence = preflight.evidence;
	}

	if (!decision || !revalidatedAt) throw new Error("Guarded ASCET mutation did not complete revalidation.");
	const execution = await input.execute(evidence, { decision, approvedAt, revalidatedAt });
	const status = executionStatus(execution);
	const recoveryActions =
		execution.mutationStatus === "unknown"
			? ["Re-read the target and reconcile the mutation outcome before retrying."]
			: execution.mutationStatus === "partially_applied"
				? ["Re-read every affected target and reconcile partial changes before retrying."]
				: [];
	return {
		...envelope,
		status,
		preflight: { status: "passed", evidence },
		editability: execution.editabilityStatus ?? {
			status:
				evidence.editability.status === "editable"
					? "editable"
					: evidence.editability.status === "read_only"
						? "blocked"
						: evidence.editability.status === "unknown"
							? "unknown"
							: "not_applicable",
		},
		mutation: { status: execution.mutationStatus },
		verification: { status: execution.verificationStatus },
		error: execution.error,
		audit: {
			approvedAt,
			revalidatedAt,
			preflightFingerprint: evidence.paramsFingerprint,
			approvalMaterialFingerprint: evidence.approvalMaterialFingerprint,
		},
		recovery: { required: recoveryActions.length > 0, actions: recoveryActions },
		raw: execution.raw,
	};
}

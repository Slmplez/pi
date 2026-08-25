import { Value } from "typebox/value";
import type { AscetCliJsonResult } from "./cli.ts";
import {
	type ConfigureParameterDependencyChainOptions,
	type ConfigureParameterDependencyChainResult,
	runConfigureParameterDependencyChainBridge,
} from "./configure-parameter-dependency-chain.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetToolOutcome } from "./core/results.ts";
import { type AscetEditApprovalContext, requestAscetEditApproval } from "./edit/approval.ts";
import { getAscetEditAction } from "./edit/contract.ts";
import { type AscetGuardedMutationExecutionResult, runGuardedAscetMutation } from "./edit/guarded-mutation.ts";
import type { AscetMutationResultEnvelope } from "./edit/mutation-result.ts";
import { fingerprintAscetValue } from "./edit/preflight/fingerprint.ts";
import { createAscetMutationPreflightEvidence } from "./edit/preflight/service.ts";
import type { AscetMutationPreflightResult, AscetPlannedEffect } from "./edit/preflight/types.ts";
import { readCanonicalMutationEvidence } from "./edit/result-contract.ts";
import type {
	AscetConsumerImportedParameterCreateInput,
	AscetLocalDependentParameterCreateInput,
	AscetProviderExportedParameterCreateInput,
} from "./element-spec-contract.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "./get.ts";
import {
	type AscetCreateDependentChainExplicitImplementation,
	type AscetCreateDependentChainParams,
	ascetCreateDependentChainActionSchema,
} from "./tools/actions/contracts/dependency.ts";

export {
	type AscetCreateDependentChainExplicitImplementation,
	type AscetCreateDependentChainImportedElement,
	type AscetCreateDependentChainLocalElement,
	type AscetCreateDependentChainParams,
	type AscetCreateDependentChainProviderElement,
	ascetCreateDependentChainActionSchema,
} from "./tools/actions/contracts/dependency.ts";

import { evaluateAscetPermission } from "./permissions/evaluate.ts";
import { type AscetPermissionSnapshot, resolveAscetPermissionSnapshot } from "./permissions/types.ts";
import { parseAscetElementSearchHint } from "./read-dependent-chain.ts";
import { runAscetReadElement } from "./read-element.ts";
import { normalizeAscetSearchResult, runAscetSearch } from "./search.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

const PROVIDER_SEARCH_LIMIT = 20;
const BRIDGE_OPERATION = "configure_parameter_dependency_chain_execute";
type JsonRecord = Record<string, unknown>;

/** @internal Legacy/recovery-only request shape. Public ascet_edit accepts apply only. */
export type AscetLegacyCreateDependentChainParams = Omit<AscetCreateDependentChainParams, "provider" | "intent"> & {
	provider: Omit<AscetCreateDependentChainParams["provider"], "componentPath"> & { componentPath?: string };
	intent: "preview" | "apply";
};

export interface AscetCreateDependentChainContext extends AscetEditApprovalContext {
	ascetPermission?: AscetPermissionSnapshot;
}

export interface AscetCreateDependentChainResult {
	content: Array<{ type: "text"; text: string }>;
	details: {
		outcome: AscetToolOutcome;
		mutationResult?: AscetMutationResultEnvelope;
		error?: { code: string; message: string };
		provider?: Record<string, unknown>;
		diagnostics?: unknown;
	};
}

interface DatabaseIdentitySnapshot {
	path: string;
	fingerprint: string;
}

interface ResolvedProvider {
	componentPath: string;
	diagnostics: Record<string, unknown>;
}

interface BridgeTarget {
	path: string;
	oid: string;
	editable: boolean;
}

interface CollectedPreflight {
	result: AscetMutationPreflightResult;
	bridge?: ConfigureParameterDependencyChainResult;
}

export async function runAscetCreateDependentChain(
	params: AscetCreateDependentChainParams,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetCreateDependentChainContext,
): Promise<AscetCreateDependentChainResult> {
	const permission = resolveAscetPermissionSnapshot(ctx);
	const raw = params as { intent?: unknown; provider?: unknown };
	if (raw.intent !== "apply") {
		return publicErrorResult(
			"ascet_edit_invalid_parameter",
			"intent=apply is required for ascet_edit writes; use mode=check for read-only editability inspection.",
			permission,
		);
	}
	if (!isRecord(raw.provider) || !readString(raw.provider, "componentPath")) {
		return publicErrorResult(
			"provider_path_required",
			"create_dependent_chain requires provider.componentPath; provider Search is not part of the normal write route.",
			permission,
		);
	}
	if (!Value.Check(ascetCreateDependentChainActionSchema, params)) {
		return publicErrorResult(
			"element_definition_invalid",
			"Invalid create_dependent_chain request; unknown and incomplete fields are rejected.",
			permission,
		);
	}
	const normalizedParams = normalizeCreateDependentChainParams(params);
	const validationError = validateParams(normalizedParams);
	if (validationError) {
		return publicErrorResult(
			validationError.code,
			validationError.message,
			permission,
			normalizedParams.consumer.componentPath,
		);
	}

	const descriptor = getAscetEditAction("create_dependent_chain")?.permission;
	if (!descriptor) {
		return publicErrorResult(
			"ascet_edit_internal_contract_error",
			"Missing create_dependent_chain permission descriptor.",
			permission,
			normalizedParams.consumer.componentPath,
		);
	}
	const decision = evaluateAscetPermission({
		mode: permission.mode,
		action: "create_dependent_chain",
		descriptor,
		rules: permission.rules,
		path: normalizedParams.consumer.componentPath,
		databaseFingerprint: permission.databaseFingerprint,
		hardGatesPassed: true,
		evidenceComplete: normalizedParams.binding.variantPolicy !== "all",
		sharedObject: true,
		targetCount: 2,
		variantCount:
			normalizedParams.binding.variantPolicy === "all"
				? undefined
				: (normalizedParams.binding.variants?.length ?? 1),
		impactUnknown: normalizedParams.binding.variantPolicy === "all",
	});
	if (decision.behavior === "deny") {
		return publicErrorResult(
			"ascet_edit_permission_denied",
			decision.reason,
			permission,
			normalizedParams.consumer.componentPath,
			decision,
			normalizedParams,
		);
	}

	let approvedAt: string | undefined;
	if (decision.behavior === "ask") {
		const approval = await requestAscetEditApproval(
			{
				title: "Confirm ASCET dependency-chain edit",
				message: `Target: ${normalizedParams.consumer.componentPath}`,
				signal: options.signal,
			},
			ctx,
		);
		if (!approval.approved) {
			return publicBlockedResult(approval.code, approval.message, permission, decision, normalizedParams);
		}
		approvedAt = approval.approvedAt;
	}

	const bridgeLifecycle = { beforeBridge: false, bridgeEntered: false, backendResponseReceived: false };
	let bridge: ConfigureParameterDependencyChainResult;
	try {
		bridge = await runConfigureParameterDependencyChainBridge(
			createBridgeDefinition(normalizedParams, normalizedParams.provider.componentPath),
			{
				...options,
				onLifecycle: (event) => {
					if (event.stage === "before_bridge") bridgeLifecycle.beforeBridge = true;
					if (event.stage === "bridge_entered") bridgeLifecycle.bridgeEntered = true;
					if (event.stage === "backend_response_received") bridgeLifecycle.backendResponseReceived = true;
					options.onLifecycle?.(event);
				},
			},
			{ intent: "apply", acquireEditability: false },
		);
	} catch (error) {
		const mutationStarted = bridgeLifecycle.bridgeEntered;
		const message = error instanceof Error ? error.message : String(error);
		bridge = {
			status: mutationStarted ? "unknown_outcome" : "error",
			writesPerformed: false,
			mutationStarted,
			consistency: "compensating",
			error: {
				code: mutationStarted ? "write_outcome_unknown" : "ascet_edit_internal_error",
				message,
			},
			rollback: { required: mutationStarted, status: mutationStarted ? "unknown" : "not_required" },
		};
	}
	const canonical = readCanonicalDependencyResult(bridge);
	if (!canonical) {
		const failure = bridgeFailure(bridge);
		const code =
			bridge.status === "committed" || bridge.status === "no_change"
				? "ascet_edit_canonical_evidence_invalid"
				: failure.code;
		const message =
			bridge.status === "committed" || bridge.status === "no_change"
				? "Dependency-chain write omitted or contradicted canonical mutation, Save, verification, or session evidence."
				: failure.message;
		return publicBridgeFailureResult(
			bridge,
			permission,
			decision,
			normalizedParams,
			code,
			message,
			approvedAt,
			bridgeLifecycle,
		);
	}
	const effects = appliedEffects(bridge);
	const mutationResult: AscetMutationResultEnvelope = {
		outcome: "succeeded",
		status: "ok",
		...canonical,
		permission: createChainPermissionEvidence(permission, decision, normalizedParams),
		preflight: { status: "not_run" },
		editability: { status: "not_applicable" },
		mutation: { status: canonical.mutationStatus },
		verification: { status: "passed" },
		bridge: bridgeLifecycle,
		recovery: { required: false, actions: [] },
		audit: createChainAudit(permission, approvedAt),
	};
	return {
		content: [{ type: "text", text: JSON.stringify(mutationResult) }],
		details: {
			outcome: { status: "ok", data: { created: effects.created, configured: effects.configured }, warnings: [] },
			mutationResult,
			provider: { source: "explicit" },
			diagnostics: bridge,
		},
	};
}

/** @internal Legacy/recovery-only orchestration. Normal ascet_edit routes must never call this function. */
export async function runLegacyAscetCreateDependentChain(
	params: AscetLegacyCreateDependentChainParams,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetCreateDependentChainContext,
): Promise<AscetCreateDependentChainResult> {
	const normalizedParams = normalizeCreateDependentChainParams(params);
	const validationError = validateParams(normalizedParams, true);
	if (validationError) return failedResult(validationError.code, validationError.message);

	const identityBeforeResolution = await readDatabaseIdentity(options);
	if (!identityBeforeResolution.ok) return cliFailureResult(identityBeforeResolution.result);
	const provider = await resolveProvider(normalizedParams, options);
	if (!provider.ok) return failedResult(provider.code, provider.message, provider.details);
	const identityAfterResolution = await readDatabaseIdentity(options);
	if (!identityAfterResolution.ok) return cliFailureResult(identityAfterResolution.result);
	if (identityBeforeResolution.identity.fingerprint !== identityAfterResolution.identity.fingerprint) {
		return failedResult("database_changed", "ASCET database changed during Provider resolution.");
	}

	const definition = createBridgeDefinition(normalizedParams, provider.provider.componentPath);
	let latestBridge: ConfigureParameterDependencyChainResult | undefined;
	const collectPreflight = async (): Promise<AscetMutationPreflightResult> => {
		const collected = await collectCreateDependentChainPreflight(definition, options);
		latestBridge = collected.bridge;
		return collected.result;
	};
	const permission = resolveAscetPermissionSnapshot(ctx);
	const guarded = await runGuardedAscetMutation({
		action: "create_dependent_chain",
		intent: normalizedParams.intent,
		permissionMode: permission.mode,
		rules: permission.rules,
		signal: options.signal,
		ctx,
		maxMaterialChanges: 0,
		materialChangeError: {
			code: "target_state_changed",
			message: "ASCET dependency-chain state changed after approval.",
		},
		preflight: collectPreflight,
		execute: async (evidence) => {
			const beforeState = evidence.capability.evidence.beforeState;
			if (!isRecord(beforeState)) {
				return {
					mutationStatus: "not_started",
					verificationStatus: "not_applicable",
					error: {
						code: "target_state_changed",
						message: "Authoritative before-state snapshot is unavailable.",
					},
				};
			}
			const bridge = await runConfigureParameterDependencyChainBridge(definition, options, {
				intent: "apply",
				expectedBeforeState: beforeState,
				acquireEditability: evidence.editability.status === "read_only",
			});
			latestBridge = bridge;
			return bridgeExecutionResult(bridge);
		},
	});

	const content = compactResult(normalizedParams.intent, guarded, latestBridge);
	const error = guarded.error;
	return {
		content: [{ type: "text", text: JSON.stringify(content) }],
		details: {
			outcome: createOutcome(normalizedParams.intent, content, guarded),
			mutationResult: guarded,
			...(error ? { error } : {}),
			provider: provider.provider.diagnostics,
			diagnostics: latestBridge,
		},
	};
}

function readCanonicalDependencyResult(
	bridge: ConfigureParameterDependencyChainResult,
):
	| Pick<
			AscetMutationResultEnvelope,
			| "changed"
			| "mutationStatus"
			| "saveAttempted"
			| "saveSucceeded"
			| "saveState"
			| "verified"
			| "verificationStatus"
			| "verificationMode"
			| "sessionCount"
			| "saveCount"
			| "editableRetryCount"
			| "nativeMutationAttemptCount"
	  >
	| undefined {
	const canonical = readCanonicalMutationEvidence(bridge);
	if (!canonical || canonical.outcome !== "succeeded") return undefined;
	return canonical;
}

function publicErrorResult(
	code: string,
	message: string,
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	path?: string,
	decision?: ReturnType<typeof evaluateAscetPermission>,
	params?: AscetCreateDependentChainParams,
): AscetCreateDependentChainResult {
	return publicNotStartedResult("error", code, message, permission, path, decision, params);
}

function publicBlockedResult(
	code: string,
	message: string,
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	decision: ReturnType<typeof evaluateAscetPermission>,
	params: AscetCreateDependentChainParams,
): AscetCreateDependentChainResult {
	return publicNotStartedResult("blocked", code, message, permission, params.consumer.componentPath, decision, params);
}

function publicNotStartedResult(
	status: "error" | "blocked",
	code: string,
	message: string,
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	path?: string,
	decision?: ReturnType<typeof evaluateAscetPermission>,
	params?: AscetCreateDependentChainParams,
): AscetCreateDependentChainResult {
	const databaseFingerprintKnown = permission.databaseFingerprint !== undefined;
	const permissionEvidence: AscetMutationResultEnvelope["permission"] =
		params && decision
			? createChainPermissionEvidence(permission, decision, params)
			: {
					mode: permission.mode,
					decision: decision?.behavior ?? "not_evaluated",
					...(decision ? { risk: decision.risk, reason: decision.reason, rule: decision.rule } : {}),
					...(path ? { path } : {}),
					databaseFingerprintKnown,
					databaseFingerprintSource:
						permission.databaseFingerprintSource ?? (databaseFingerprintKnown ? "caller" : "unavailable"),
					evidenceComplete: false,
					impactUnknown: true,
				};
	const mutationResult: AscetMutationResultEnvelope = {
		outcome: "failed",
		status,
		changed: false,
		mutationStatus: "not_started",
		saveAttempted: false,
		saveSucceeded: false,
		saveState: "not_required",
		verified: false,
		verificationStatus: "not_applicable",
		verificationMode: "not_applicable",
		sessionCount: 0,
		saveCount: 0,
		editableRetryCount: 0,
		nativeMutationAttemptCount: 0,
		permission: permissionEvidence,
		preflight: { status: decision ? "not_run" : "failed" },
		editability: { status: "not_applicable" },
		mutation: { status: "not_started" },
		verification: { status: "not_applicable" },
		error: { code, message },
		bridge: { beforeBridge: false, bridgeEntered: false, backendResponseReceived: false },
		recovery: { required: false, actions: [] },
		audit: createChainAudit(permission),
	};
	return {
		content: [{ type: "text", text: JSON.stringify(mutationResult) }],
		details: {
			outcome:
				status === "blocked" ? { status: "blocked", code, message } : { status: "error", error: { code, message } },
			mutationResult,
			error: { code, message },
		},
	};
}

function createChainPermissionEvidence(
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	decision: ReturnType<typeof evaluateAscetPermission>,
	params: AscetCreateDependentChainParams,
): AscetMutationResultEnvelope["permission"] {
	const databaseFingerprintKnown = permission.databaseFingerprint !== undefined;
	return {
		mode: permission.mode,
		decision: decision.behavior,
		risk: decision.risk,
		reason: decision.reason,
		...(decision.rule ? { rule: decision.rule } : {}),
		path: params.consumer.componentPath,
		databaseFingerprintKnown,
		databaseFingerprintSource:
			permission.databaseFingerprintSource ?? (databaseFingerprintKnown ? "caller" : "unavailable"),
		evidenceComplete: params.binding.variantPolicy !== "all",
		targetCount: 2,
		...(params.binding.variantPolicy === "all" ? {} : { variantCount: params.binding.variants?.length ?? 1 }),
		impactUnknown: params.binding.variantPolicy === "all",
	};
}

function createChainAudit(
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	approvedAt?: string,
): NonNullable<AscetMutationResultEnvelope["audit"]> {
	const databaseFingerprintKnown = permission.databaseFingerprint !== undefined;
	return {
		databaseFingerprintKnown,
		databaseFingerprintSource:
			permission.databaseFingerprintSource ?? (databaseFingerprintKnown ? "caller" : "unavailable"),
		...(permission.databaseFingerprint ? { databaseFingerprint: permission.databaseFingerprint } : {}),
		...(approvedAt ? { approvedAt } : {}),
	};
}

function publicBridgeFailureResult(
	bridge: ConfigureParameterDependencyChainResult,
	permission: ReturnType<typeof resolveAscetPermissionSnapshot>,
	decision: ReturnType<typeof evaluateAscetPermission>,
	params: AscetCreateDependentChainParams,
	code: string,
	message: string,
	approvedAt?: string,
	bridgeLifecycle: { beforeBridge: boolean; bridgeEntered: boolean; backendResponseReceived: boolean } = {
		beforeBridge: true,
		bridgeEntered: true,
		backendResponseReceived: true,
	},
): AscetCreateDependentChainResult {
	const evidence = readCanonicalMutationEvidence(bridge);
	const mutationStatus =
		evidence?.mutationStatus ??
		(bridge.status === "rolled_back"
			? "rolled_back"
			: bridge.status === "rollback_failed"
				? "partially_applied"
				: bridge.mutationStarted
					? "unknown"
					: "not_started");
	const verificationStatus = evidence?.verificationStatus ?? (bridge.mutationStarted ? "unknown" : "not_applicable");
	const recoveryRecord = isRecord(bridge.rollback) ? bridge.rollback : undefined;
	const recoveryRequired =
		recoveryRecord?.required === true || mutationStatus === "partially_applied" || mutationStatus === "unknown";
	const recoveryActions = Array.isArray(recoveryRecord?.actions)
		? recoveryRecord.actions.filter((value): value is string => typeof value === "string" && value.trim().length > 0)
		: [];
	if (recoveryRequired && recoveryActions.length === 0) {
		recoveryActions.push("Re-read both dependency-chain endpoints and reconcile the final state before retrying.");
	}
	const status: AscetMutationResultEnvelope["status"] =
		mutationStatus === "rolled_back"
			? "rolled_back"
			: mutationStatus === "partially_applied"
				? "partial"
				: mutationStatus === "unknown"
					? "unknown"
					: "error";
	const mutationResult: AscetMutationResultEnvelope = {
		outcome: "failed",
		status,
		changed: evidence?.changed ?? bridge.writesPerformed,
		mutationStatus,
		saveAttempted: evidence?.saveAttempted ?? false,
		saveSucceeded: evidence?.saveSucceeded ?? false,
		saveState: evidence?.saveState ?? (mutationStatus === "not_started" ? "not_required" : "unknown"),
		verified: evidence?.verified ?? false,
		verificationStatus,
		verificationMode:
			evidence?.verificationMode ??
			(bridge.mutationStarted ? "same_session_dependency_endpoints" : "not_applicable"),
		sessionCount: evidence?.sessionCount ?? (bridgeLifecycle.bridgeEntered ? 1 : 0),
		saveCount: evidence?.saveCount ?? 0,
		editableRetryCount: evidence?.editableRetryCount ?? 0,
		nativeMutationAttemptCount: evidence?.nativeMutationAttemptCount ?? (bridge.mutationStarted ? 1 : 0),
		permission: createChainPermissionEvidence(permission, decision, params),
		preflight: { status: "not_run" },
		editability: { status: bridge.mutationStarted ? "unknown" : "not_applicable" },
		mutation: { status: mutationStatus },
		verification: { status: verificationStatus },
		error: { code, message },
		bridge: bridgeLifecycle,
		recovery: { required: recoveryRequired, actions: recoveryActions },
		audit: createChainAudit(permission, approvedAt),
	};
	return {
		content: [{ type: "text", text: JSON.stringify(mutationResult) }],
		details: {
			outcome: { status: "error", error: { code, message } },
			mutationResult,
			error: { code, message },
			diagnostics: bridge,
		},
	};
}

function normalizeCreateDependentChainParams<
	T extends AscetCreateDependentChainParams | AscetLegacyCreateDependentChainParams,
>(params: T): T {
	const providerComponentPath = params.provider.componentPath;
	return {
		...params,
		provider: {
			...params.provider,
			...(params.provider.projectPath === undefined
				? {}
				: { projectPath: normalizeAscetPath(params.provider.projectPath.trim()) }),
			...(providerComponentPath === undefined
				? {}
				: { componentPath: normalizeAscetPath(providerComponentPath.trim()) }),
			element: {
				...params.provider.element,
				name: params.provider.element.name.trim(),
				modelType: params.provider.element.modelType.trim(),
			},
		},
		consumer: {
			...params.consumer,
			...(params.consumer.projectPath === undefined
				? {}
				: { projectPath: normalizeAscetPath(params.consumer.projectPath.trim()) }),
			componentPath: normalizeAscetPath(params.consumer.componentPath.trim()),
			importedElement: {
				...params.consumer.importedElement,
				name: params.consumer.importedElement.name.trim(),
				modelType: params.consumer.importedElement.modelType.trim(),
			},
			localElement: {
				...params.consumer.localElement,
				name: params.consumer.localElement.name.trim(),
				modelType: params.consumer.localElement.modelType.trim(),
			},
		},
		binding: {
			...params.binding,
			formula: params.binding.formula.trim(),
			formal: params.binding.formal.trim(),
			...(params.binding.variants ? { variants: params.binding.variants.map((variant) => variant.trim()) } : {}),
		},
	} as T;
}

function validateParams(
	params: AscetCreateDependentChainParams | AscetLegacyCreateDependentChainParams,
	allowLegacy = false,
): { code: string; message: string } | undefined {
	const schemaCandidate = allowLegacy
		? {
				...params,
				provider: {
					...params.provider,
					componentPath: params.provider.componentPath ?? "__legacy_provider_resolution__",
				},
				intent: "apply",
			}
		: params;
	if (!Value.Check(ascetCreateDependentChainActionSchema, schemaCandidate)) {
		return {
			code: "element_definition_invalid",
			message: "Invalid create_dependent_chain request; unknown and incomplete fields are rejected.",
		};
	}
	if (!/^[A-Za-z_][A-Za-z0-9_]*$/u.test(params.binding.formal)) {
		return { code: "binding_invalid", message: "binding.formal must be a valid ASCET identifier." };
	}
	const escapedFormal = params.binding.formal.replace(/[.*+?^${}()|[\]\\]/gu, "\\$&");
	if (!new RegExp(`(^|[^A-Za-z0-9_])${escapedFormal}([^A-Za-z0-9_]|$)`, "u").test(params.binding.formula)) {
		return { code: "binding_invalid", message: "binding.formula must reference binding.formal." };
	}
	if (params.binding.variantPolicy === "selected" && !params.binding.variants?.length) {
		return { code: "binding_invalid", message: 'binding.variants is required for variantPolicy="selected".' };
	}
	if (params.binding.variantPolicy !== "selected" && params.binding.variants !== undefined) {
		return { code: "binding_invalid", message: "binding.variants is only valid for selected variants." };
	}
	if (!/^P_.+/u.test(params.provider.element.name)) {
		return { code: "provider_parameter_name_invalid", message: "provider.element.name must use P_<Name>." };
	}
	if (!/^P_.+/u.test(params.consumer.importedElement.name)) {
		return { code: "imported_parameter_name_invalid", message: "consumer.importedElement.name must use P_<Name>." };
	}
	if (params.provider.element.name !== params.consumer.importedElement.name) {
		return {
			code: "provider_imported_parameter_name_mismatch",
			message: "Provider Exported and Consumer Imported Parameter names must match exactly.",
		};
	}
	if (!/^C_.+/u.test(params.consumer.localElement.name)) {
		return { code: "local_parameter_name_invalid", message: "consumer.localElement.name must use C_<Name>." };
	}
	const providerFormulaError = validateImplementationProjectContext(
		"provider",
		params.provider.element.implementation,
		params.provider.projectPath,
	);
	if (providerFormulaError) return providerFormulaError;
	const localFormulaError = validateImplementationProjectContext(
		"local",
		params.consumer.localElement.implementation,
		params.consumer.projectPath,
	);
	if (localFormulaError) return localFormulaError;
	if (params.provider.element.modelType.toLowerCase() !== params.consumer.importedElement.modelType.toLowerCase()) {
		return {
			code: "provider_incompatible",
			message: "Provider and Consumer Imported Parameter model types must match.",
		};
	}
	return undefined;
}

function validateImplementationProjectContext(
	target: "provider" | "local",
	implementation: AscetCreateDependentChainExplicitImplementation,
	projectPath: string | undefined,
): { code: string; message: string } | undefined {
	const formula = implementation.formula.trim();
	if (formula.length === 0) {
		return {
			code: "element_definition_invalid",
			message: `${target} implementation.formula must not be empty.`,
		};
	}
	if (formula.toLowerCase() !== "ident" && !projectPath?.trim()) {
		return {
			code: "project_context_required",
			message: `${target}.projectPath is required when ${target} implementation.formula is not ident.`,
		};
	}
	return undefined;
}

async function resolveProvider(
	params: AscetCreateDependentChainParams | AscetLegacyCreateDependentChainParams,
	options: ConfigureParameterDependencyChainOptions,
): Promise<
	| { ok: true; provider: ResolvedProvider }
	| { ok: false; code: string; message: string; details?: Record<string, unknown> }
> {
	if (params.provider.componentPath) {
		return {
			ok: true,
			provider: {
				componentPath: normalizeAscetPath(params.provider.componentPath),
				diagnostics: { source: "explicit" },
			},
		};
	}

	const elementName = params.provider.element.name;
	const search = await runAscetSearch({ mode: "element", q: elementName, limit: PROVIDER_SEARCH_LIMIT }, options);
	const normalized = normalizeAscetSearchResult(
		{ mode: "element", q: elementName, limit: PROVIDER_SEARCH_LIMIT },
		search,
	);
	if (!normalized.ok) {
		return { ok: false, code: normalized.error.code, message: normalized.error.message };
	}
	if (normalized.data.more) {
		return {
			ok: false,
			code: "provider_ambiguous",
			message: `Element Search exceeded the ${PROVIDER_SEARCH_LIMIT}-candidate validation limit.`,
		};
	}
	const candidatePaths = [
		...new Set(
			normalized.data.items.flatMap((item) => {
				if (typeof item !== "string") return [];
				const path = parseAscetElementSearchHint(item, elementName);
				return path ? [path] : [];
			}),
		),
	];
	const valid: string[] = [];
	for (const componentPath of candidatePaths) {
		const read = await runAscetReadElement({ componentPath, elementName }, options);
		const element = exactElement(read);
		if (
			readString(element, "kind")?.toLowerCase() === "parameter" &&
			readString(element, "scope")?.toLowerCase() === "exported" &&
			readString(element, "modelType")?.toLowerCase() === params.provider.element.modelType.toLowerCase()
		) {
			valid.push(componentPath);
		}
	}
	if (valid.length === 0) {
		return {
			ok: false,
			code: "provider_not_found",
			message: `No exact compatible Exported Parameter '${elementName}' was found.`,
		};
	}
	if (valid.length > 1) {
		return {
			ok: false,
			code: "provider_ambiguous",
			message: `Multiple compatible Exported Parameters named '${elementName}' were found.`,
			details: { candidates: valid.map((path) => `${path}\\${elementName}`) },
		};
	}
	return {
		ok: true,
		provider: {
			componentPath: valid[0],
			diagnostics: { source: "search", candidatesValidated: candidatePaths.length },
		},
	};
}

function createBridgeDefinition(
	params: AscetCreateDependentChainParams | AscetLegacyCreateDependentChainParams,
	providerComponentPath: string,
) {
	const provider: AscetProviderExportedParameterCreateInput = {
		role: "providerExportedParameter",
		...params.provider.element,
	};
	const consumer: AscetConsumerImportedParameterCreateInput = {
		role: "consumerImportedParameter",
		...params.consumer.importedElement,
	};
	const local: AscetLocalDependentParameterCreateInput = {
		role: "localDependentParameter",
		...params.consumer.localElement,
	};
	return {
		provider: {
			componentPath: providerComponentPath,
			...(params.provider.projectPath ? { projectPath: normalizeAscetPath(params.provider.projectPath) } : {}),
			element: provider,
		},
		consumer: {
			componentPath: normalizeAscetPath(params.consumer.componentPath),
			...(params.consumer.projectPath ? { projectPath: normalizeAscetPath(params.consumer.projectPath) } : {}),
			element: consumer,
		},
		local: {
			componentPath: normalizeAscetPath(params.consumer.componentPath),
			...(params.consumer.projectPath ? { projectPath: normalizeAscetPath(params.consumer.projectPath) } : {}),
			element: local,
		},
		dependency: {
			formula: params.binding.formula,
			formals: [params.binding.formal],
			bindingPolicy: "explicit" as const,
			mappings: {
				[params.binding.formal]: { kind: "parameter" as const, name: params.consumer.importedElement.name },
			},
			variantPolicy: params.binding.variantPolicy,
			...(params.binding.variants ? { variants: params.binding.variants } : {}),
		},
	};
}

/** @internal Legacy/recovery-only preview used exclusively by runLegacyAscetCreateDependentChain. */
async function collectCreateDependentChainPreflight(
	definition: ReturnType<typeof createBridgeDefinition>,
	options: ConfigureParameterDependencyChainOptions,
): Promise<CollectedPreflight> {
	const identity = await readDatabaseIdentity(options);
	if (!identity.ok) {
		return {
			result: {
				status: "failed",
				code: identity.result.error?.code ?? "database_identity_required",
				message: identity.result.error?.message ?? "ASCET database identity is unavailable.",
				mutationStatus: "not_started",
				raw: identity.result,
			},
		};
	}
	const bridge = await runConfigureParameterDependencyChainBridge(definition, options, { intent: "preview" });
	if (bridge.status !== "preview" && bridge.status !== "no_change") {
		const failure = bridgeFailure(bridge);
		return {
			bridge,
			result: {
				status: "failed",
				code: failure.code,
				message: failure.message,
				mutationStatus: "not_started",
				raw: bridge,
			},
		};
	}
	const beforeState = isRecord(bridge.beforeState) ? bridge.beforeState : undefined;
	const targets = readBridgeTargets(bridge);
	const consumerTarget = targets.find(
		(target) => normalizeComparablePath(target.path) === normalizeComparablePath(definition.consumer.componentPath),
	);
	if (!beforeState || !consumerTarget?.oid || targets.some((target) => !target.oid)) {
		return {
			bridge,
			result: {
				status: "failed",
				code: "element_definition_invalid",
				message: "Bridge preview did not return complete target identity or before-state snapshot.",
				mutationStatus: "not_started",
				raw: bridge,
			},
		};
	}
	const effects = bridgeEffects(bridge, definition);
	const noOp = bridge.noOp === true || effects.length === 0;
	const impactFingerprint = fingerprintAscetValue(
		targets.map((target) => ({ path: normalizeAscetPath(target.path), oid: target.oid })),
	);
	const evidence = createAscetMutationPreflightEvidence({
		action: "create_dependent_chain",
		params: definition,
		database: identity.identity,
		target: { path: definition.consumer.componentPath, oid: consumerTarget.oid, kind: "component" },
		impact: {
			complete: true,
			sharedObject: targets.length > 1,
			ownerPath: definition.consumer.componentPath,
			affectedProjects: [],
			fingerprint: impactFingerprint,
		},
		capability: {
			status: "supported",
			operation: BRIDGE_OPERATION,
			evidence: { beforeState },
		},
		editability: {
			applicable: true,
			status: targets.every((target) => target.editable) ? "editable" : "read_only",
			canRequestEditable: true,
		},
		effects,
		verification: {
			available: true,
			operation: "read_dependent_chain",
			target: {
				componentPath: definition.consumer.componentPath,
				dependentElement: definition.local.element.name,
				exporterComponentPath: definition.provider.componentPath,
			},
		},
		riskModifiers: [
			"minimum_risk:medium",
			...(definition.dependency.variants ? [`variant_count:${definition.dependency.variants.length}`] : []),
		],
		noOp,
	});
	return { bridge, result: { status: "passed", evidence, raw: bridge } };
}

async function readDatabaseIdentity(
	options: ConfigureParameterDependencyChainOptions,
): Promise<{ ok: true; identity: DatabaseIdentitySnapshot } | { ok: false; result: AscetCliJsonResult }> {
	const result = await runAscetGet(
		{ action: "database_identity" },
		{
			cwd: options.cwd,
			env: options.env,
			signal: options.signal,
			timeoutMs: options.timeoutMs,
			agentId: options.agentId,
			scheduler: options.scheduler,
			executeCli: options.executeCli,
		},
	);
	if (!result.ok) return { ok: false, result };
	const payload = getPayload(result.data);
	const identity = payload ? getAscetDatabaseIdentity(payload) : undefined;
	if (!identity) {
		return {
			ok: false,
			result: {
				...result,
				ok: false,
				data: null,
				error: { code: "database_identity_required", message: "ASCET database identity is unavailable." },
			},
		};
	}
	return { ok: true, identity: { path: identity.path, fingerprint: identity.fingerprint } };
}

function bridgeEffects(
	bridge: ConfigureParameterDependencyChainResult,
	definition: ReturnType<typeof createBridgeDefinition>,
): AscetPlannedEffect[] {
	const effects: AscetPlannedEffect[] = [];
	for (const stage of readStages(bridge)) {
		const name = readString(stage, "stage");
		const status = readString(stage, "status");
		if (!name || (status !== "create" && status !== "configure" && status !== "pending")) continue;
		const target =
			name === "provider"
				? `${definition.provider.componentPath}\\${definition.provider.element.name}`
				: name === "consumer"
					? `${definition.consumer.componentPath}\\${definition.consumer.element.name}`
					: name === "local"
						? `${definition.local.componentPath}\\${definition.local.element.name}`
						: `${definition.local.componentPath}\\${definition.local.element.name}`;
		effects.push({
			kind: "create_dependent_chain",
			target,
			description:
				name === "dependency"
					? `Configure dependency for ${target}`
					: `Create ${name === "consumer" ? "imported" : name} Element ${target}`,
		});
	}
	return effects;
}

function bridgeExecutionResult(bridge: ConfigureParameterDependencyChainResult): AscetGuardedMutationExecutionResult {
	if (bridge.status === "committed") {
		return {
			mutationStatus: bridge.mutationStarted ? "applied" : "no_op",
			verificationStatus: readVerificationPassed(bridge) ? "passed" : "failed",
			editabilityStatus: { status: "editable", finalEditableState: "editable" },
			...(readVerificationPassed(bridge)
				? {}
				: { error: { code: "readback_mismatch", message: "Automatic dependency-chain readback failed." } }),
			raw: bridge,
		};
	}
	if (bridge.status === "no_change") {
		return {
			mutationStatus: "no_op",
			verificationStatus: readVerificationPassed(bridge) ? "passed" : "failed",
			editabilityStatus: { status: "editable", finalEditableState: "editable" },
			raw: bridge,
		};
	}
	if (bridge.status === "rolled_back") {
		return {
			mutationStatus: "rolled_back",
			verificationStatus: "failed",
			error: { code: "rolled_back", message: bridgeErrorMessage(bridge, "Mutation failed and was rolled back.") },
			raw: bridge,
		};
	}
	if (bridge.status === "rollback_failed") {
		return {
			mutationStatus: "partially_applied",
			verificationStatus: "failed",
			error: { code: "rollback_failed", message: bridgeErrorMessage(bridge, "Rollback failed.") },
			raw: bridge,
		};
	}
	if (bridge.status === "unknown_outcome") {
		return {
			mutationStatus: "unknown",
			verificationStatus: "unknown",
			error: { code: "unknown_outcome", message: bridgeErrorMessage(bridge, "Final ASCET state is unknown.") },
			raw: bridge,
		};
	}
	const failure = bridgeFailure(bridge);
	return {
		mutationStatus: "not_started",
		verificationStatus: "not_applicable",
		error: failure,
	};
}

function compactResult(
	intent: "preview" | "apply",
	guarded: AscetMutationResultEnvelope,
	bridge: ConfigureParameterDependencyChainResult | undefined,
): Record<string, unknown> {
	if (guarded.status !== "ok") {
		return { ok: false, code: publicErrorCode(guarded), ...publicFailureContext(bridge) };
	}
	if (intent === "preview") {
		const effects = previewEffects(bridge);
		return effects.create.length === 0 && effects.configure.length === 0
			? { ok: true, changed: false, idempotent: true }
			: { ok: true, changed: true, effects };
	}
	if (guarded.mutation.status === "no_op") {
		return { ok: true, changed: false, idempotent: true, verified: true };
	}
	const changed = appliedEffects(bridge);
	return {
		ok: true,
		changed: true,
		verified: guarded.verification.status === "passed",
		...(changed.created.length > 0 ? { created: changed.created } : {}),
		...(changed.configured.length > 0 ? { configured: changed.configured } : {}),
	};
}

function createOutcome(
	intent: "preview" | "apply",
	content: Record<string, unknown>,
	guarded: AscetMutationResultEnvelope,
): AscetToolOutcome {
	if (guarded.status === "ok") {
		return intent === "preview"
			? { status: "preflight", plan: content, nextStep: "Preview complete. No ASCET mutation was performed." }
			: { status: "ok", data: content, warnings: [], verified: guarded.verification.status === "passed" };
	}
	const error = guarded.error ?? { code: publicErrorCode(guarded), message: "ASCET dependency-chain edit failed." };
	if (guarded.status === "blocked") return { status: "blocked", code: error.code, message: error.message };
	if (guarded.status === "partial" || guarded.status === "rolled_back" || guarded.status === "unknown") {
		return { status: "partial", data: content, failures: [{ code: error.code, message: error.message }] };
	}
	return { status: "error", error };
}

function previewEffects(bridge: ConfigureParameterDependencyChainResult | undefined): {
	create: string[];
	configure: string[];
} {
	const create: string[] = [];
	const configure: string[] = [];
	for (const stage of readStages(bridge)) {
		const name = readString(stage, "stage");
		const status = readString(stage, "status");
		if (status === "create" && name) create.push(name === "consumer" ? "consumer.imported" : name);
		if (status === "configure" && name === "dependency") configure.push("dependency");
	}
	return { create, configure };
}

function appliedEffects(bridge: ConfigureParameterDependencyChainResult | undefined): {
	created: string[];
	configured: string[];
} {
	const created: string[] = [];
	const configured: string[] = [];
	for (const stage of readStages(bridge)) {
		const name = readString(stage, "stage");
		const status = readString(stage, "status");
		if (status === "created" && name) created.push(name === "consumer" ? "imported" : name);
		if (status === "configured" && name === "dependency") configured.push("dependency");
	}
	return { created, configured };
}

function publicErrorCode(guarded: AscetMutationResultEnvelope): string {
	if (guarded.status === "rolled_back") return "rolled_back";
	if (guarded.status === "unknown") return "unknown_outcome";
	return guarded.error?.code ?? (guarded.status === "partial" ? "rollback_failed" : "write_rejected");
}

function publicFailureContext(bridge: ConfigureParameterDependencyChainResult | undefined): Record<string, unknown> {
	const failure = bridgeFailure(bridge);
	const conflict = Array.isArray(bridge?.conflicts) ? bridge.conflicts.find(isRecord) : undefined;
	const target = readString(conflict, "stage");
	const candidates =
		isRecord(bridge?.error?.details) && Array.isArray(bridge.error.details.candidates)
			? bridge.error.details.candidates
			: undefined;
	return {
		...(target ? { target: target === "consumer" ? "consumer.imported" : target } : {}),
		...(candidates ? { candidates } : {}),
		...(failure.code === "element_conflict" && target ? { target } : {}),
	};
}

function bridgeFailure(bridge: ConfigureParameterDependencyChainResult | undefined): { code: string; message: string } {
	if (!bridge) return { code: "write_rejected", message: "ASCET dependency-chain operation failed." };
	if (bridge.error) return { code: bridge.error.code, message: bridge.error.message };
	const conflict = Array.isArray(bridge.conflicts) ? bridge.conflicts.find(isRecord) : undefined;
	const stage = readString(conflict, "stage");
	if (stage) {
		return {
			code: stage === "dependency" ? "dependency_conflict" : "element_conflict",
			message: readString(conflict, "message") ?? "Existing ASCET state conflicts with the request.",
		};
	}
	return { code: "write_rejected", message: "ASCET dependency-chain operation was rejected." };
}

function bridgeErrorMessage(bridge: ConfigureParameterDependencyChainResult, fallback: string): string {
	if (bridge.error?.message) return bridge.error.message;
	const original = isRecord(bridge.originalError) ? bridge.originalError : undefined;
	return readString(original, "message") ?? fallback;
}

function readVerificationPassed(bridge: ConfigureParameterDependencyChainResult): boolean {
	const verification = isRecord(bridge.verification) ? bridge.verification : undefined;
	return readString(verification, "status") === "passed" && verification?.verified === true;
}

function readBridgeTargets(bridge: ConfigureParameterDependencyChainResult): BridgeTarget[] {
	if (!Array.isArray(bridge.targets)) return [];
	return bridge.targets.flatMap((value) => {
		if (!isRecord(value)) return [];
		const path = readString(value, "path");
		const oid = readString(value, "oid");
		if (!path || !oid) return [];
		return [{ path, oid, editable: value.editable === true }];
	});
}

function readStages(bridge: ConfigureParameterDependencyChainResult | undefined): JsonRecord[] {
	return Array.isArray(bridge?.stages) ? bridge.stages.filter(isRecord) : [];
}

function exactElement(result: AscetCliJsonResult): JsonRecord | undefined {
	if (!result.ok) return undefined;
	const payload = getPayload(result.data);
	return isRecord(payload?.element) ? payload.element : undefined;
}

function cliFailureResult(result: AscetCliJsonResult): AscetCreateDependentChainResult {
	return failedResult(
		result.error?.code ?? "write_rejected",
		result.error?.message ?? "ASCET dependency-chain operation failed.",
		{ raw: result },
	);
}

function failedResult(
	code: string,
	message: string,
	details: Record<string, unknown> = {},
): AscetCreateDependentChainResult {
	const content = {
		ok: false,
		code,
		...(Array.isArray(details.candidates) ? { candidates: details.candidates } : {}),
	};
	return {
		content: [{ type: "text", text: JSON.stringify(content) }],
		details: {
			outcome: { status: "error", error: { code, message } },
			error: { code, message },
			diagnostics: details,
		},
	};
}

function getPayload(data: unknown): JsonRecord | undefined {
	const payload = unwrapToolSuccessPayload(data);
	return isRecord(payload) ? payload : undefined;
}

function normalizeComparablePath(value: string): string {
	return normalizeAscetPath(value).toLowerCase();
}

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

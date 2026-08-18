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
import type {
	AscetConsumerImportedParameterCreateInput,
	AscetLocalDependentParameterCreateInput,
	AscetProviderExportedParameterCreateInput,
} from "./element-spec-contract.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "./get.ts";
import {
	type AscetCreateDependentChainParams,
	ascetCreateDependentChainActionSchema,
} from "./tools/actions/contracts/dependency.ts";

export {
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
	const validationError = validateParams(params);
	if (validationError) return failedResult(validationError.code, validationError.message);
	if (params.intent !== "apply") {
		return failedResult(
			"ascet_edit_invalid_parameter",
			"intent=preview is retired for create_dependent_chain; use intent=apply for direct execution.",
		);
	}
	if (!params.provider.componentPath) {
		return failedResult(
			"provider_path_required",
			"create_dependent_chain requires provider.componentPath; provider Search is not part of the normal write route.",
		);
	}

	const permission = resolveAscetPermissionSnapshot(ctx);
	const descriptor = getAscetEditAction("create_dependent_chain")?.permission;
	if (!descriptor) throw new Error("Missing create_dependent_chain permission descriptor.");
	const decision = evaluateAscetPermission({
		mode: permission.mode,
		action: "create_dependent_chain",
		descriptor,
		rules: permission.rules,
		path: normalizeAscetPath(params.consumer.componentPath),
		hardGatesPassed: true,
		evidenceComplete: true,
		targetCount: 2,
		variantCount: params.binding.variants?.length ?? 1,
	});
	if (decision.behavior === "deny") return failedResult("ascet_edit_permission_denied", decision.reason);

	let approvedAt: string | undefined;
	if (decision.behavior === "ask") {
		const approval = await requestAscetEditApproval(
			{
				title: "Confirm ASCET dependency-chain edit",
				message: `Target: ${normalizeAscetPath(params.consumer.componentPath)}`,
				signal: options.signal,
			},
			ctx,
		);
		if (!approval.approved) return blockedResult(approval.code, approval.message);
		approvedAt = approval.approvedAt;
	}

	const bridge = await runConfigureParameterDependencyChainBridge(
		createBridgeDefinition(params, normalizeAscetPath(params.provider.componentPath)),
		options,
		{ intent: "apply", acquireEditability: false },
	);
	const canonical = readCanonicalDependencyResult(bridge);
	if (!canonical) {
		const failure = bridgeFailure(bridge);
		return failedResult(
			bridge.status === "committed" || bridge.status === "no_change"
				? "ascet_edit_canonical_evidence_invalid"
				: failure.code,
			bridge.status === "committed" || bridge.status === "no_change"
				? "Dependency-chain write omitted or contradicted canonical mutation, Save, verification, or session evidence."
				: failure.message,
			{ bridge },
		);
	}

	const effects = appliedEffects(bridge);
	const content = {
		ok: true as const,
		changed: canonical.changed,
		verified: canonical.verified,
		created: effects.created,
		configured: effects.configured,
	};
	const mutationResult: AscetMutationResultEnvelope = {
		status: "ok",
		...canonical,
		permission: {
			mode: permission.mode,
			decision: decision.behavior,
			risk: decision.risk,
			reason: decision.reason,
			...(decision.rule ? { rule: decision.rule } : {}),
		},
		preflight: { status: "not_run" },
		editability: { status: "not_applicable" },
		mutation: { status: canonical.mutationStatus },
		verification: { status: "passed" },
		bridge: { beforeBridge: true, bridgeEntered: true, backendResponseReceived: true },
		recovery: { required: false, actions: [] },
		...(approvedAt ? { audit: { approvedAt } } : {}),
		raw: bridge,
	};
	return {
		content: [{ type: "text", text: JSON.stringify(content) }],
		details: {
			outcome: { status: "ok", data: content, warnings: [] },
			mutationResult,
			provider: { source: "explicit" },
			diagnostics: bridge,
		},
	};
}

export async function runLegacyAscetCreateDependentChain(
	params: AscetCreateDependentChainParams,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetCreateDependentChainContext,
): Promise<AscetCreateDependentChainResult> {
	const validationError = validateParams(params);
	if (validationError) return failedResult(validationError.code, validationError.message);

	const identityBeforeResolution = await readDatabaseIdentity(options);
	if (!identityBeforeResolution.ok) return cliFailureResult(identityBeforeResolution.result);
	const provider = await resolveProvider(params, options);
	if (!provider.ok) return failedResult(provider.code, provider.message, provider.details);
	const identityAfterResolution = await readDatabaseIdentity(options);
	if (!identityAfterResolution.ok) return cliFailureResult(identityAfterResolution.result);
	if (identityBeforeResolution.identity.fingerprint !== identityAfterResolution.identity.fingerprint) {
		return failedResult("database_changed", "ASCET database changed during Provider resolution.");
	}

	const definition = createBridgeDefinition(params, provider.provider.componentPath);
	let latestBridge: ConfigureParameterDependencyChainResult | undefined;
	const collectPreflight = async (): Promise<AscetMutationPreflightResult> => {
		const collected = await collectCreateDependentChainPreflight(definition, options);
		latestBridge = collected.bridge;
		return collected.result;
	};
	const permission = resolveAscetPermissionSnapshot(ctx);
	const guarded = await runGuardedAscetMutation({
		action: "create_dependent_chain",
		intent: params.intent,
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

	const content = compactResult(params.intent, guarded, latestBridge);
	const error = guarded.error;
	return {
		content: [{ type: "text", text: JSON.stringify(content) }],
		details: {
			outcome: createOutcome(params.intent, content, guarded),
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
			| "verificationMode"
			| "sessionCount"
			| "saveCount"
			| "editableRetryCount"
			| "nativeMutationAttemptCount"
	  >
	| undefined {
	const changed = bridge.changed;
	const mutationStatus = bridge.mutationStatus;
	const saveAttempted = bridge.saveAttempted;
	const saveSucceeded = bridge.saveSucceeded;
	const saveState = bridge.saveState;
	const verified = bridge.verified;
	const verificationStatus = bridge.verificationStatus;
	const verificationMode = bridge.verificationMode;
	const sessionCount = bridge.sessionCount;
	const saveCount = bridge.saveCount;
	const editableRetryCount = bridge.editableRetryCount;
	const nativeMutationAttemptCount = bridge.nativeMutationAttemptCount;
	const common =
		verified === true &&
		verificationStatus === "passed" &&
		typeof verificationMode === "string" &&
		verificationMode.length > 0 &&
		sessionCount === 1 &&
		typeof editableRetryCount === "number" &&
		editableRetryCount >= 0 &&
		editableRetryCount <= 1;
	const applied =
		changed === true &&
		mutationStatus === "applied" &&
		saveAttempted === true &&
		saveSucceeded === true &&
		saveState === "saved" &&
		saveCount === 1 &&
		nativeMutationAttemptCount === 1;
	const noOp =
		changed === false &&
		mutationStatus === "no_op" &&
		saveAttempted === false &&
		saveState === "not_required" &&
		saveCount === 0 &&
		nativeMutationAttemptCount === 0;
	if (!common || (!applied && !noOp)) return undefined;
	return {
		changed,
		mutationStatus,
		saveAttempted,
		...(typeof saveSucceeded === "boolean" ? { saveSucceeded } : {}),
		saveState,
		verified,
		verificationMode,
		sessionCount,
		saveCount,
		editableRetryCount,
		nativeMutationAttemptCount,
	};
}

function blockedResult(code: string, message: string): AscetCreateDependentChainResult {
	return {
		content: [{ type: "text", text: JSON.stringify({ ok: false, code }) }],
		details: {
			outcome: { status: "blocked", code, message },
			error: { code, message },
		},
	};
}

function validateParams(params: AscetCreateDependentChainParams): { code: string; message: string } | undefined {
	if (!Value.Check(ascetCreateDependentChainActionSchema, params)) {
		return {
			code: "element_definition_invalid",
			message: "Invalid create_dependent_chain request; unknown and incomplete fields are rejected.",
		};
	}
	if (params.binding.variantPolicy === "selected" && !params.binding.variants?.length) {
		return { code: "binding_invalid", message: 'binding.variants is required for variantPolicy="selected".' };
	}
	if (params.binding.variantPolicy !== "selected" && params.binding.variants !== undefined) {
		return { code: "binding_invalid", message: "binding.variants is only valid for selected variants." };
	}
	if (params.provider.element.name !== params.consumer.importedElement.name) {
		return {
			code: "binding_invalid",
			message: "Provider Exported and Consumer Imported Parameter names must match exactly.",
		};
	}
	if (params.provider.element.modelType.toLowerCase() !== params.consumer.importedElement.modelType.toLowerCase()) {
		return {
			code: "provider_incompatible",
			message: "Provider and Consumer Imported Parameter model types must match.",
		};
	}
	return undefined;
}

async function resolveProvider(
	params: AscetCreateDependentChainParams,
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

function createBridgeDefinition(params: AscetCreateDependentChainParams, providerComponentPath: string) {
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
		provider: { componentPath: providerComponentPath, element: provider },
		consumer: { componentPath: normalizeAscetPath(params.consumer.componentPath), element: consumer },
		local: { componentPath: normalizeAscetPath(params.consumer.componentPath), element: local },
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
		raw: bridge,
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

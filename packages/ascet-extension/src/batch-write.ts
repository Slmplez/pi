import { Type } from "typebox";
import { Value } from "typebox/value";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliLifecycleEvent,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { type AscetToolOutcome, createPreflightOutcome } from "./core/results.ts";
import { withInlineCodeFile } from "./core/temp-files.ts";
import {
	type AscetEditApprovalContext,
	isAscetEditApprovalBlockedCode,
	requestAscetMutationApproval,
} from "./edit/approval.ts";
import {
	type AscetEditObservationTargetParams,
	checkAscetDatabaseIdentityForWrite,
	invalidateAscetEditObservations,
} from "./edit/common.ts";
import { getAscetEditAction } from "./edit/contract.ts";
import { runAscetEditability } from "./edit/editability.ts";
import { isAscetEditableWriteGateBlockedCode } from "./edit/editable-write-gate.ts";
import { fingerprintJson } from "./edit/element-spec-plan.ts";
import type {
	AscetMutationResultEnvelope,
	AscetMutationStatus,
	AscetVerificationStatus,
} from "./edit/mutation-result.ts";
import { type AscetTargetImpact, type AscetTargetImpactEntry, resolveAscetTargetImpact } from "./edit/target-impact.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "./get.ts";
import {
	type AscetCreateMethodComponentKind,
	type AscetCreateMethodKind,
	getDefaultCreateMethodKind,
	validateCreateMethodKindCompatibility,
} from "./method-kind-compatibility.ts";
import { evaluateAscetPermission } from "./permissions/evaluate.ts";
import {
	type AscetPermissionDecision,
	type AscetPermissionSnapshot,
	type PermissionMode,
	resolveAscetPermissionSnapshot,
} from "./permissions/types.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { createAscetStatusReport } from "./status.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

export type AscetBatchWriteOperation =
	| "batch_set_method_code"
	| "batch_set_element_spec"
	| "batch_create_component"
	| "batch_create_method"
	| "batch_set_project_formula"
	| "batch_delete_component"
	| "batch_delete_method"
	| "batch_create_folder"
	| "batch_delete_folder";

export interface AscetBatchWriteParams {
	operation: AscetBatchWriteOperation;
	requests: Array<Record<string, unknown>>;
	intent?: "preview" | "apply";
}

export interface AscetBatchWriteContext extends AscetEditApprovalContext {
	ascetPermission?: AscetPermissionSnapshot;
}

export interface RunAscetBatchWriteOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	onLifecycle?: (event: AscetCliLifecycleEvent) => void;
}

export type AscetBatchWriteResult = AscetCliJsonResult & {
	mutationResult?: AscetMutationResultEnvelope;
};

export interface AscetBatchWriteObservationInvalidation {
	invalidated: string[];
}

export const createFolderRequest = Type.Object(
	{
		folderPath: Type.String({ minLength: 1 }),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("ignore"), Type.Literal("return-existing")]),
		),
	},
	{ additionalProperties: false },
);
export const createComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")]),
		),
		rollbackOnFailure: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
export const createMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		componentKind: Type.Optional(
			Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		),
		methodKind: Type.Optional(
			Type.Union([
				Type.Literal("abstract"),
				Type.Literal("process"),
				Type.Literal("action"),
				Type.Literal("condition"),
				Type.Literal("trigger"),
			]),
		),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")]),
		),
	},
	{ additionalProperties: false },
);
export const setMethodCodeRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		codeFile: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
export const applyElementSpecRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		projectPath: Type.Optional(Type.String()),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		recreateIncompatible: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
export const applyProjectFormulaRequest = Type.Object(
	{
		projectPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
export const deleteComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);
export const deleteMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);
export const deleteFolderRequest = Type.Object(
	{
		folderPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);

const cliOperationByToolOperation: Record<AscetBatchWriteOperation, string> = {
	batch_set_method_code: "set_method_code",
	batch_set_element_spec: "apply_element_spec",
	batch_create_component: "create_component",
	batch_create_method: "create_method",
	batch_set_project_formula: "apply_project_formula",
	batch_delete_component: "delete_component",
	batch_delete_method: "delete_method",
	batch_create_folder: "create_folder",
	batch_delete_folder: "delete_folder",
};

const requestSchemaByToolOperation = {
	batch_set_method_code: setMethodCodeRequest,
	batch_set_element_spec: applyElementSpecRequest,
	batch_create_component: createComponentRequest,
	batch_create_method: createMethodRequest,
	batch_set_project_formula: applyProjectFormulaRequest,
	batch_delete_component: deleteComponentRequest,
	batch_delete_method: deleteMethodRequest,
	batch_create_folder: createFolderRequest,
	batch_delete_folder: deleteFolderRequest,
};

function formatBatchRequestValidationPath(
	index: number,
	error: { keyword?: string; instancePath?: string; params?: unknown },
): string {
	const basePath = (error.instancePath ?? "").replace(/^\//, "").replace(/\//g, ".");
	if (error.keyword === "required") {
		const requiredProperty = (error.params as { requiredProperties?: string[] }).requiredProperties?.[0];
		if (requiredProperty) {
			return basePath
				? `requests.${index}.${basePath}.${requiredProperty}`
				: `requests.${index}.${requiredProperty}`;
		}
	}
	return basePath ? `requests.${index}.${basePath}` : `requests.${index}`;
}

function normalizeBatchRequest(
	operation: AscetBatchWriteOperation,
	request: Record<string, unknown>,
): Record<string, unknown> {
	if (
		operation === "batch_create_component" &&
		(request.kind === "class" || request.kind === "module") &&
		request.language === undefined
	) {
		return { ...request, language: "ESDL" };
	}
	if (operation === "batch_create_method" && !request.methodKind && typeof request.componentKind === "string") {
		const defaultMethodKind = getDefaultCreateMethodKind(request.componentKind as AscetCreateMethodComponentKind);
		if (defaultMethodKind) {
			return { ...request, methodKind: defaultMethodKind };
		}
	}
	return request;
}

export function normalizeAscetBatchWriteParams(params: AscetBatchWriteParams): AscetBatchWriteParams {
	if (!Array.isArray(params.requests)) {
		return params;
	}
	return {
		...params,
		requests: params.requests.map((request) => normalizeBatchRequest(params.operation, request)),
	};
}

function validateBatchCreateMethodSemantics(request: Record<string, unknown>, index: number, errors: string[]): void {
	const componentKind = request.componentKind as AscetCreateMethodComponentKind | undefined;
	const methodKind = request.methodKind as AscetCreateMethodKind | undefined;
	if (!methodKind) {
		if (componentKind === "statemachine") {
			errors.push(`requests.${index}.methodKind: requires methodKind for statemachine targets`);
			return;
		}
		errors.push(`requests.${index}.methodKind: requires methodKind or componentKind for default inference`);
		return;
	}
	const compatibility = validateCreateMethodKindCompatibility({ componentKind, methodKind });
	if (compatibility) {
		errors.push(`requests.${index}.methodKind: ${compatibility.message}`);
	}
}

export function validateAscetBatchWriteParams(params: AscetBatchWriteParams): AscetBatchWriteParams {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const requestSchema = requestSchemaByToolOperation[normalizedParams.operation];
	if (!requestSchema || !Array.isArray(normalizedParams.requests)) {
		return normalizedParams;
	}
	const errors: string[] = [];
	for (const [index, request] of normalizedParams.requests.entries()) {
		for (const error of Value.Errors(requestSchema, request)) {
			errors.push(`${formatBatchRequestValidationPath(index, error)}: ${error.message}`);
		}
		if (normalizedParams.operation === "batch_create_method") {
			validateBatchCreateMethodSemantics(request, index, errors);
		}
	}
	if (errors.length > 0) {
		throw new Error(
			[
				`Validation failed for batch operation "${normalizedParams.operation}":`,
				...errors.map((error) => `  - ${error}`),
			].join("\n"),
		);
	}
	return normalizedParams;
}

function createBatchPayloadObject(params: AscetBatchWriteParams): {
	requests: Array<{ id: string; operation: string; args: Record<string, unknown> }>;
} {
	const cliOperation = cliOperationByToolOperation[params.operation];
	return {
		requests: params.requests.map((request, index) => ({
			id: `req-${index + 1}`,
			operation: cliOperation,
			args: { ...request, verifyReadback: true },
		})),
	};
}

function createBatchPayload(params: AscetBatchWriteParams): string {
	return JSON.stringify(createBatchPayloadObject(params));
}

export function buildBatchWriteArgs(params: AscetBatchWriteParams): string[] {
	return ["batch", cliOperationByToolOperation[params.operation]];
}

export function createBatchWriteSummary(params: AscetBatchWriteParams): string {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const preview = normalizedParams.requests
		.slice(0, 5)
		.map((request, index) => `request ${index + 1}: ${JSON.stringify(request)}`)
		.join("\n");
	const more =
		normalizedParams.requests.length > 5 ? `\n... ${normalizedParams.requests.length - 5} more request(s)` : "";
	return [
		"ASCET batch write request:",
		`operation: ${normalizedParams.operation}`,
		`cliOperation: ${cliOperationByToolOperation[normalizedParams.operation]}`,
		`requestCount: ${normalizedParams.requests.length}`,
		preview,
		more,
	]
		.filter(Boolean)
		.join("\n");
}

function createPreviewBatchWriteResult(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	data: Record<string, unknown>,
): AscetBatchWriteResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: true,
		data: {
			operation: params.operation,
			summary: createBatchWriteSummary(params),
			writeExecuted: false,
			mutation: { status: "not_started" },
			...data,
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildBatchWriteArgs(params),
			stdin: createBatchPayload(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}
function createBlockedBatchWriteResult(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	code: string,
	message: string,
	data: Record<string, unknown> = {},
): AscetBatchWriteResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: params.operation,
			summary: createBatchWriteSummary(params),
			writeExecuted: false,
			mutation: { status: "not_started" },
			...data,
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildBatchWriteArgs(params),
			stdin: createBatchPayload(params),
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code, message },
	};
}

const editActionByBatchOperation = {
	batch_set_method_code: "set_method_code",
	batch_set_element_spec: "apply_element_spec",
	batch_create_component: "create_component",
	batch_create_method: "create_method",
	batch_set_project_formula: "apply_project_formula",
	batch_delete_component: "delete_component",
	batch_delete_method: "delete_method",
	batch_create_folder: "create_folder",
	batch_delete_folder: "delete_folder",
} as const;

function batchRequestTarget(operation: AscetBatchWriteOperation, request: Record<string, unknown>): string | undefined {
	if (operation === "batch_create_folder" || operation === "batch_delete_folder")
		return stringValue(request.folderPath);
	if (operation === "batch_set_project_formula") return stringValue(request.projectPath);
	return stringValue(request.componentPath);
}

function parentAscetPath(path: string): string | undefined {
	const normalized = normalizeAscetPath(path);
	const separator = normalized.lastIndexOf("\\");
	return separator > 0 ? normalized.slice(0, separator) : undefined;
}

function batchRequestImpactPath(
	operation: AscetBatchWriteOperation,
	request: Record<string, unknown>,
): string | undefined {
	const target = batchRequestTarget(operation, request);
	if (!target) return undefined;
	if (operation === "batch_create_folder" || operation === "batch_create_component") {
		return parentAscetPath(target);
	}
	return normalizeAscetPath(target);
}

interface BatchTreeEvidence {
	complete: boolean;
	databaseFingerprint?: string;
	entries: AscetTargetImpactEntry[];
}

async function readBatchTreeEvidence(options: RunAscetBatchWriteOptions): Promise<BatchTreeEvidence> {
	const raw = await runAscetGet({ action: "tree", scope: "database", delivery: "stored" }, options);
	const payload = raw.ok ? unwrapToolSuccessPayload(raw.data) : undefined;
	const result = asRecord(payload);
	const coverage = asRecord(result?.coverage);
	const identity = result ? getAscetDatabaseIdentity(result) : undefined;
	const entries = Array.isArray(result?.items)
		? result.items.flatMap((value) => {
				const item = asRecord(value);
				const path = stringValue(item?.path);
				const oid = stringValue(item?.oid);
				const kind = stringValue(item?.kind);
				return path && oid && kind ? [{ path, oid, kind }] : [];
			})
		: [];
	return {
		complete:
			raw.ok &&
			identity !== undefined &&
			coverage?.status === "complete_for_scope" &&
			coverage.completeness === "complete" &&
			coverage.collectorCompleted === true &&
			result?.truncated !== true,
		databaseFingerprint: identity?.fingerprint,
		entries,
	};
}

interface BatchPreflightReady {
	status: "ready";
	databaseFingerprint: string;
	targets: string[];
	editable: boolean[];
	editability: Array<{ path: string; editable: boolean }>;
	impacts: AscetTargetImpact[];
	sharedObject: boolean;
	fingerprint: string;
}

interface BatchWriteLifecycle {
	beforeBridge: boolean;
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
}

function batchPermission(decision: AscetPermissionDecision): AscetMutationResultEnvelope["permission"] {
	return {
		mode: decision.mode,
		decision: decision.behavior,
		risk: decision.risk,
		reason: decision.reason,
		rule: decision.rule,
	};
}

function batchPreflightEvidence(preflight: BatchPreflightReady): Record<string, unknown> {
	return {
		databaseFingerprint: preflight.databaseFingerprint,
		targets: preflight.targets,
		editability: preflight.editability,
		sharedObject: preflight.sharedObject,
		impacts: preflight.impacts,
		preflightFingerprint: preflight.fingerprint,
	};
}

function batchInitialEditability(
	preflight: BatchPreflightReady,
	requiresEditableTarget: boolean,
): AscetMutationResultEnvelope["editability"] {
	if (!requiresEditableTarget) return { status: "not_applicable" };
	if (preflight.editable.every(Boolean)) {
		return { status: "editable", initiallyEditable: true, acquiredByThisOperation: false };
	}
	return { status: "blocked", initiallyEditable: false, acquiredByThisOperation: false };
}

function findGuardedBatchEvidence(data: unknown): Record<string, unknown> | undefined {
	const root = asRecord(data);
	const result = asRecord(root?.result);
	return asRecord(root?.guardedBatchWrite) ?? asRecord(result?.guardedBatchWrite);
}

function batchGuardedEditability(
	data: unknown,
	fallback: AscetMutationResultEnvelope["editability"],
): AscetMutationResultEnvelope["editability"] {
	const guarded = findGuardedBatchEvidence(data);
	const targets = Array.isArray(guarded?.targets)
		? guarded.targets.map(asRecord).filter((target) => target !== undefined)
		: [];
	if (targets.length === 0) return fallback;
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

function batchMutationStatus(result: AscetBatchWriteResult, lifecycle: BatchWriteLifecycle): AscetMutationStatus {
	const guardedStatus = stringValue(findGuardedBatchEvidence(result.data)?.mutationStatus);
	if (
		guardedStatus === "applied" ||
		guardedStatus === "no_op" ||
		guardedStatus === "not_started" ||
		guardedStatus === "partially_applied" ||
		guardedStatus === "rolled_back" ||
		guardedStatus === "unknown"
	) {
		return guardedStatus;
	}
	const items = findResultItems(result.data);
	const failures = findFailures(result.data);
	if (result.ok && failures.length === 0) return "applied";
	if (items.some((item) => item.ok === true || item.success === true)) return "partially_applied";
	return lifecycle.bridgeEntered ? "unknown" : "not_started";
}

function itemReadbackVerified(item: Record<string, unknown>): boolean {
	const payload = asRecord(item.result) ?? item;
	const verification = asRecord(payload.verification);
	return payload.readbackVerified === true || payload.ReadbackVerified === true || verification?.status === "passed";
}

function batchVerificationStatus(
	result: AscetBatchWriteResult,
	mutationStatus: AscetMutationStatus,
): AscetVerificationStatus {
	const guardedStatus = stringValue(findGuardedBatchEvidence(result.data)?.verificationStatus);
	if (
		guardedStatus === "passed" ||
		guardedStatus === "failed" ||
		guardedStatus === "missing" ||
		guardedStatus === "unknown" ||
		guardedStatus === "not_applicable"
	) {
		return guardedStatus;
	}
	if (mutationStatus === "not_started" || mutationStatus === "rolled_back") return "not_applicable";
	const items = findResultItems(result.data);
	if (items.length === 0) return "unknown";
	if (items.every(itemReadbackVerified)) return "passed";
	return findFailures(result.data).length > 0 ? "failed" : "missing";
}

function batchExecutionEnvelope(
	result: AscetBatchWriteResult,
	decision: AscetPermissionDecision,
	preflight: BatchPreflightReady,
	requiresEditableTarget: boolean,
	lifecycle: BatchWriteLifecycle,
	audit: AscetMutationResultEnvelope["audit"],
): AscetMutationResultEnvelope {
	const mutationStatus = batchMutationStatus(result, lifecycle);
	const verificationStatus = batchVerificationStatus(result, mutationStatus);
	const error = result.error ? { code: result.error.code, message: result.error.message } : undefined;
	const status: AscetMutationResultEnvelope["status"] =
		mutationStatus === "rolled_back"
			? "rolled_back"
			: mutationStatus === "unknown"
				? "unknown"
				: mutationStatus === "partially_applied" ||
						verificationStatus === "failed" ||
						verificationStatus === "missing" ||
						verificationStatus === "unknown"
					? "partial"
					: error
						? mutationStatus === "not_started"
							? "error"
							: "partial"
						: "ok";
	const recoveryActions =
		status === "unknown"
			? ["Re-read every batch target and reconcile the mutation outcome before retrying."]
			: status === "partial"
				? ["Re-read every batch target and reconcile partial or unverified changes before retrying."]
				: [];
	return {
		status,
		mutationStatus,
		permission: batchPermission(decision),
		preflight: { status: "passed", evidence: batchPreflightEvidence(preflight) },
		editability: batchGuardedEditability(result.data, batchInitialEditability(preflight, requiresEditableTarget)),
		mutation: { status: mutationStatus },
		verification: { status: verificationStatus },
		...(error ? { error } : {}),
		...(audit ? { audit } : {}),
		bridge: lifecycle,
		recovery: { required: recoveryActions.length > 0, actions: recoveryActions },
	};
}

function attachBatchMutationResult(
	result: AscetBatchWriteResult,
	mutationResult: AscetMutationResultEnvelope,
): AscetBatchWriteResult {
	return { ...result, mutationResult };
}

function batchPreExecutionEnvelope(input: {
	mode: PermissionMode;
	result: AscetBatchWriteResult;
	status: "ok" | "blocked" | "error";
	preflight?: BatchPreflightReady;
	decision?: AscetPermissionDecision;
	requiresEditableTarget: boolean;
	audit?: AscetMutationResultEnvelope["audit"];
}): AscetMutationResultEnvelope {
	const error = input.result.error
		? { code: input.result.error.code, message: input.result.error.message }
		: undefined;
	return {
		status: input.status,
		mutationStatus: "not_started",
		permission: input.decision ? batchPermission(input.decision) : { mode: input.mode, decision: "not_evaluated" },
		preflight: input.preflight
			? { status: "passed", evidence: batchPreflightEvidence(input.preflight) }
			: { status: "failed" },
		editability: input.preflight
			? batchInitialEditability(input.preflight, input.requiresEditableTarget)
			: input.requiresEditableTarget
				? { status: "unknown" }
				: { status: "not_applicable" },
		mutation: { status: "not_started" },
		verification: { status: "not_applicable" },
		...(error ? { error } : {}),
		...(input.audit ? { audit: input.audit } : {}),
		bridge: { beforeBridge: false, bridgeEntered: false, backendResponseReceived: false },
		recovery: { required: false, actions: [] },
	};
}

async function collectBatchPreflight(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
): Promise<BatchPreflightReady | { status: "blocked"; result: AscetBatchWriteResult }> {
	const databaseCheck = await checkAscetDatabaseIdentityForWrite(options);
	if (databaseCheck.result || !databaseCheck.identity) {
		return {
			status: "blocked",
			result:
				databaseCheck.result ??
				createBlockedBatchWriteResult(
					params,
					options,
					"database_identity_missing",
					"Current ASCET database identity is unavailable.",
				),
		};
	}
	const tree = await readBatchTreeEvidence(options);
	if (!tree.complete || tree.databaseFingerprint !== databaseCheck.identity.fingerprint) {
		return {
			status: "blocked",
			result: createBlockedBatchWriteResult(
				params,
				options,
				"shared_object_impact_unknown",
				"A complete Tree for the current ASCET database is required before batch permission evaluation.",
			),
		};
	}
	const targets = params.requests.map((request) => batchRequestTarget(params.operation, request));
	if (targets.some((target) => !target)) {
		return {
			status: "blocked",
			result: createBlockedBatchWriteResult(
				params,
				options,
				"ascet_batch_write_target_missing",
				"Every batch request must expose an exact target path before permission evaluation.",
			),
		};
	}
	const exactTargets = targets.filter((target): target is string => target !== undefined).map(normalizeAscetPath);
	const impacts: AscetTargetImpact[] = [];
	for (const [index, request] of params.requests.entries()) {
		const impactPath = batchRequestImpactPath(params.operation, request);
		if (!impactPath) {
			impacts.push(
				resolveAscetTargetImpact({
					targetOid: `database:${databaseCheck.identity.fingerprint}`,
					requestedPath: databaseCheck.identity.path,
					completeness: "complete",
					entries: tree.entries,
				}),
			);
			continue;
		}
		const normalizedImpactPath = normalizeAscetPath(impactPath);
		const entry = tree.entries.find(
			(candidate) =>
				normalizeAscetPath(candidate.path).toLocaleLowerCase() === normalizedImpactPath.toLocaleLowerCase(),
		);
		if (!entry) {
			return {
				status: "blocked",
				result: createBlockedBatchWriteResult(
					params,
					options,
					"plan_target_identity_missing",
					`Batch request ${index + 1} impact anchor '${normalizedImpactPath}' was not found in the complete Tree.`,
				),
			};
		}
		impacts.push(
			resolveAscetTargetImpact({
				targetOid: entry.oid,
				requestedPath: normalizedImpactPath,
				completeness: "complete",
				entries: tree.entries,
			}),
		);
	}
	const descriptor = getAscetEditAction(editActionByBatchOperation[params.operation])?.permission;
	if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${params.operation}.`);
	const editable: boolean[] = [];
	const editability: Array<{ path: string; editable: boolean }> = [];
	if (descriptor.requiresEditableTarget) {
		for (const target of [...new Set(exactTargets)]) {
			const result = await runAscetEditability({ mode: "check", componentPath: target }, options);
			if (!result.ok || typeof result.data !== "boolean") {
				return { status: "blocked", result };
			}
			editable.push(result.data);
			editability.push({ path: target, editable: result.data });
		}
	}
	const fingerprint = fingerprintJson({
		databaseFingerprint: databaseCheck.identity.fingerprint,
		targets: exactTargets,
		editability,
		impacts: impacts.map((impact) => impact.fingerprint),
	});
	return {
		status: "ready",
		databaseFingerprint: databaseCheck.identity.fingerprint,
		targets: exactTargets,
		editable,
		editability,
		impacts,
		sharedObject: impacts.some((impact) => impact.sharedObject),
		fingerprint,
	};
}

export async function runAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
): Promise<AscetBatchWriteResult> {
	const normalizedParams = validateAscetBatchWriteParams(params);
	return runAscetCliJson(buildBatchWriteArgs(normalizedParams), {
		...options,
		stdin: createBatchPayload(normalizedParams),
		acceptedExitCodes: [0, 2],
		commandId: `batch_${cliOperationByToolOperation[normalizedParams.operation]}`,
		toolName: "ascet_batch_write",
		jobKind: "write",
	});
}

function normalizeGuardedBatchResult(raw: AscetBatchWriteResult): AscetBatchWriteResult {
	if (!raw.ok) return raw;
	const guardedRecord = asRecord(unwrapToolSuccessPayload(raw.data));
	if (!guardedRecord) {
		return {
			...raw,
			ok: false,
			error: {
				code: "guarded_batch_write_invalid_result",
				message: "guarded_batch_write returned an invalid result envelope.",
			},
		};
	}
	const results = Array.isArray(guardedRecord.results) ? guardedRecord.results : [];
	const outer = asRecord(raw.data);
	const guardedEvidence = Object.fromEntries(Object.entries(guardedRecord).filter(([key]) => key !== "results"));
	const normalizedData =
		outer && "result" in outer
			? { ...outer, result: { results, guardedBatchWrite: guardedEvidence } }
			: { results, guardedBatchWrite: guardedEvidence };
	if (guardedRecord.success === true || results.length > 0) {
		return { ...raw, data: normalizedData };
	}
	const error = asRecord(guardedRecord.error);
	return {
		...raw,
		ok: false,
		data: normalizedData,
		error: {
			code: typeof error?.code === "string" ? error.code : "guarded_batch_write_failed",
			message: typeof error?.message === "string" ? error.message : "Guarded ASCET batch write failed.",
			details: guardedRecord,
		},
	};
}

async function runGuardedAscetBatchWrite(
	params: AscetBatchWriteParams,
	editableTargets: string[],
	options: RunAscetBatchWriteOptions,
): Promise<AscetBatchWriteResult> {
	return withInlineCodeFile(
		{
			code: JSON.stringify({
				...createBatchPayloadObject(params),
				editableTargets: [...new Set(editableTargets.map(normalizeAscetPath))],
				acquireEditability: true,
			}),
			prefix: "guarded_batch_write",
		},
		async (requestFile) => {
			const raw = await runAscetCliJson(["exec", "guarded_batch_write", "--request-file", requestFile, "--json"], {
				...options,
				commandId: "guarded_batch_write",
				toolName: "ascet_batch_write",
				jobKind: "write",
			});
			return normalizeGuardedBatchResult(raw);
		},
	);
}

export async function runApprovedAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	ctx: AscetBatchWriteContext,
): Promise<AscetBatchWriteResult> {
	const normalizedParams = validateAscetBatchWriteParams(params);
	const permission = resolveAscetPermissionSnapshot(ctx);
	const mode = permission.mode;
	const action = editActionByBatchOperation[normalizedParams.operation];
	const descriptor = getAscetEditAction(action)?.permission;
	if (!descriptor) throw new Error(`Missing ASCET permission descriptor for ${normalizedParams.operation}.`);
	let preflight = await collectBatchPreflight(normalizedParams, options);
	if (preflight.status === "blocked") {
		return attachBatchMutationResult(
			preflight.result,
			batchPreExecutionEnvelope({
				mode,
				result: preflight.result,
				status: "error",
				requiresEditableTarget: descriptor.requiresEditableTarget,
			}),
		);
	}
	const evaluate = (current: BatchPreflightReady) =>
		evaluateAscetPermission({
			mode,
			action,
			descriptor,
			rules: permission.rules,
			path: current.targets[0],
			databaseFingerprint: current.databaseFingerprint,
			hardGatesPassed: true,
			evidenceComplete: true,
			targetCount: normalizedParams.requests.length,
			sharedObject: current.sharedObject,
			editableAcquisitionRequired: current.editable.some((value) => !value),
		});
	let decision = evaluate(preflight);
	const preflightData = (current: BatchPreflightReady) => ({
		preflightOnly: true,
		permissionMode: mode,
		permissionDecision: decision.behavior,
		risk: decision.risk,
		targets: current.targets,
		effects: normalizedParams.requests,
		databaseFingerprint: current.databaseFingerprint,
		editability: current.editability,
		sharedObject: current.sharedObject,
		impacts: current.impacts,
		preflightFingerprint: current.fingerprint,
	});
	if (normalizedParams.intent !== "apply") {
		const result = createPreviewBatchWriteResult(normalizedParams, options, preflightData(preflight));
		return attachBatchMutationResult(
			result,
			batchPreExecutionEnvelope({
				mode,
				result,
				status: "ok",
				preflight,
				decision,
				requiresEditableTarget: descriptor.requiresEditableTarget,
				audit: { preflightFingerprint: preflight.fingerprint },
			}),
		);
	}

	let approvedAt: string | undefined;
	let approvalMaterialFingerprint: string | undefined;
	let revalidatedAt: string | undefined;
	for (let materialChangeCount = 0; ; materialChangeCount += 1) {
		if (decision.behavior === "deny") {
			const result = createBlockedBatchWriteResult(
				normalizedParams,
				options,
				"ascet_batch_write_permission_denied",
				decision.reason,
				preflightData(preflight),
			);
			return attachBatchMutationResult(
				result,
				batchPreExecutionEnvelope({
					mode,
					result,
					status: "blocked",
					preflight,
					decision,
					requiresEditableTarget: descriptor.requiresEditableTarget,
				}),
			);
		}
		if (decision.behavior === "ask") {
			const approval = await requestAscetMutationApproval(
				{
					title: "Confirm ASCET batch write",
					message: [
						`Mode: ${decision.mode}`,
						`Risk: ${decision.risk}`,
						`Database: ${preflight.databaseFingerprint}`,
						`Preflight fingerprint: ${preflight.fingerprint}`,
						`Shared object impact: ${preflight.sharedObject ? "yes" : "no"}`,
						`Targets (${preflight.targets.length}):`,
						...preflight.targets.map((target, index) => `${index + 1}. ${target}`),
						...(preflight.editability.some((entry) => !entry.editable)
							? [
									"",
									"Planned editability changes:",
									...preflight.editability
										.filter((entry) => !entry.editable)
										.map((entry) => `- Request editability for ${entry.path}`),
								]
							: []),
						"",
						createBatchWriteSummary(normalizedParams),
					].join("\n"),
					signal: options.signal,
				},
				ctx,
			);
			if (approval.status !== "approved") {
				const code =
					approval.status === "ui_unavailable"
						? "ascet_batch_write_approval_required"
						: approval.status === "cancelled"
							? "ascet_batch_write_operation_aborted_before_write"
							: approval.status === "ui_failed"
								? "ascet_batch_write_confirmation_ui_failed"
								: "ascet_batch_write_confirmation_not_granted";
				const message =
					approval.status === "ui_failed"
						? approval.message
						: approval.status === "cancelled"
							? "The batch write was cancelled before mutation began."
							: approval.status === "ui_unavailable"
								? "This batch write requires an interactive approval channel."
								: "ASCET batch write confirmation was not granted.";
				const result = createBlockedBatchWriteResult(
					normalizedParams,
					options,
					code,
					message,
					preflightData(preflight),
				);
				return attachBatchMutationResult(
					result,
					batchPreExecutionEnvelope({
						mode,
						result,
						status: "blocked",
						preflight,
						decision,
						requiresEditableTarget: descriptor.requiresEditableTarget,
					}),
				);
			}
			approvedAt = approval.approvedAt;
			approvalMaterialFingerprint = preflight.fingerprint;
		}

		const revalidated = await collectBatchPreflight(normalizedParams, options);
		revalidatedAt = new Date().toISOString();
		if (revalidated.status === "blocked") {
			return attachBatchMutationResult(
				revalidated.result,
				batchPreExecutionEnvelope({
					mode,
					result: revalidated.result,
					status: "error",
					preflight,
					decision,
					requiresEditableTarget: descriptor.requiresEditableTarget,
					audit: { approvedAt, revalidatedAt, approvalMaterialFingerprint },
				}),
			);
		}
		if (revalidated.fingerprint === preflight.fingerprint) {
			preflight = revalidated;
			decision = evaluate(preflight);
			if (decision.behavior === "deny") {
				const result = createBlockedBatchWriteResult(
					normalizedParams,
					options,
					"ascet_batch_write_revalidation_blocked",
					decision.reason,
					preflightData(preflight),
				);
				return attachBatchMutationResult(
					result,
					batchPreExecutionEnvelope({
						mode,
						result,
						status: "blocked",
						preflight,
						decision,
						requiresEditableTarget: descriptor.requiresEditableTarget,
						audit: { approvedAt, revalidatedAt, approvalMaterialFingerprint },
					}),
				);
			}
			break;
		}
		if (materialChangeCount >= 1) {
			const result = createBlockedBatchWriteResult(
				normalizedParams,
				options,
				"ascet_batch_write_target_unstable",
				"The authoritative batch scope changed repeatedly during approval.",
				preflightData(revalidated),
			);
			return attachBatchMutationResult(
				result,
				batchPreExecutionEnvelope({
					mode,
					result,
					status: "blocked",
					preflight: revalidated,
					decision,
					requiresEditableTarget: descriptor.requiresEditableTarget,
					audit: { approvedAt, revalidatedAt, approvalMaterialFingerprint },
				}),
			);
		}
		preflight = revalidated;
		decision = evaluate(preflight);
	}

	const lifecycle: BatchWriteLifecycle = {
		beforeBridge: false,
		bridgeEntered: false,
		backendResponseReceived: false,
	};
	const writeOptions: RunAscetBatchWriteOptions = {
		...options,
		onLifecycle: (event) => {
			if (event.stage === "before_bridge") lifecycle.beforeBridge = true;
			if (event.stage === "bridge_entered") lifecycle.bridgeEntered = true;
			if (event.stage === "backend_response_received") lifecycle.backendResponseReceived = true;
			options.onLifecycle?.(event);
		},
	};
	const result = preflight.editable.some((value) => !value)
		? await runGuardedAscetBatchWrite(
				normalizedParams,
				preflight.editability.map((entry) => entry.path),
				writeOptions,
			)
		: await runAscetBatchWrite(normalizedParams, writeOptions);
	if (isBatchWriteFullySuccessful(result)) {
		const observations = invalidateBatchWriteObservations(normalizedParams, options);
		result.data = attachBatchWriteObservations(result.data, observations);
	}
	return attachBatchMutationResult(
		result,
		batchExecutionEnvelope(result, decision, preflight, descriptor.requiresEditableTarget, lifecycle, {
			approvedAt,
			revalidatedAt,
			preflightFingerprint: preflight.fingerprint,
			approvalMaterialFingerprint,
		}),
	);
}

export function invalidateBatchWriteObservations(
	params: AscetBatchWriteParams,
	options: Pick<RunAscetBatchWriteOptions, "env">,
): AscetBatchWriteObservationInvalidation {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const invalidated = new Set<string>();
	for (const request of normalizedParams.requests) {
		const observation = invalidateAscetEditObservations(
			toObservationTargetParams(normalizedParams.operation, request),
			options,
		);
		for (const resultId of observation.invalidated) {
			invalidated.add(resultId);
		}
	}
	return { invalidated: [...invalidated] };
}

function toObservationTargetParams(
	operation: AscetBatchWriteOperation,
	request: Record<string, unknown>,
): AscetEditObservationTargetParams {
	return {
		action: cliOperationByToolOperation[operation],
		componentPath: stringValue(request.componentPath),
		modulePath: stringValue(request.modulePath),
		stateMachinePath: stringValue(request.stateMachinePath),
		folderPath: stringValue(request.folderPath),
		projectPath: stringValue(request.projectPath),
		targetPath: stringValue(request.targetPath),
	};
}

function attachBatchWriteObservations(data: unknown, observations: AscetBatchWriteObservationInvalidation): unknown {
	const root = asRecord(data);
	if (!root) {
		return { result: data, observations };
	}
	const result = asRecord(root.result);
	if (result) {
		return { ...root, result: { ...result, observations } };
	}
	return { ...root, observations };
}

function isBatchWriteFullySuccessful(result: AscetBatchWriteResult): boolean {
	return result.ok && result.exitCode !== 2 && findFailures(result.data).length === 0;
}
function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function findResultItems(data: unknown): Array<Record<string, unknown>> {
	const root = asRecord(data);
	const result = asRecord(root?.result);
	const candidates = [root?.results, root?.Results, result?.results, result?.Results];
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate.filter((item): item is Record<string, unknown> => !!asRecord(item));
		}
	}
	return [];
}

function findFailures(data: unknown): Array<Record<string, unknown>> {
	return findResultItems(data).filter(
		(item) => item.ok === false || item.success === false || item.error !== undefined,
	);
}

export function createBatchWriteOutcome(result: AscetBatchWriteResult): AscetToolOutcome {
	const data = asRecord(result.data);
	if (result.ok && data?.preflightOnly === true) {
		return createPreflightOutcome(data);
	}
	const failures = findFailures(result.data);
	if (result.ok && (result.exitCode === 2 || failures.length > 0)) {
		return { status: "partial", data: result.data, failures };
	}
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_batch_write_failed";
	const message = result.error?.message ?? "ASCET batch write failed.";

	if (isAscetEditApprovalBlockedCode(code) || isAscetEditableWriteGateBlockedCode(code)) {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

export function formatBatchWriteResult(result: AscetBatchWriteResult): string {
	return formatAscetCliJsonResult("batch_write", result);
}

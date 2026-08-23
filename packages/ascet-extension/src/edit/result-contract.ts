import { type TProperties, Type } from "typebox";

export type AscetCanonicalMutationStatus =
	| "applied"
	| "no_op"
	| "not_started"
	| "partially_applied"
	| "rolled_back"
	| "unknown";
export type AscetCanonicalVerificationStatus = "passed" | "failed" | "missing" | "unknown" | "not_applicable";
export type AscetCanonicalSaveState = "saved" | "not_required" | "failed" | "unknown";

export interface AscetCanonicalMutationEvidence {
	outcome: "succeeded" | "failed";
	changed: boolean;
	mutationStatus: AscetCanonicalMutationStatus;
	saveAttempted: boolean;
	saveSucceeded: boolean;
	saveState: AscetCanonicalSaveState;
	verified: boolean;
	verificationStatus: AscetCanonicalVerificationStatus;
	verificationMode: string;
	sessionCount: number;
	saveCount: number;
	editableRetryCount: number;
	nativeMutationAttemptCount: number;
}

export interface AscetCanonicalEditabilityCheckResult {
	outcome: "succeeded";
	editable: boolean;
	mutationStatus: "read_only";
	changed: false;
	verified: true;
	verificationStatus: "passed";
	verificationMode: "same_session_scm_state";
	sessionCount: 1;
	nativeMutationAttemptCount: 0;
}

export interface AscetCanonicalEditabilitySetResult {
	outcome: "succeeded" | "failed";
	editable: boolean | null;
	beforeEditable: boolean | null;
	afterEditable: boolean | null;
	changed: boolean;
	mutationStatus:
		| "applied"
		| "no_op"
		| "not_started"
		| "partial_failure"
		| "outcome_unknown"
		| "verification_failed"
		| "rolled_back";
	saveAttempted: false;
	saveSucceeded: false;
	saveState: "not_applicable";
	verified: boolean;
	verificationStatus: "passed" | "failed" | "unknown" | "not_applicable";
	verificationMode: "same_session_scm_state";
	sessionCount: number;
	saveCount: 0;
	nativeMutationAttemptCount: number;
	editableRetryCount: number;
	nativeScmOperationCount: number;
	targetPath?: string;
	beforeIsVersion?: boolean;
	beforeIsEdition?: boolean;
	afterIsVersion?: boolean | null;
	afterIsEdition?: boolean | null;
	scmBindingType?: string;
	originalError?: { code: string; message: string } | null;
	error?: { code: string; message: string };
	recovery: { required: boolean; actions: string[] };
	nativeOperations: unknown[];
}

function strictObject<T extends TProperties>(properties: T) {
	return Type.Object(properties, { additionalProperties: false });
}

const mutationStatusSchema = Type.Union([
	Type.Literal("applied"),
	Type.Literal("no_op"),
	Type.Literal("not_started"),
	Type.Literal("partially_applied"),
	Type.Literal("rolled_back"),
	Type.Literal("unknown"),
]);
const verificationStatusSchema = Type.Union([
	Type.Literal("passed"),
	Type.Literal("failed"),
	Type.Literal("missing"),
	Type.Literal("unknown"),
	Type.Literal("not_applicable"),
]);
const saveStateSchema = Type.Union([
	Type.Literal("saved"),
	Type.Literal("not_required"),
	Type.Literal("failed"),
	Type.Literal("unknown"),
]);
const publicErrorSchema = strictObject({
	code: Type.String({ minLength: 1 }),
	message: Type.String({ minLength: 1 }),
});
const recoverySchema = strictObject({
	required: Type.Boolean(),
	actions: Type.Array(Type.String({ minLength: 1 })),
});
const permissionSchema = strictObject({
	mode: Type.Union([Type.Literal("default"), Type.Literal("acceptEdits"), Type.Literal("auto")]),
	decision: Type.Union([
		Type.Literal("allow"),
		Type.Literal("ask"),
		Type.Literal("deny"),
		Type.Literal("not_evaluated"),
	]),
	risk: Type.Optional(Type.Union([Type.Literal("safe"), Type.Literal("medium"), Type.Literal("high")])),
	reason: Type.Optional(Type.String()),
	rule: Type.Optional(Type.Unknown()),
	path: Type.Optional(Type.String({ minLength: 1 })),
	databaseFingerprintKnown: Type.Optional(Type.Boolean()),
	databaseFingerprintSource: Type.Optional(
		Type.Union([
			Type.Literal("session"),
			Type.Literal("bridge"),
			Type.Literal("caller"),
			Type.Literal("unavailable"),
		]),
	),
	evidenceComplete: Type.Optional(Type.Boolean()),
	targetCount: Type.Optional(Type.Integer({ minimum: 0 })),
	variantCount: Type.Optional(Type.Integer({ minimum: 0 })),
	impactUnknown: Type.Optional(Type.Boolean()),
});
const bridgeSchema = strictObject({
	beforeBridge: Type.Boolean(),
	bridgeEntered: Type.Boolean(),
	backendResponseReceived: Type.Boolean(),
});
const preflightSchema = strictObject({
	status: Type.Union([Type.Literal("passed"), Type.Literal("failed"), Type.Literal("not_run")]),
	evidence: Type.Optional(Type.Unknown()),
});
const editabilitySchema = strictObject({
	status: Type.Union([
		Type.Literal("editable"),
		Type.Literal("acquired"),
		Type.Literal("blocked"),
		Type.Literal("unknown"),
		Type.Literal("not_applicable"),
	]),
	initiallyEditable: Type.Optional(Type.Boolean()),
	acquiredByThisOperation: Type.Optional(Type.Boolean()),
	finalEditableState: Type.Optional(
		Type.Union([Type.Literal("editable"), Type.Literal("read_only"), Type.Literal("unknown")]),
	),
});
const auditSchema = strictObject({
	approvedAt: Type.Optional(Type.String()),
	revalidatedAt: Type.Optional(Type.String()),
	preflightFingerprint: Type.Optional(Type.String()),
	approvalMaterialFingerprint: Type.Optional(Type.String()),
	databaseFingerprint: Type.Optional(Type.String({ minLength: 1 })),
	databaseFingerprintKnown: Type.Optional(Type.Boolean()),
	databaseFingerprintSource: Type.Optional(
		Type.Union([
			Type.Literal("session"),
			Type.Literal("bridge"),
			Type.Literal("caller"),
			Type.Literal("unavailable"),
		]),
	),
});

const mutationResultCommonProperties = {
	status: Type.Union([
		Type.Literal("ok"),
		Type.Literal("blocked"),
		Type.Literal("error"),
		Type.Literal("partial"),
		Type.Literal("rolled_back"),
		Type.Literal("unknown"),
	]),
	changed: Type.Boolean(),
	mutationStatus: mutationStatusSchema,
	saveAttempted: Type.Boolean(),
	saveSucceeded: Type.Boolean(),
	saveState: saveStateSchema,
	verified: Type.Boolean(),
	verificationStatus: verificationStatusSchema,
	verificationMode: Type.String({ minLength: 1 }),
	sessionCount: Type.Integer({ minimum: 0 }),
	saveCount: Type.Integer({ minimum: 0 }),
	editableRetryCount: Type.Integer({ minimum: 0, maximum: 1 }),
	nativeMutationAttemptCount: Type.Integer({ minimum: 0 }),
	permission: permissionSchema,
	preflight: preflightSchema,
	editability: editabilitySchema,
	mutation: strictObject({ status: mutationStatusSchema }),
	verification: strictObject({ status: verificationStatusSchema }),
	bridge: bridgeSchema,
	recovery: recoverySchema,
	audit: Type.Optional(auditSchema),
};

export const ascetMutationSuccessResultSchema = Type.Union([
	strictObject({
		...mutationResultCommonProperties,
		outcome: Type.Literal("succeeded"),
		status: Type.Literal("ok"),
		changed: Type.Literal(true),
		mutationStatus: Type.Literal("applied"),
		saveAttempted: Type.Literal(true),
		saveSucceeded: Type.Literal(true),
		saveState: Type.Literal("saved"),
		verified: Type.Literal(true),
		verificationStatus: Type.Literal("passed"),
		sessionCount: Type.Literal(1),
		saveCount: Type.Literal(1),
		nativeMutationAttemptCount: Type.Literal(1),
	}),
	strictObject({
		...mutationResultCommonProperties,
		outcome: Type.Literal("succeeded"),
		status: Type.Literal("ok"),
		changed: Type.Literal(false),
		mutationStatus: Type.Literal("no_op"),
		saveAttempted: Type.Literal(false),
		saveSucceeded: Type.Literal(false),
		saveState: Type.Literal("not_required"),
		verified: Type.Literal(true),
		verificationStatus: Type.Literal("passed"),
		sessionCount: Type.Literal(1),
		saveCount: Type.Literal(0),
		nativeMutationAttemptCount: Type.Literal(0),
	}),
]);

export const ascetMutationFailureResultSchema = strictObject({
	...mutationResultCommonProperties,
	outcome: Type.Literal("failed"),
	error: publicErrorSchema,
});

export const ascetMutationPublicResultSchema = Type.Union([
	ascetMutationSuccessResultSchema,
	ascetMutationFailureResultSchema,
]);

export const ascetEditabilityCheckResultSchema = strictObject({
	outcome: Type.Literal("succeeded"),
	editable: Type.Boolean(),
	mutationStatus: Type.Literal("read_only"),
	changed: Type.Literal(false),
	verified: Type.Literal(true),
	verificationStatus: Type.Literal("passed"),
	verificationMode: Type.Literal("same_session_scm_state"),
	sessionCount: Type.Literal(1),
	nativeMutationAttemptCount: Type.Literal(0),
});

const editabilitySetCommonProperties = {
	editable: Type.Boolean(),
	beforeEditable: Type.Boolean(),
	afterEditable: Type.Boolean(),
	saveAttempted: Type.Literal(false),
	saveSucceeded: Type.Literal(false),
	saveState: Type.Literal("not_applicable"),
	verificationMode: Type.Literal("same_session_scm_state"),
	sessionCount: Type.Integer({ minimum: 0, maximum: 1 }),
	saveCount: Type.Literal(0),
	nativeMutationAttemptCount: Type.Integer({ minimum: 0, maximum: 1 }),
	editableRetryCount: Type.Integer({ minimum: 0, maximum: 1 }),
	nativeScmOperationCount: Type.Integer({ minimum: 0 }),
	targetPath: Type.Optional(Type.String()),
	beforeIsVersion: Type.Optional(Type.Boolean()),
	beforeIsEdition: Type.Optional(Type.Boolean()),
	afterIsVersion: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
	afterIsEdition: Type.Optional(Type.Union([Type.Boolean(), Type.Null()])),
	scmBindingType: Type.Optional(Type.String()),
	originalError: Type.Optional(Type.Union([publicErrorSchema, Type.Null()])),
	nativeOperations: Type.Array(Type.Unknown()),
	recovery: recoverySchema,
};

export const ascetEditabilitySetResultSchema = Type.Union([
	strictObject({
		...editabilitySetCommonProperties,
		outcome: Type.Literal("succeeded"),
		editable: Type.Literal(true),
		beforeEditable: Type.Literal(false),
		afterEditable: Type.Literal(true),
		changed: Type.Literal(true),
		mutationStatus: Type.Literal("applied"),
		verified: Type.Literal(true),
		verificationStatus: Type.Literal("passed"),
		nativeMutationAttemptCount: Type.Literal(1),
		nativeScmOperationCount: Type.Integer({ minimum: 1 }),
	}),
	strictObject({
		...editabilitySetCommonProperties,
		outcome: Type.Literal("succeeded"),
		editable: Type.Literal(true),
		beforeEditable: Type.Literal(true),
		afterEditable: Type.Literal(true),
		changed: Type.Literal(false),
		mutationStatus: Type.Literal("no_op"),
		verified: Type.Literal(true),
		verificationStatus: Type.Literal("passed"),
		nativeMutationAttemptCount: Type.Literal(0),
		nativeScmOperationCount: Type.Literal(0),
	}),
	strictObject({
		...editabilitySetCommonProperties,
		outcome: Type.Literal("failed"),
		editable: Type.Union([Type.Boolean(), Type.Null()]),
		beforeEditable: Type.Union([Type.Boolean(), Type.Null()]),
		afterEditable: Type.Union([Type.Boolean(), Type.Null()]),
		changed: Type.Boolean(),
		mutationStatus: Type.Union([
			Type.Literal("not_started"),
			Type.Literal("partial_failure"),
			Type.Literal("outcome_unknown"),
			Type.Literal("verification_failed"),
			Type.Literal("rolled_back"),
		]),
		verified: Type.Boolean(),
		verificationStatus: Type.Union([Type.Literal("failed"), Type.Literal("unknown"), Type.Literal("not_applicable")]),
		error: publicErrorSchema,
	}),
]);

export function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

export function extractBridgeActionPayload(data: unknown): Record<string, unknown> | undefined {
	if (!isRecord(data) || !Object.hasOwn(data, "result")) return undefined;
	return isRecord(data.result) ? data.result : undefined;
}

export function readCanonicalMutationEvidence(value: unknown): AscetCanonicalMutationEvidence | undefined {
	if (!isRecord(value)) return undefined;
	const mutationStatus = value.mutationStatus;
	const saveState = value.saveState;
	const verificationStatus = value.verificationStatus;
	if (
		(value.outcome !== "succeeded" && value.outcome !== "failed") ||
		typeof value.changed !== "boolean" ||
		!(["applied", "no_op", "not_started", "partially_applied", "rolled_back", "unknown"] as const).includes(
			mutationStatus as AscetCanonicalMutationStatus,
		) ||
		typeof value.saveAttempted !== "boolean" ||
		typeof value.saveSucceeded !== "boolean" ||
		!(["saved", "not_required", "failed", "unknown"] as const).includes(saveState as AscetCanonicalSaveState) ||
		typeof value.verified !== "boolean" ||
		!(["passed", "failed", "missing", "unknown", "not_applicable"] as const).includes(
			verificationStatus as AscetCanonicalVerificationStatus,
		) ||
		typeof value.verificationMode !== "string" ||
		value.verificationMode.length === 0 ||
		!Number.isInteger(value.sessionCount) ||
		(value.sessionCount as number) < 0 ||
		!Number.isInteger(value.saveCount) ||
		(value.saveCount as number) < 0 ||
		!Number.isInteger(value.editableRetryCount) ||
		(value.editableRetryCount as number) < 0 ||
		(value.editableRetryCount as number) > 1 ||
		!Number.isInteger(value.nativeMutationAttemptCount) ||
		(value.nativeMutationAttemptCount as number) < 0
	) {
		return undefined;
	}
	return {
		outcome: value.outcome,
		changed: value.changed,
		mutationStatus: value.mutationStatus as AscetCanonicalMutationStatus,
		saveAttempted: value.saveAttempted,
		saveSucceeded: value.saveSucceeded,
		saveState: value.saveState as AscetCanonicalSaveState,
		verified: value.verified,
		verificationStatus: value.verificationStatus as AscetCanonicalVerificationStatus,
		verificationMode: value.verificationMode,
		sessionCount: value.sessionCount as number,
		saveCount: value.saveCount as number,
		editableRetryCount: value.editableRetryCount as number,
		nativeMutationAttemptCount: value.nativeMutationAttemptCount as number,
	};
}

export function isCanonicalMutationSuccess(value: unknown): value is AscetCanonicalMutationEvidence {
	const evidence = readCanonicalMutationEvidence(value);
	if (
		!evidence ||
		evidence.outcome !== "succeeded" ||
		!evidence.verified ||
		evidence.verificationStatus !== "passed"
	) {
		return false;
	}
	if (evidence.sessionCount !== 1) return false;
	if (evidence.mutationStatus === "applied") {
		return (
			evidence.changed &&
			evidence.saveAttempted &&
			evidence.saveSucceeded &&
			evidence.saveState === "saved" &&
			evidence.saveCount === 1 &&
			evidence.nativeMutationAttemptCount === 1
		);
	}
	return (
		evidence.mutationStatus === "no_op" &&
		!evidence.changed &&
		!evidence.saveAttempted &&
		!evidence.saveSucceeded &&
		evidence.saveState === "not_required" &&
		evidence.saveCount === 0 &&
		evidence.nativeMutationAttemptCount === 0
	);
}

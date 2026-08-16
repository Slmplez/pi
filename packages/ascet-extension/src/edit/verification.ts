import type { AscetCliJsonResult } from "../cli.ts";

export type AscetEditMutationStatus =
	| "applied"
	| "no_op"
	| "not_started"
	| "partially_applied"
	| "rolled_back"
	| "unknown";

export type AscetEditConsistencyStatus = "consistent" | "restored" | "unknown";

export type AscetEditVerificationStatus = "passed" | "failed" | "missing" | "unknown" | "not_applicable";

export type AscetEditRollbackStatus = "not_required" | "passed" | "failed" | "unknown";

export interface AscetEditVerification {
	mode: "automatic_readback";
	source: "write_command";
	required: true;
	requested: boolean | null;
	verified: boolean | null;
	status: AscetEditVerificationStatus;
}

export interface AscetEditRollback {
	required: boolean;
	status: AscetEditRollbackStatus;
	verified: boolean | null;
}

export interface AscetEditExecutionClassification {
	mutationStatus: AscetEditMutationStatus;
	consistencyStatus: AscetEditConsistencyStatus;
	verification: AscetEditVerification;
	rollback: AscetEditRollback;
	shouldInvalidateObservations: boolean;
}

const VERIFY_READBACK_REQUESTED_KEY = "verifyreadbackrequested";
const READBACK_VERIFIED_KEY = "readbackverified";
const REQUIRES_READBACK_KEY = "requiresreadback";
const WRITE_NOT_STARTED_CODE = "write_not_started";
const READBACK_MISMATCH_CODE = "readback_mismatch";
const WRITE_OUTCOME_UNKNOWN_CODE = "write_outcome_unknown";
const ROLLED_BACK_STATUS = "rolled_back";
const ELEMENT_TRANSACTION_ROLLED_BACK_CODE = "element_transaction_rolled_back";
const ROLLBACK_FAILED_STATUS = "rollback_failed";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}

function findNestedBoolean(value: unknown, key: string, seen = new Set<object>()): boolean | undefined {
	if (!isRecord(value) || seen.has(value)) {
		return undefined;
	}
	seen.add(value);

	for (const [entryKey, entryValue] of Object.entries(value)) {
		if (entryKey.toLowerCase() === key && typeof entryValue === "boolean") {
			return entryValue;
		}
	}

	for (const entryValue of Object.values(value)) {
		const nestedValue = findNestedBoolean(entryValue, key, seen);
		if (nestedValue !== undefined) {
			return nestedValue;
		}
	}

	return undefined;
}

function findNestedString(value: unknown, key: string, seen = new Set<object>()): string | undefined {
	if (!isRecord(value) || seen.has(value)) {
		return undefined;
	}
	seen.add(value);

	for (const [entryKey, entryValue] of Object.entries(value)) {
		if (entryKey.toLowerCase() === key && typeof entryValue === "string") {
			return entryValue;
		}
	}

	for (const entryValue of Object.values(value)) {
		const nestedValue = findNestedString(entryValue, key, seen);
		if (nestedValue !== undefined) {
			return nestedValue;
		}
	}

	return undefined;
}

function findNestedRecord(value: unknown, key: string, seen = new Set<object>()): Record<string, unknown> | undefined {
	if (!isRecord(value) || seen.has(value)) {
		return undefined;
	}
	seen.add(value);

	for (const [entryKey, entryValue] of Object.entries(value)) {
		if (entryKey.toLowerCase() === key && isRecord(entryValue)) {
			return entryValue;
		}
	}

	for (const entryValue of Object.values(value)) {
		const nestedValue = findNestedRecord(entryValue, key, seen);
		if (nestedValue !== undefined) {
			return nestedValue;
		}
	}

	return undefined;
}

function createVerification(
	requested: boolean | null,
	verified: boolean | null,
	status: AscetEditVerificationStatus,
): AscetEditVerification {
	return {
		mode: "automatic_readback",
		source: "write_command",
		required: true,
		requested,
		verified,
		status,
	};
}

function createUnknownVerification(): AscetEditVerification {
	return createVerification(null, null, "unknown");
}

function createNoRollback(): AscetEditRollback {
	return { required: false, status: "not_required", verified: true };
}

function extractRollback(value: unknown): AscetEditRollback {
	const rollback = findNestedRecord(value, "rollback");
	if (!rollback) {
		return createNoRollback();
	}

	const required = findNestedBoolean(rollback, "required") ?? true;
	const verified = findNestedBoolean(rollback, "verified") ?? null;
	const rawStatus = findNestedString(rollback, "status")?.toLowerCase();
	const status: AscetEditRollbackStatus =
		rawStatus === "passed" || rawStatus === "failed" || rawStatus === "not_required" ? rawStatus : "unknown";
	return { required, status, verified };
}

export function extractAscetEditVerification(data: unknown): AscetEditVerification {
	const requested = findNestedBoolean(data, VERIFY_READBACK_REQUESTED_KEY) ?? null;
	const verified = findNestedBoolean(data, READBACK_VERIFIED_KEY) ?? null;

	if (requested === true && verified === true) {
		return createVerification(requested, verified, "passed");
	}

	if (requested === true && verified === false) {
		return createVerification(requested, verified, "failed");
	}

	return createVerification(requested, verified, "missing");
}

export function classifyAscetEditExecution(raw: AscetCliJsonResult): AscetEditExecutionClassification {
	const classificationPayload = raw.ok ? raw.data : raw.error?.details;
	const operationStatus = findNestedString(classificationPayload, "status")?.toLowerCase();
	const explicitMutationStatus = findNestedString(classificationPayload, "mutationstatus")?.toLowerCase();
	const explicitVerificationStatus = findNestedString(classificationPayload, "verificationstatus")?.toLowerCase();
	const rollback = extractRollback(classificationPayload);
	const errorCode = raw.error?.code.toLowerCase();

	if (
		explicitMutationStatus === "applied" ||
		explicitMutationStatus === "no_op" ||
		explicitMutationStatus === "not_started" ||
		explicitMutationStatus === "partially_applied" ||
		explicitMutationStatus === "rolled_back" ||
		explicitMutationStatus === "unknown"
	) {
		const verificationStatus: AscetEditVerificationStatus =
			explicitVerificationStatus === "passed" ||
			explicitVerificationStatus === "failed" ||
			explicitVerificationStatus === "missing" ||
			explicitVerificationStatus === "unknown" ||
			explicitVerificationStatus === "not_applicable"
				? explicitVerificationStatus
				: "unknown";
		const verification = createVerification(
			verificationStatus !== "not_applicable",
			verificationStatus === "passed" || verificationStatus === "not_applicable"
				? true
				: verificationStatus === "failed"
					? false
					: null,
			verificationStatus,
		);
		return {
			mutationStatus: explicitMutationStatus,
			consistencyStatus:
				explicitMutationStatus === "rolled_back"
					? "restored"
					: verificationStatus === "passed" || verificationStatus === "not_applicable"
						? "consistent"
						: "unknown",
			verification,
			rollback,
			shouldInvalidateObservations:
				explicitMutationStatus === "applied" ||
				explicitMutationStatus === "partially_applied" ||
				explicitMutationStatus === "rolled_back" ||
				explicitMutationStatus === "unknown",
		};
	}

	if (errorCode === ELEMENT_TRANSACTION_ROLLED_BACK_CODE || errorCode?.endsWith("_rolled_back") === true) {
		return {
			mutationStatus: "rolled_back",
			consistencyStatus: "restored",
			verification: createUnknownVerification(),
			rollback: { required: true, status: "passed", verified: true },
			shouldInvalidateObservations: true,
		};
	}

	if (operationStatus === ROLLED_BACK_STATUS || (rollback.required && rollback.status === "passed")) {
		return {
			mutationStatus: "rolled_back",
			consistencyStatus: "restored",
			verification: createUnknownVerification(),
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	if (
		operationStatus === ROLLBACK_FAILED_STATUS ||
		errorCode?.includes("rollback_failed") === true ||
		(rollback.required && rollback.status === "failed")
	) {
		return {
			mutationStatus: "unknown",
			consistencyStatus: "unknown",
			verification: createUnknownVerification(),
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	if (raw.ok) {
		const verification = extractAscetEditVerification(raw.data);
		return {
			mutationStatus: "applied",
			consistencyStatus: verification.status === "passed" ? "consistent" : "unknown",
			verification,
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	const requiresReadback = findNestedBoolean(raw.error?.details, REQUIRES_READBACK_KEY);

	if (errorCode === READBACK_MISMATCH_CODE) {
		return {
			mutationStatus: "applied",
			consistencyStatus: "unknown",
			verification: createVerification(true, false, "failed"),
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	if (errorCode === WRITE_NOT_STARTED_CODE || requiresReadback === false) {
		return {
			mutationStatus: "not_started",
			consistencyStatus: "consistent",
			verification: createUnknownVerification(),
			rollback,
			shouldInvalidateObservations: false,
		};
	}

	if (errorCode === WRITE_OUTCOME_UNKNOWN_CODE || requiresReadback === true) {
		return {
			mutationStatus: "unknown",
			consistencyStatus: "unknown",
			verification: createUnknownVerification(),
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	return {
		mutationStatus: "unknown",
		consistencyStatus: "unknown",
		verification: createUnknownVerification(),
		rollback,
		shouldInvalidateObservations: true,
	};
}

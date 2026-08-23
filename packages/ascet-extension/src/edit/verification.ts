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

const WRITE_NOT_STARTED_CODE = "write_not_started";
const READBACK_MISMATCH_CODE = "readback_mismatch";
const WRITE_OUTCOME_UNKNOWN_CODE = "write_outcome_unknown";
const ROLLED_BACK_STATUS = "rolled_back";
const ELEMENT_TRANSACTION_ROLLED_BACK_CODE = "element_transaction_rolled_back";
const ROLLBACK_FAILED_STATUS = "rollback_failed";

function isRecord(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function readBoolean(value: Record<string, unknown> | undefined, key: string): boolean | undefined {
	const entry = value?.[key];
	return typeof entry === "boolean" ? entry : undefined;
}

function readString(value: Record<string, unknown> | undefined, key: string): string | undefined {
	const entry = value?.[key];
	return typeof entry === "string" ? entry : undefined;
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

function extractRollback(value: Record<string, unknown> | undefined): AscetEditRollback {
	const rollback = isRecord(value?.rollback) ? value.rollback : undefined;
	if (!rollback) return createNoRollback();

	const required = readBoolean(rollback, "required") ?? true;
	const verified = readBoolean(rollback, "verified") ?? null;
	const rawStatus = readString(rollback, "status")?.toLowerCase();
	const status: AscetEditRollbackStatus =
		rawStatus === "passed" || rawStatus === "failed" || rawStatus === "not_required" ? rawStatus : "unknown";
	return { required, status, verified };
}

export function extractAscetEditVerification(data: unknown): AscetEditVerification {
	const payload = isRecord(data) ? data : undefined;
	const requested = readBoolean(payload, "verifyReadbackRequested") ?? null;
	const verified = readBoolean(payload, "readbackVerified") ?? null;

	if (requested === true && verified === true) return createVerification(requested, verified, "passed");
	if (requested === true && verified === false) return createVerification(requested, verified, "failed");
	return createVerification(requested, verified, "missing");
}

export function classifyAscetEditExecution(raw: AscetCliJsonResult): AscetEditExecutionClassification {
	const resultPayload = isRecord(raw.data) ? raw.data : undefined;
	const errorDetails = isRecord(raw.error?.details) ? raw.error.details : undefined;
	const classificationPayload = resultPayload ?? errorDetails;
	const operationStatus = readString(classificationPayload, "status")?.toLowerCase();
	const explicitMutationStatus = readString(classificationPayload, "mutationStatus")?.toLowerCase();
	const explicitVerificationStatus = readString(classificationPayload, "verificationStatus")?.toLowerCase();
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
		const verification = extractAscetEditVerification(resultPayload);
		return {
			mutationStatus: "applied",
			consistencyStatus: verification.status === "passed" ? "consistent" : "unknown",
			verification,
			rollback,
			shouldInvalidateObservations: true,
		};
	}

	const requiresReadback = readBoolean(errorDetails, "requiresReadback");

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

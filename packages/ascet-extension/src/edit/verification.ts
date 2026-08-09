import type { AscetCliJsonResult } from "../cli.ts";

export type AscetEditMutationStatus = "applied" | "not_started" | "unknown";

export type AscetEditVerificationStatus = "passed" | "failed" | "missing" | "unknown";

export interface AscetEditVerification {
	mode: "automatic_readback";
	source: "write_command";
	required: true;
	requested: boolean | null;
	verified: boolean | null;
	status: AscetEditVerificationStatus;
}

export interface AscetEditExecutionClassification {
	mutationStatus: AscetEditMutationStatus;
	verification: AscetEditVerification;
	shouldInvalidateObservations: boolean;
}

const VERIFY_READBACK_REQUESTED_KEY = "verifyreadbackrequested";
const READBACK_VERIFIED_KEY = "readbackverified";
const REQUIRES_READBACK_KEY = "requiresreadback";
const WRITE_NOT_STARTED_CODE = "write_not_started";
const READBACK_MISMATCH_CODE = "readback_mismatch";
const WRITE_OUTCOME_UNKNOWN_CODE = "write_outcome_unknown";

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
	if (raw.ok) {
		const verification = extractAscetEditVerification(raw.data);
		return {
			mutationStatus: "applied",
			verification,
			shouldInvalidateObservations: true,
		};
	}

	const errorCode = raw.error?.code.toLowerCase();
	const requiresReadback = findNestedBoolean(raw.error?.details, REQUIRES_READBACK_KEY);

	if (errorCode === READBACK_MISMATCH_CODE) {
		return {
			mutationStatus: "applied",
			verification: createVerification(true, false, "failed"),
			shouldInvalidateObservations: true,
		};
	}

	if (errorCode === WRITE_NOT_STARTED_CODE || requiresReadback === false) {
		return {
			mutationStatus: "not_started",
			verification: createUnknownVerification(),
			shouldInvalidateObservations: false,
		};
	}

	if (errorCode === WRITE_OUTCOME_UNKNOWN_CODE || requiresReadback === true) {
		return {
			mutationStatus: "unknown",
			verification: createUnknownVerification(),
			shouldInvalidateObservations: true,
		};
	}

	return {
		mutationStatus: "unknown",
		verification: createUnknownVerification(),
		shouldInvalidateObservations: true,
	};
}

import type {
	AscetPermissionBehavior,
	AscetPermissionRuleMatch,
	AscetWriteRisk,
	PermissionMode,
} from "../permissions/types.ts";
import type { AscetMutationPreflightEvidence } from "./preflight/types.ts";

export type AscetMutationEnvelopeStatus = "ok" | "blocked" | "error" | "partial" | "rolled_back" | "unknown";
export type AscetMutationStatus = "applied" | "no_op" | "not_started" | "partially_applied" | "rolled_back" | "unknown";
export type AscetVerificationStatus = "passed" | "failed" | "missing" | "unknown" | "not_applicable";
export type AscetSaveState = "saved" | "not_required" | "failed" | "unknown";

export interface AscetMutationResultEnvelope {
	outcome?: "succeeded" | "failed";
	status: AscetMutationEnvelopeStatus;
	changed?: boolean;
	mutationStatus: AscetMutationStatus;
	saveAttempted?: boolean;
	saveSucceeded?: boolean;
	saveState?: AscetSaveState;
	verified?: boolean;
	verificationStatus?: AscetVerificationStatus;
	verificationMode?: string;
	sessionCount?: number;
	saveCount?: number;
	editableRetryCount?: number;
	nativeMutationAttemptCount?: number;
	permission: {
		mode: PermissionMode;
		decision: AscetPermissionBehavior | "not_evaluated";
		risk?: AscetWriteRisk;
		reason?: string;
		rule?: AscetPermissionRuleMatch;
		path?: string;
		databaseFingerprintKnown?: boolean;
		databaseFingerprintSource?: "session" | "bridge" | "caller" | "unavailable";
		evidenceComplete?: boolean;
		targetCount?: number;
		variantCount?: number;
		impactUnknown?: boolean;
	};
	preflight: {
		status: "passed" | "failed" | "not_run";
		evidence?: AscetMutationPreflightEvidence | Partial<AscetMutationPreflightEvidence> | Record<string, unknown>;
	};
	editability: {
		status: "editable" | "acquired" | "blocked" | "unknown" | "not_applicable";
		initiallyEditable?: boolean;
		acquiredByThisOperation?: boolean;
		finalEditableState?: "editable" | "read_only" | "unknown";
	};
	mutation: { status: AscetMutationStatus };
	verification: { status: AscetVerificationStatus };
	error?: { code: string; message: string };
	audit?: {
		approvedAt?: string;
		revalidatedAt?: string;
		preflightFingerprint?: string;
		approvalMaterialFingerprint?: string;
		databaseFingerprint?: string;
		databaseFingerprintKnown?: boolean;
		databaseFingerprintSource?: "session" | "bridge" | "caller" | "unavailable";
	};
	bridge: {
		beforeBridge: boolean;
		bridgeEntered: boolean;
		backendResponseReceived: boolean;
	};
	recovery: {
		required: boolean;
		actions: string[];
	};
	raw?: unknown;
}

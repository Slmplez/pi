import type { AscetEditActionId } from "../contract.ts";

export type AscetPreflightCapabilityStatus = "supported" | "unsupported" | "unknown";
export type AscetPreflightEditabilityStatus = "editable" | "read_only" | "unknown" | "not_applicable";

export interface AscetPlannedEffect {
	kind: string;
	target: string;
	description: string;
}

export interface AscetMutationPreflightEvidence {
	version: 1;
	action: AscetEditActionId;
	paramsFingerprint: string;
	generatedAt: string;
	database: { path: string; fingerprint: string };
	target: { path: string; oid: string; kind: string };
	impact: {
		complete: boolean;
		sharedObject: boolean;
		ownerPath: string;
		affectedProjects: string[];
		fingerprint: string;
	};
	capability: {
		status: AscetPreflightCapabilityStatus;
		operation: string;
		evidence: Record<string, unknown>;
	};
	editability: {
		applicable: boolean;
		status: AscetPreflightEditabilityStatus;
		canRequestEditable: boolean;
	};
	effects: AscetPlannedEffect[];
	verification: {
		available: boolean;
		operation: string;
		target: Record<string, unknown>;
	};
	riskModifiers: string[];
	noOp: boolean;
	approvalMaterialFingerprint: string;
}

export type AscetMutationPreflightResult =
	| { status: "passed"; evidence: AscetMutationPreflightEvidence; raw?: unknown }
	| {
			status: "failed";
			code: string;
			message: string;
			mutationStatus: "not_started";
			evidence?: Partial<AscetMutationPreflightEvidence>;
			raw?: unknown;
	  };

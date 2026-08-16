import type { AscetEditActionId, AscetEditPermissionDescriptor } from "../edit/contract.ts";

export type PermissionMode = "default" | "acceptEdits" | "auto";

export type AscetWriteRisk = "safe" | "medium" | "high";
export type AscetPermissionBehavior = "allow" | "ask" | "deny";

export type AscetPermissionRuleAction = "*" | "request_editability" | AscetEditActionId;

export interface AscetPermissionRule {
	behavior: AscetPermissionBehavior;
	action: AscetPermissionRuleAction;
	path?: string;
	databaseFingerprint?: string;
}

export interface AscetPermissionRuleMatch {
	index: number;
	behavior: AscetPermissionBehavior;
	action: AscetPermissionRuleAction;
	path?: string;
	databaseFingerprint?: string;
	reason: string;
}

export interface AscetPermissionDecision {
	behavior: AscetPermissionBehavior;
	mode: PermissionMode;
	risk: AscetWriteRisk;
	reason: string;
	rule?: AscetPermissionRuleMatch;
}

export interface AscetPermissionEvaluationInput {
	mode: PermissionMode;
	action: AscetEditActionId;
	descriptor: AscetEditPermissionDescriptor;
	rules?: readonly AscetPermissionRule[];
	path?: string;
	databaseFingerprint?: string;
	hardGatesPassed: boolean;
	hardGateReason?: string;
	evidenceComplete: boolean;
	noOp?: boolean;
	editableAcquisitionRequired?: boolean;
	sharedObject?: boolean;
	minimumRisk?: AscetWriteRisk;
	targetCount?: number;
	variantCount?: number;
}

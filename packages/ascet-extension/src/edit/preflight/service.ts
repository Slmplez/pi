import type { RunAscetEditOperationOptions } from "../common.ts";
import type { AscetEditActionId } from "../contract.ts";
import type { AscetMutationParams } from "../service.ts";
import { createAscetApprovalMaterialFingerprint, fingerprintAscetValue } from "./fingerprint.ts";
import type {
	AscetMutationPreflightEvidence,
	AscetPlannedEffect,
	AscetPreflightCapabilityStatus,
	AscetPreflightEditabilityStatus,
} from "./types.ts";

export interface AscetMutationPreflightContext {
	params: AscetMutationParams;
	options: RunAscetEditOperationOptions;
}

export type AscetMutationPreflightHandler<TResult> = (context: AscetMutationPreflightContext) => Promise<TResult>;

export interface CreateAscetMutationPreflightEvidenceInput {
	action: AscetEditActionId;
	params: unknown;
	database: AscetMutationPreflightEvidence["database"];
	target: AscetMutationPreflightEvidence["target"];
	impact: AscetMutationPreflightEvidence["impact"];
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
	verification: AscetMutationPreflightEvidence["verification"];
	riskModifiers?: string[];
	noOp?: boolean;
	generatedAt?: string;
}

export function createAscetMutationPreflightEvidence(
	input: CreateAscetMutationPreflightEvidenceInput,
): AscetMutationPreflightEvidence {
	const material = {
		version: 1 as const,
		action: input.action,
		paramsFingerprint: fingerprintAscetValue(input.params),
		database: input.database,
		target: input.target,
		impact: input.impact,
		capability: input.capability,
		editability: input.editability,
		effects: input.effects,
		verification: input.verification,
		riskModifiers: input.riskModifiers ?? [],
		noOp: input.noOp ?? false,
	};
	return {
		...material,
		generatedAt: input.generatedAt ?? new Date().toISOString(),
		approvalMaterialFingerprint: createAscetApprovalMaterialFingerprint(material),
	};
}

export class AscetMutationPreflightRegistry<TResult> {
	private readonly handlers = new Map<AscetMutationParams["action"], AscetMutationPreflightHandler<TResult>>();
	private readonly onMissing: AscetMutationPreflightHandler<TResult>;

	constructor(onMissing: AscetMutationPreflightHandler<TResult>) {
		this.onMissing = onMissing;
	}

	register(action: AscetMutationParams["action"], handler: AscetMutationPreflightHandler<TResult>): this {
		if (this.handlers.has(action)) throw new Error(`ASCET preflight handler already registered for ${action}.`);
		this.handlers.set(action, handler);
		return this;
	}

	has(action: AscetMutationParams["action"]): boolean {
		return this.handlers.has(action);
	}

	run(context: AscetMutationPreflightContext): Promise<TResult> {
		return (this.handlers.get(context.params.action) ?? this.onMissing)(context);
	}
}

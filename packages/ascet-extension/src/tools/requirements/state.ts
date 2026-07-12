import type {
	BlockingReason,
	DetailCompletion,
	EvidenceStatus,
	Readiness,
	RiskContextStage,
	RiskGateState,
} from "./types.ts";

export interface ComputeRiskGateStateInput {
	riskContextStage: RiskContextStage;
	evidenceStatus: EvidenceStatus;
	readiness: Readiness;
	detailCompletion: DetailCompletion;
	blockingClarificationCount: number;
	force?: Partial<RiskGateState>;
}

export function computeRiskGateState(input: ComputeRiskGateStateInput): RiskGateState {
	const blockingReasons: BlockingReason[] = [];
	if (input.riskContextStage === "summary_only") {
		blockingReasons.push("summary_only");
	}
	if (input.riskContextStage === "detail_partial") {
		blockingReasons.push("detail_partial");
	}
	if (input.evidenceStatus === "missing") {
		blockingReasons.push("evidence_missing");
	}
	if (input.evidenceStatus === "partial") {
		blockingReasons.push("evidence_partial");
	}
	if (!input.detailCompletion.allPagesRetrieved) {
		blockingReasons.push("pagination_incomplete");
	}
	if (input.detailCompletion.truncated) {
		blockingReasons.push("truncated_output");
	}
	if (input.blockingClarificationCount > 0) {
		blockingReasons.push("blocking_clarification");
	}

	const computedReady =
		input.riskContextStage === "detail_complete" &&
		input.evidenceStatus === "complete" &&
		input.readiness === "ready" &&
		input.detailCompletion.allPagesRetrieved &&
		input.blockingClarificationCount === 0;
	const state = {
		riskContextStage: input.riskContextStage,
		evidenceStatus: input.evidenceStatus,
		readiness: input.readiness,
		designGateReady: computedReady,
		design_gate_ready: computedReady,
		stateValid: true,
		stateErrors: [],
		blockingReasons,
		...input.force,
	} satisfies RiskGateState;
	const designGateReady = state.designGateReady || state.design_gate_ready;

	const stateErrors: string[] = [];
	if (designGateReady && state.riskContextStage !== "detail_complete") {
		stateErrors.push(`design_gate_ready cannot be true when risk_context_stage is ${state.riskContextStage}`);
	}
	if (designGateReady && state.evidenceStatus !== "complete") {
		stateErrors.push(`design_gate_ready cannot be true when evidence_status is ${state.evidenceStatus}`);
	}
	if (state.readiness === "ready" && state.evidenceStatus !== "complete") {
		stateErrors.push(`readiness cannot be ready when evidence_status is ${state.evidenceStatus}`);
	}
	if (state.riskContextStage === "summary_only" && state.readiness === "ready") {
		stateErrors.push("readiness cannot be ready when risk_context_stage is summary_only");
	}

	return {
		...state,
		designGateReady,
		design_gate_ready: designGateReady,
		stateValid: stateErrors.length === 0,
		stateErrors,
	};
}

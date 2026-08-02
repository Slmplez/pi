export type PipelineStageName = "build" | "run" | "verify";
export type PipelineStageStatus = "pending" | "running" | "passed" | "failed" | "skipped";

export interface PipelineStageState {
	stage: PipelineStageName;
	status: PipelineStageStatus;
	startedAt?: string;
	finishedAt?: string;
	artifactPaths: string[];
	failureCode?: string;
}

export interface PipelineState {
	schemaVersion: "ascet-test-pipeline/v1";
	runId: string;
	requestHash: string;
	status: "pending" | "running" | "passed" | "failed";
	stages: PipelineStageState[];
}

export function createPipelineState(runId: string, requestHash = ""): PipelineState {
	return {
		schemaVersion: "ascet-test-pipeline/v1",
		runId,
		requestHash,
		status: "pending",
		stages: ["build", "run", "verify"].map((stage) => ({
			stage: stage as PipelineStageName,
			status: "pending",
			artifactPaths: [],
		})),
	};
}

export function transitionPipelineStage(
	state: PipelineState,
	stageName: PipelineStageName,
	status: PipelineStageStatus,
	patch: Partial<Pick<PipelineStageState, "artifactPaths" | "failureCode">> = {},
): PipelineState {
	const index = state.stages.findIndex((stage) => stage.stage === stageName);
	if (index < 0) throw new Error(`Unknown pipeline stage: ${stageName}`);
	const current = state.stages[index];
	if (status === "running") {
		if (current.status !== "pending") throw new Error(`Stage ${stageName} cannot start from ${current.status}.`);
		if (state.stages.slice(0, index).some((stage) => stage.status === "failed" || stage.status === "skipped")) {
			throw new Error(`Stage ${stageName} has a failed prerequisite.`);
		}
	}
	if ((status === "passed" || status === "failed") && current.status !== "running") {
		throw new Error(`Stage ${stageName} must be running before it can finish.`);
	}
	const now = new Date().toISOString();
	const nextStage: PipelineStageState = {
		...current,
		...patch,
		status,
		startedAt: status === "running" ? now : current.startedAt,
		finishedAt: status === "passed" || status === "failed" || status === "skipped" ? now : current.finishedAt,
	};
	const stages = state.stages.slice();
	stages[index] = nextStage;
	const nextStatus = stages.some((item) => item.status === "failed")
		? "failed"
		: stages.every((item) => item.status === "passed")
			? "passed"
			: stages.some((item) => item.status === "running")
				? "running"
				: "pending";
	return { ...state, status: nextStatus, stages };
}

export function pipelinePassed(state: PipelineState): boolean {
	return (
		state.status === "passed" && state.stages.length > 0 && state.stages.every((stage) => stage.status === "passed")
	);
}

export function canResumePipeline(state: PipelineState, requestHash: string): boolean {
	return (
		state.status !== "passed" &&
		state.requestHash === requestHash &&
		state.stages.some((stage) => stage.status === "pending" || stage.status === "failed")
	);
}

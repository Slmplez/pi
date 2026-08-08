export interface CompensatingRollbackStage {
	stage: string;
	target: string;
	evidence: unknown;
}

export interface CompensatingRollbackContext {
	planId: string;
	failedStage?: string;
	completedStages: readonly CompensatingRollbackStage[];
}

export interface CompensatingRollbackStageResult {
	stage: string;
	target: string;
	status: "succeeded" | "failed";
	error?: { code: string; message: string };
}

export interface CompensatingRollbackResult {
	status: "succeeded" | "failed" | "not_configured";
	attempted: boolean;
	stages: CompensatingRollbackStageResult[];
}

export type CompensatingRollbackCallback = (
	stage: CompensatingRollbackStage,
	context: CompensatingRollbackContext,
) => Promise<void>;

export interface CompensatingRollbackOrchestrator {
	rollback(context: CompensatingRollbackContext): Promise<CompensatingRollbackResult>;
}

export function createCompensatingRollbackOrchestrator(
	callback: CompensatingRollbackCallback,
): CompensatingRollbackOrchestrator {
	return {
		async rollback(context): Promise<CompensatingRollbackResult> {
			if (context.completedStages.length === 0) {
				return { status: "not_configured", attempted: false, stages: [] };
			}
			const stages: CompensatingRollbackStageResult[] = [];
			for (const stage of [...context.completedStages].reverse()) {
				try {
					await callback(stage, context);
					stages.push({ stage: stage.stage, target: stage.target, status: "succeeded" });
				} catch (error) {
					stages.push({
						stage: stage.stage,
						target: stage.target,
						status: "failed",
						error: {
							code: "compensating_rollback_failed",
							message: error instanceof Error ? error.message : String(error),
						},
					});
				}
			}
			return {
				status: stages.every((stage) => stage.status === "succeeded") ? "succeeded" : "failed",
				attempted: stages.length > 0,
				stages,
			};
		},
	};
}

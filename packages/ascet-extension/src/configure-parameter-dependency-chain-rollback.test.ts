import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	type CompensatingRollbackStage,
	createCompensatingRollbackOrchestrator,
} from "./configure-parameter-dependency-chain-rollback.ts";

describe("configure_parameter_dependency_chain rollback", () => {
	test("runs compensations in reverse order and continues after a rollback failure", async () => {
		const order: string[] = [];
		const orchestrator = createCompensatingRollbackOrchestrator(async (stage: CompensatingRollbackStage) => {
			order.push(stage.stage);
			if (stage.stage === "consumer_spec") throw new Error("restore failed");
		});
		const result = await orchestrator.rollback({
			planId: "plan-1",
			completedStages: [
				{ stage: "provider_spec", target: "Provider", evidence: {} },
				{ stage: "consumer_spec", target: "Consumer", evidence: {} },
				{ stage: "local_spec", target: "Consumer", evidence: {} },
			],
		});
		assert.deepEqual(order, ["local_spec", "consumer_spec", "provider_spec"]);
		assert.equal(result.status, "failed");
		assert.deepEqual(
			result.stages.map((stage) => stage.status),
			["succeeded", "failed", "succeeded"],
		);
	});

	test("reports no configured compensation when no stage completed", async () => {
		const orchestrator = createCompensatingRollbackOrchestrator(async () => undefined);
		const result = await orchestrator.rollback({ planId: "plan-1", completedStages: [] });
		assert.deepEqual(result, { status: "not_configured", attempted: false, stages: [] });
	});
});

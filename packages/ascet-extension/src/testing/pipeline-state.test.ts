import assert from "node:assert/strict";
import test from "node:test";
import { canResumePipeline, createPipelineState, pipelinePassed, transitionPipelineStage } from "./pipeline-state.ts";

test("creates a pending build-run-verify pipeline", () => {
	const state = createPipelineState("run-001");
	assert.equal(state.status, "pending");
	assert.deepEqual(
		state.stages.map((stage) => stage.stage),
		["build", "run", "verify"],
	);
	assert.ok(state.stages.every((stage) => stage.status === "pending"));
});

test("allows a stage to move from pending to running and passed", () => {
	let state = createPipelineState("run-001");
	state = transitionPipelineStage(state, "build", "running");
	assert.equal(state.stages[0].status, "running");
	state = transitionPipelineStage(state, "build", "passed", { artifactPaths: ["build-result.json"] });
	assert.equal(state.stages[0].status, "passed");
});

test("rejects downstream execution after a failed prerequisite", () => {
	let state = createPipelineState("run-001");
	state = transitionPipelineStage(state, "build", "running");
	state = transitionPipelineStage(state, "build", "failed", { failureCode: "c_compile_failed" });
	assert.throws(() => transitionPipelineStage(state, "run", "running"), /failed prerequisite/);
});

test("only a fully verified pipeline is passed and failed work is resumable when hashes match", () => {
	let state = createPipelineState("run-001", "request-a");
	for (const stage of ["build", "run", "verify"] as const) {
		state = transitionPipelineStage(state, stage, "running");
		state = transitionPipelineStage(state, stage, "passed");
	}
	assert.equal(pipelinePassed(state), true);
	assert.equal(canResumePipeline(state, "request-a"), false);
	assert.equal(canResumePipeline(state, "request-b"), false);
	let failed = createPipelineState("run-002", "request-a");
	failed = transitionPipelineStage(failed, "build", "running");
	failed = transitionPipelineStage(failed, "build", "failed", { failureCode: "c_compile_failed" });
	assert.equal(canResumePipeline(failed, "request-a"), true);
});

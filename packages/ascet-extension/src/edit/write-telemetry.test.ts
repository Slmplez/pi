import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { aggregateAscetWriteTelemetry, recordAscetWriteTelemetry } from "./write-telemetry.ts";

test("records privacy-bounded element write telemetry", () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-write-telemetry-"));
	try {
		recordAscetWriteTelemetry(
			{
				env: {
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: root,
					PI_ASCET_RUN_ID: "run-1",
					PI_ASCET_PHASE_ID: "write-1",
					PI_ASCET_CASE_ID: "W-007",
					PI_ASCET_ATTEMPT_ID: "attempt-1",
				},
			},
			{
				operation: "apply_element_spec",
				phase: "commit",
				outcome: "committed_unverified",
				durationMs: 12,
				planId: "plan-1",
				verificationStatus: "missing",
				mutationStatus: "applied",
			},
		);
		const line = readFileSync(join(root, "telemetry", "element-write.jsonl"), "utf8").trim();
		const event = JSON.parse(line) as Record<string, unknown>;
		assert.equal(event.operation, "apply_element_spec");
		assert.equal(event.outcome, "committed_unverified");
		assert.equal(event.verificationStatus, "missing");
		assert.equal(event.mutationStatus, "applied");
		assert.equal(event.planId, "plan-1");
		assert.equal(event.runId, "run-1");
		assert.equal(event.phaseId, "write-1");
		assert.equal(event.caseId, "W-007");
		assert.equal(event.attemptId, "attempt-1");
		assert.equal(Object.hasOwn(event, "params"), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("aggregates write telemetry by phase without hiding unknown outcomes", () => {
	const summary = aggregateAscetWriteTelemetry([
		{
			operation: "set_element_dependency",
			phase: "plan",
			runId: "run-1",
			phaseId: "readonly-1",
			caseId: "P-001",
			attemptId: "attempt-1",
			outcome: "plan_ready",
			durationMs: 1,
			mutationStatus: "not_started",
		},
		{
			operation: "set_element_dependency",
			phase: "commit",
			runId: "run-1",
			phaseId: "write-1",
			caseId: "W-007",
			attemptId: "attempt-2",
			outcome: "outcome_unknown",
			bridgeEntered: true,
			durationMs: 2,
			mutationStatus: "unknown",
			cleanupRequired: true,
		},
	]);

	assert.equal(summary.version, 2);
	assert.equal(summary.eventCount, 2);
	assert.equal(summary.bridgeEntered, true);
	assert.equal(summary.writesPerformed, false);
	assert.equal(summary.mutationStarted, true);
	assert.equal(summary.unknownOutcome, true);
	assert.equal(summary.cleanupRequired, true);
	assert.equal(summary.byPhase["readonly-1"]?.mutationStarted, false);
	assert.equal(summary.byPhase["write-1"]?.bridgeEntered, true);
	assert.equal(summary.byPhase["write-1"]?.unknownOutcome, true);
	assert.equal(summary.byCase["P-001"]?.writesPerformed, false);
	assert.equal(summary.byCase["W-007"]?.unknownOutcome, true);
	assert.equal(summary.byCase["W-007"]?.cleanupRequired, true);
	assert.equal(summary.byAttempt["attempt-2"]?.bridgeEntered, true);
	assert.equal(summary.byRun["run-1"]?.eventCount, 2);
});

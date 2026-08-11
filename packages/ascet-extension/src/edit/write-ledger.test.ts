import assert from "node:assert/strict";
import { test } from "node:test";
import { createAscetWriteLedger } from "./write-ledger.ts";

const events = [
	{
		version: 2,
		timestamp: "2026-08-11T00:00:00.000Z",
		operation: "set_element_dependency",
		phase: "plan",
		outcome: "error",
		durationMs: 1,
		errorCode: "plan_target_identity_missing",
		bridgeEntered: true,
		backendResponseReceived: true,
		mutationStarted: false,
		writesPerformed: false,
		cleanupRequired: false,
		attemptId: "attempt-1",
	},
	{
		version: 2,
		timestamp: "2026-08-11T00:01:00.000Z",
		operation: "set_element_dependency",
		phase: "commit",
		outcome: "committed",
		durationMs: 2,
		bridgeEntered: true,
		backendResponseReceived: true,
		mutationStarted: true,
		writesPerformed: true,
		cleanupRequired: false,
		attemptId: "attempt-2",
	},
] as const;

test("generates an immutable ledger and summary from every raw telemetry event", () => {
	const raw = `${events.map((event) => JSON.stringify(event)).join("\n")}\n`;
	const result = createAscetWriteLedger(raw);
	assert.equal(result.ledger.version, 2);
	assert.equal(result.ledger.eventCount, 2);
	assert.deepEqual(result.ledger.events, events);
	assert.equal(result.summary.eventCount, 2);
	assert.equal(result.summary.writesPerformed, true);
	assert.equal(result.summary.byAttempt["attempt-1"]?.eventCount, 1);
	assert.equal(result.summary.byAttempt["attempt-2"]?.writesPerformed, true);
	assert.equal(result.summary.rawSha256, result.ledger.rawSha256);
});

test("rejects legacy telemetry instead of silently rewriting it", () => {
	const legacy = `${JSON.stringify({ ...events[0], version: 1 })}\n`;
	assert.throws(() => createAscetWriteLedger(legacy), /Invalid ASCET write telemetry event at line 1/u);
});

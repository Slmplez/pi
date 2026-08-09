import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { recordAscetWriteTelemetry } from "./write-telemetry.ts";

test("records privacy-bounded element write telemetry", () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-write-telemetry-"));
	try {
		recordAscetWriteTelemetry(
			{ env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: root } },
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
		assert.equal(Object.hasOwn(event, "params"), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

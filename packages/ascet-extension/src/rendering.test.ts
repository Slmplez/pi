import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { renderAscetToolResult } from "./rendering.ts";

function status(details: unknown, isError = false): string {
	return renderAscetToolResult({ details }, { expanded: false, isPartial: false }, undefined, { isError }).render(
		200,
	)[0];
}

describe("ASCET result status rendering", () => {
	test("renders DONE only for verified applied or no-op mutations", () => {
		assert.match(status({ mutation: { status: "applied" }, verification: { status: "passed" } }), /Status: DONE/);
		assert.match(
			status({ mutation: { status: "no_op" }, verification: { status: "not_applicable" } }),
			/Status: DONE/,
		);
		assert.match(
			status({ mutation: { status: "not_started" }, verification: { status: "missing" } }),
			/Status: FAILED/,
		);
	});

	test("never lets process success hide a business error", () => {
		assert.match(
			status({ status: "ok", ok: false, error: { code: "create_method_capability_not_supported" } }),
			/Status: FAILED/,
		);
	});

	test("renders blocked, partial, rolled-back, and unknown distinctly", () => {
		assert.match(status({ status: "blocked", mutation: { status: "not_started" } }), /Status: BLOCKED/);
		assert.match(status({ mutation: { status: "applied" }, verification: { status: "failed" } }), /Status: PARTIAL/);
		assert.match(status({ mutation: { status: "rolled_back" } }), /Status: ROLLED BACK/);
		assert.match(status({ mutation: { status: "unknown" } }), /Status: UNKNOWN/);
	});

	test("renders approval waiting state while partial", () => {
		const line = renderAscetToolResult(
			{ details: { status: "waiting_approval" } },
			{ expanded: false, isPartial: true },
		).render(200)[0];
		assert.match(line, /Status: WAITING APPROVAL/);
	});

	test("maps composite dependency-chain terminal states without false DONE", () => {
		assert.match(status({ outcome: { status: "committed" } }), /Status: DONE/);
		assert.match(status({ outcome: { status: "no_change" } }), /Status: DONE/);
		assert.match(status({ outcome: { status: "rejected" } }), /Status: BLOCKED/);
		assert.match(status({ outcome: { status: "rolled_back" } }), /Status: ROLLED BACK/);
		assert.match(status({ outcome: { status: "rollback_failed" } }), /Status: PARTIAL/);
		assert.match(status({ outcome: { status: "unknown_outcome" } }), /Status: UNKNOWN/);
		assert.match(status({ outcome: { status: "error" } }), /Status: FAILED/);
	});

	test("reads normalized mutation envelopes and fails closed before mutation", () => {
		assert.match(
			status({
				mutationResult: {
					status: "ok",
					preflight: { status: "passed" },
					mutation: { status: "not_started" },
					verification: { status: "not_applicable" },
				},
			}),
			/Status: BLOCKED/,
		);
		assert.match(
			status({
				mutationResult: {
					status: "ok",
					mutation: { status: "applied" },
					verification: { status: "passed" },
				},
			}),
			/Status: DONE/,
		);
	});

	test("renders normalized permission, safety, lifecycle, and recovery evidence when expanded", () => {
		const lines = renderAscetToolResult(
			{
				details: {
					mutationResult: {
						status: "partial",
						permission: {
							mode: "acceptEdits",
							decision: "ask",
							risk: "medium",
							rule: { index: 2, behavior: "ask", action: "set_enumerators", path: "DEMO\\Enums" },
						},
						preflight: {
							status: "passed",
							evidence: { capability: { operation: "set_enumerators", status: "supported" } },
						},
						editability: { status: "acquired", finalEditableState: "editable" },
						mutation: { status: "partially_applied" },
						verification: { status: "failed" },
						bridge: { beforeBridge: true, bridgeEntered: true, backendResponseReceived: true },
						recovery: { required: true, actions: ["Re-read the target before retrying."] },
					},
				},
			},
			{ expanded: true, isPartial: false },
		).render(240);

		assert.ok(lines.some((line) => line === "Permission: acceptEdits · ask"));
		assert.ok(lines.some((line) => line === "Risk: medium"));
		assert.ok(lines.some((line) => line.includes("Rule: #2 · ask · set_enumerators")));
		assert.ok(lines.some((line) => line === "Preflight: passed · set_enumerators · supported"));
		assert.ok(lines.some((line) => line === "Editability: acquired · final=editable"));
		assert.ok(lines.some((line) => line === "Mutation: partially_applied"));
		assert.ok(lines.some((line) => line === "Verification: failed"));
		assert.ok(lines.some((line) => line === "Bridge: before=yes · entered=yes · response=yes"));
		assert.ok(lines.some((line) => line === "Recovery: Re-read the target before retrying."));
	});
});

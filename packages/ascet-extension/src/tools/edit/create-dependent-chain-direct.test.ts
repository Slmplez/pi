import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { ascetEditTool } from "./definition.ts";

function response(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

test("create_dependent_chain uses one direct Bridge operation without preview or read orchestration", async () => {
	const operations: string[] = [];
	const result = await ascetEditTool.execute(
		"create-dependent-chain-direct",
		{
			action: "create_dependent_chain",
			provider: {
				componentPath: "FeatureA/Provider",
				element: {
					name: "P_Threshold",
					modelType: "cont",
					unit: "",
					comment: "Provider",
					calibration: false,
					range: { mode: "none" },
					data: { mode: "ascetDefault" },
					implementation: { mode: "ascetDefault" },
				},
			},
			consumer: {
				componentPath: "FeatureA/Consumer",
				importedElement: { name: "P_Threshold", modelType: "cont", unit: "" },
				localElement: {
					name: "C_Threshold",
					modelType: "cont",
					unit: "",
					comment: "Dependent",
					calibration: false,
					range: { mode: "none" },
					implementation: { mode: "ascetDefault" },
				},
			},
			binding: { formula: "x", formal: "x", variantPolicy: "default" },
			intent: "apply",
		},
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
			ascetPermission: {
				mode: "default",
				rules: [],
				databaseFingerprint: "database-fingerprint",
				databaseFingerprintSource: "session",
			},
			hasUI: true,
			ui: { confirm: async () => true },
			executeCli: async (request) => {
				const operation = request.args[1] ?? "";
				operations.push(operation);
				if (operation === "get_database_identity") {
					return response(request, {
						items: [],
						database: { name: "DB", path: "C:/Repo/DB", identityStatus: "consistent", identityIssues: [] },
					});
				}
				if (operation === "configure_parameter_dependency_chain_execute") {
					const bridgeRequest = JSON.parse(readFileSync(request.args[2] ?? "", "utf8")) as {
						intent?: string;
						dependency?: { formula?: string; formals?: string[]; mappings?: Record<string, { name?: string }> };
					};
					assert.equal(bridgeRequest.dependency?.formula, "x");
					assert.deepEqual(bridgeRequest.dependency?.formals, ["x"]);
					assert.deepEqual(bridgeRequest.dependency?.mappings, {
						x: { kind: "parameter", name: "P_Threshold" },
					});
					return response(request, {
						outcome: "succeeded",
						status: "committed",
						writesPerformed: true,
						mutationStarted: true,
						changed: true,
						mutationStatus: "applied",
						saveAttempted: true,
						saveSucceeded: true,
						saveState: "saved",
						verified: true,
						verificationStatus: "passed",
						verificationMode: "same_session_dependency_endpoints",
						sessionCount: 1,
						saveCount: 1,
						editableRetryCount: 0,
						nativeMutationAttemptCount: 1,
						stages: [{ stage: "dependency", status: "configured", readbackVerified: true }],
						verification: { status: "passed", verified: true },
						rollback: { required: false, status: "not_required" },
					});
				}
				throw new Error(`Forbidden orchestration operation: ${operation}`);
			},
		},
	);

	assert.equal(result.details.outcome.status, "ok");
	assert.deepEqual(result.details.mutationResult?.permission, {
		mode: "default",
		decision: "ask",
		risk: "high",
		reason: "Default mode requires confirmation for every actual ASCET write.",
		path: "FeatureA\\Consumer",
		databaseFingerprintKnown: true,
		databaseFingerprintSource: "session",
		evidenceComplete: true,
		targetCount: 2,
		variantCount: 1,
		impactUnknown: false,
	});
	assert.equal(result.details.mutationResult?.audit?.databaseFingerprint, "database-fingerprint");
	assert.deepEqual(operations, ["configure_parameter_dependency_chain_execute"]);
});

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
			binding: { formula: "P_Threshold", formal: "P_Threshold", variantPolicy: "default" },
			intent: "apply",
		},
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
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
					};
					if (bridgeRequest.intent === "preview") {
						return response(request, {
							status: "preview",
							writesPerformed: false,
							mutationStarted: false,
							beforeState: { version: "one" },
							targets: [
								{ path: "FeatureA/Provider", oid: "provider", editable: true },
								{ path: "FeatureA/Consumer", oid: "consumer", editable: true },
							],
							stages: [{ stage: "dependency", status: "configure" }],
							verification: { status: "available", verified: false },
							rollback: { required: false, status: "not_required" },
						});
					}
					return response(request, {
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
	assert.deepEqual(operations, ["configure_parameter_dependency_chain_execute"]);
});

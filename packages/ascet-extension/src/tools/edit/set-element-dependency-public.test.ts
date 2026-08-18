import assert from "node:assert/strict";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { ascetEditTool } from "./definition.ts";

test("ascet_edit exposes set_element_dependency and routes one direct Bridge operation", async () => {
	let observedRequest: AscetCliRequest | undefined;
	const result = await ascetEditTool.execute(
		"set-element-dependency-public",
		{
			action: "set_element_dependency",
			targetPath: "FeatureA/Consumer",
			elementName: "C_Threshold",
			dependency: "dependent",
			dependencyFormula: "P_Threshold",
			dependencyMappings: { P_Threshold: "P_Threshold" },
			intent: "apply",
		},
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
			hasUI: true,
			ui: { confirm: async () => true },
			executeCli: async (request): Promise<AscetCliExecutionResult> => {
				observedRequest = request;
				return {
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
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
						},
						error: null,
					}),
					stderr: "",
					timedOut: false,
					request,
				};
			},
		},
	);

	assert.equal(result.details.outcome.status, "ok");
	assert.equal(observedRequest?.args[0], "exec");
	assert.equal(observedRequest?.args[1], "set_element_dependency");
	assert.deepEqual(result.details.command, {
		logicalCommandId: "AscetSetElementDependency",
		backendCommandId: "AscetSetElementDependency",
		operation: "set_element_dependency",
	});
});

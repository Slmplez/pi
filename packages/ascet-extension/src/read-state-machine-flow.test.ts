import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { Check } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	ascetReadStateMachineFlowParameters,
	formatReadStateMachineFlowResult,
	runAscetReadStateMachineFlow,
} from "./read-state-machine-flow.ts";

function execution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("read_state_machine_flow request", () => {
	test("passes topology through to the Bridge without changing the requested detail level", async () => {
		assert.equal(
			Check(ascetReadStateMachineFlowParameters, { componentPath: "DEMO/SM", detailLevel: "topology" }),
			true,
		);
		let observedArgs: string[] | undefined;
		const result = await runAscetReadStateMachineFlow(
			{ componentPath: "DEMO/SM", detailLevel: "topology" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return execution(request, {
						ComponentPath: "DEMO\\SM",
						DetailLevel: "topology",
						States: [{ StateName: "Idle", IsStartState: true }],
						Transitions: [],
					});
				},
			},
		);

		assert.deepEqual(observedArgs, [
			"exec",
			"read_state_machine_flow",
			"DEMO\\SM",
			"--detail-level",
			"topology",
			"--json",
		]);
		assert.equal((result.data as { result: { DetailLevel: string } }).result.DetailLevel, "topology");
	});

	test("keeps nested full-flow fields and traceDepth in the machine-readable output", () => {
		const formatted = formatReadStateMachineFlowResult({
			ok: true,
			data: {
				ok: true,
				result: {
					ComponentPath: "DEMO\\SM",
					TraceDepth: 2,
					StateFlows: [
						{
							StateName: "Idle",
							Bindings: [
								{
									Code: "enter();",
									CodeAnalysis: { Reads: ["input"], Writes: ["state"] },
								},
							],
						},
					],
					TransitionFlows: [{ TransitionName: "Idle_to_Run", Action: { Code: "run();" } }],
					ReferenceTrace: [{ ComponentPath: "DEMO\\Dep", Children: [{ ComponentPath: "DEMO\\Leaf" }] }],
				},
			},
			request: { cwd: process.cwd(), cliPath: "AscetBridge.exe", args: [], timeoutMs: 1000 },
			stdout: "",
			stderr: "",
			exitCode: 0,
			timedOut: false,
		});

		const payload = JSON.parse(formatted) as {
			traceDepth: number;
			stateFlows: Array<{ bindings: Array<{ code: string; codeAnalysis: { reads: string[] } }> }>;
			transitionFlows: Array<{ action: { code: string } }>;
			referenceTrace: Array<{ children: Array<{ component: string }> }>;
		};
		assert.equal(payload.traceDepth, 2);
		assert.equal(payload.stateFlows[0].bindings[0].code, "enter();");
		assert.deepEqual(payload.stateFlows[0].bindings[0].codeAnalysis.reads, ["input"]);
		assert.equal(payload.transitionFlows[0].action.code, "run();");
		assert.equal(payload.referenceTrace[0].children[0].component, "DEMO/Leaf");
	});
});

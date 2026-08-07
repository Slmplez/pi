import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	buildReadDependentChainArgs,
	formatReadDependentChainResult,
	runAscetReadDependentChain,
} from "./read-dependent-chain.ts";

function makeExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				component: "DEMO\\Consumer",
				dependent: { name: "K_Effective", scope: "local" },
				inputs: [],
				complete: true,
			},
			error: null,
			meta: { mode: "exec", operation: "read_dependent_chain" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ASCET read dependent chain", () => {
	test("builds an exact component read without discovery controls", () => {
		assert.deepEqual(
			buildReadDependentChainArgs({
				componentPath: "DEMO\\Consumer",
				dependentElement: "K_Effective",
				exporterComponentPath: "DEMO\\Provider",
			}),
			["exec", "read_dependent_chain", "DEMO\\Consumer", "K_Effective", "--exporter", "DEMO\\Provider", "--json"],
		);
	});

	test("performs exactly one live CLI read", async () => {
		const calls: AscetCliRequest[] = [];
		const result = await runAscetReadDependentChain(
			{
				componentPath: "DEMO\\Consumer",
				dependentElement: "K_Effective",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls.push(request);
					return makeExecution(request);
				},
			},
		);

		assert.equal(calls.length, 1);
		assert.deepEqual(calls[0]?.args, ["exec", "read_dependent_chain", "DEMO\\Consumer", "K_Effective", "--json"]);
		assert.equal(result.ok, true);
	});

	test("formats the live CLI result", async () => {
		const result = await runAscetReadDependentChain(
			{ componentPath: "DEMO\\Consumer", dependentElement: "K_Effective" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => makeExecution(request),
			},
		);

		assert.match(formatReadDependentChainResult(result), /DEMO[\\/]Consumer/);
		assert.match(formatReadDependentChainResult(result), /K_Effective/);
	});
});

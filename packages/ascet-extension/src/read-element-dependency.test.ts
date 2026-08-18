import assert from "node:assert/strict";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetReadElementDependency } from "./read-element-dependency.ts";

function execution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("read_element_dependency result semantics", () => {
	test("reports unavailable project enumeration as an error instead of an empty success", async () => {
		const result = await runAscetReadElementDependency(
			{
				targetPath: "DEMO\\Project",
				elementName: "P_Threshold",
				targetKind: "project",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					execution(request, {
						target: "DEMO\\Project",
						kind: "project",
						element: "P_Threshold",
						count: 0,
						matches: [],
						issues: ["project_component_enumeration_unavailable"],
					}),
			},
		);

		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "project_component_enumeration_unavailable");
	});

	test("keeps a completed empty project enumeration as a successful empty result", async () => {
		const result = await runAscetReadElementDependency(
			{
				targetPath: "DEMO\\Project",
				elementName: "P_Threshold",
				targetKind: "project",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) =>
					execution(request, {
						target: "DEMO\\Project",
						kind: "project",
						element: "P_Threshold",
						count: 0,
						matches: [],
						issues: [],
					}),
			},
		);

		assert.equal(result.ok, true);
	});
});

import assert from "node:assert/strict";
import test from "node:test";
import type { AscetCliRequest } from "../cli.ts";
import { createAscetScheduler } from "../scheduler/scheduler.ts";
import { buildInspectionPlan, normalizeInspectionResults, runAscetInspection } from "./inspection.ts";

function fixtureFor(args: string[]): unknown {
	const operation = args[1];
	if (operation === "read_component_summary")
		return { objectKind: "class", name: "AEB_Release", path: "AEB_Core/AEB_Release" };
	if (operation === "read_component_snapshot")
		return { objectKind: "class", cycles: { main: 0.01 }, methods: [{ name: "step" }] };
	if (operation === "read_component_children") {
		const group = args[args.indexOf("--group") + 1];
		if (group === "methods") return { items: [{ name: "step" }, { name: "reset" }] };
		if (group === "elements") {
			return {
				items: [
					{
						name: "vehicleSpeed",
						direction: "input",
						type: "float",
						min: 0,
						max: 200,
						step: 0.1,
						metadata: { threshold: 50, allowInvalid: true },
					},
					{ name: "brakeRequest", direction: "output", type: "bool" },
				],
			};
		}
		return { items: [{ path: "AEB_Core/AEB_Release", kind: "class" }] };
	}
	if (operation === "read_component_refs")
		return { references: [{ path: "AEB_Core/AEB_Environment", relation: "outgoing" }] };
	if (operation === "read_implementation") return { implementation: "default", elements: [] };
	if (operation === "read_method_signature") return { name: args[2], inputs: [], outputs: [] };
	if (operation === "read_method_code")
		return { language: "ESDL", code: "if (vehicleSpeed > 50) { brakeRequest = true; }" };
	return {};
}

function fakeExecuteCli(request: AscetCliRequest) {
	return Promise.resolve({
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: fixtureFor(request.args), meta: { operation: request.args[1] } }),
		stderr: "",
		timedOut: false,
		request,
	});
}

test("builds a serial inspection plan for component, interfaces and dependencies", () => {
	const plan = buildInspectionPlan({ componentPath: "AEB_Core/AEB_Release", objectKind: "class", traceDepth: 3 });
	assert.deepEqual(
		plan.map((entry) => entry.key),
		[
			"read_component_summary",
			"read_component_snapshot",
			"read_component_children:methods",
			"read_component_children:elements",
			"read_component_children:components",
			"read_component_refs",
			"read_implementation",
		],
	);
	assert.deepEqual(plan[1]?.args, [
		"exec",
		"read_component_snapshot",
		"AEB_Core/AEB_Release",
		"--trace-depth",
		"3",
		"--json",
	]);
});

test("runs inspection through the scheduler and normalizes methods, ports and dependencies", async () => {
	const scheduler = createAscetScheduler();
	const result = await runAscetInspection(
		{ componentPath: "AEB_Core/AEB_Release", objectKind: "class" },
		{ cwd: process.cwd(), cliPath: process.execPath, scheduler, executeCli: fakeExecuteCli },
	);
	assert.equal(result.inspection.complete, true);
	assert.equal(result.inspection.objectKind, "class");
	assert.deepEqual(
		result.inspection.methods.map((method) => method.name),
		["reset", "step"],
	);
	assert.deepEqual(
		result.inspection.interfaces.inputs.map((port) => port.name),
		["vehicleSpeed"],
	);
	assert.deepEqual(
		result.inspection.interfaces.outputs.map((port) => port.name),
		["brakeRequest"],
	);
	assert.deepEqual(
		result.inspection.dependencies.map((dependency) => dependency.path),
		["AEB_Core/AEB_Environment", "AEB_Core/AEB_Release"],
	);
	assert.equal(
		result.inspection.methods.find((method) => method.name === "step")?.code?.includes("brakeRequest"),
		true,
	);
	assert.equal(typeof result.inspection.sourceHash, "string");
	assert.equal(scheduler.getSnapshot().recentJobs.length >= 1, true);
	assert.equal(
		scheduler.getSnapshot().recentJobs.every((job) => job.resourceKey === "ascet.toolapi.global"),
		true,
	);
});

test("marks missing or failed inspection operations incomplete", () => {
	const inspection = normalizeInspectionResults(
		{ componentPath: "AEB_Core/AEB_Release", objectKind: "class" },
		{ read_component_summary: { ok: false, error: { message: "not found" } } },
	);
	assert.equal(inspection.complete, false);
	assert.equal(
		inspection.errors.some((message) => message.includes("not found")),
		true,
	);
});

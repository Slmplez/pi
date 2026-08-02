import assert from "node:assert/strict";
import test from "node:test";
import { generateAscetCases } from "./case-generator.ts";
import type { AscetInspection } from "./contracts.ts";

function inspection(): AscetInspection {
	return {
		schemaVersion: "ascet-inspection/v1",
		componentPath: "AEB_Core/AEB_Release",
		objectKind: "class",
		complete: true,
		summary: {},
		methods: [{ name: "step" }],
		interfaces: {
			inputs: [
				{
					name: "vehicleSpeed",
					direction: "input",
					min: 0,
					max: 200,
					step: 1,
					metadata: { threshold: 50, allowInvalid: true },
				},
			],
			outputs: [{ name: "brakeRequest", direction: "output", type: "bool" }],
			parameters: [],
			variables: [],
		},
		dependencies: [],
		stateMachine: { states: ["Idle", "Active"] },
		operations: [],
		warnings: [],
		errors: [],
		sourceHash: "inspection-hash",
	};
}

test("generates class_ut and component_ct with the required dependency modes", () => {
	const generated = generateAscetCases({
		runId: "run-001",
		componentPath: "AEB_Core/AEB_Release",
		inspection: inspection(),
		seed: "seed-1",
	});
	assert.equal(generated.deterministic, true);
	assert.deepEqual(generated.levels, ["class_ut", "component_ct"]);
	const classSuite = generated.contract.suites.find((suite) => suite.level === "class_ut");
	const componentSuite = generated.contract.suites.find((suite) => suite.level === "component_ct");
	assert.equal(classSuite?.dependencyMode, "stub");
	assert.equal(componentSuite?.dependencyMode, "real");
	assert.equal(
		classSuite?.cases.some((testCase) => testCase.id === "vehicleSpeed_threshold_at"),
		true,
	);
	assert.equal(
		classSuite?.cases.some((testCase) => testCase.id === "vehicleSpeed_invalid_input"),
		true,
	);
	assert.equal(
		componentSuite?.cases.some((testCase) => testCase.id === "state_transition"),
		true,
	);
});

test("same inspection and seed produce byte-equivalent contracts", () => {
	const input = { runId: "run-001", componentPath: "AEB_Core/AEB_Release", inspection: inspection(), seed: "seed-1" };
	const first = generateAscetCases(input);
	const second = generateAscetCases(input);
	assert.deepEqual(first, second);
});

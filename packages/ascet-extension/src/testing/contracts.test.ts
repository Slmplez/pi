import assert from "node:assert/strict";
import test from "node:test";
import { validateAscetTestContract, validateAscetTestRequest } from "./contract-validator.ts";

function validContract() {
	return {
		schemaVersion: "ascet-test-contract/v1",
		componentPath: "AEB_Core",
		suites: [
			{
				id: "AEB_Release_class_ut",
				level: "class_ut",
				entryPoint: "AEB_Release",
				dependencyMode: "stub",
				cases: [
					{
						id: "nominal",
						inputs: { vehicleSpeed: 50 },
						expectedOutputs: { brakeRequest: true },
						oracleSource: "requirement",
					},
				],
			},
			{
				id: "AEB_Core_component_ct",
				level: "component_ct",
				entryPoint: "AEB_Core",
				dependencyMode: "real",
				cycles: 10,
				cases: [
					{
						id: "normal_sequence",
						expectedSteps: [{ tick: 1, outputs: { brakeRequest: true } }],
					},
				],
			},
		],
	};
}

test("accepts a class_ut and component_ct contract", () => {
	const result = validateAscetTestContract(validContract());
	assert.deepEqual(result.errors, []);
	assert.equal(result.value?.suites.length, 2);
});

test("rejects module_ut and incorrect dependency modes", () => {
	const contract = validContract() as { suites: Array<Record<string, unknown>> };
	contract.suites[0].level = "module_ut";
	const result = validateAscetTestContract(contract);
	assert.ok(result.errors.some((error) => error.code === "invalid_level"));

	const dependencyContract = validContract() as { suites: Array<Record<string, unknown>> };
	dependencyContract.suites[0].dependencyMode = "real";
	const dependencyResult = validateAscetTestContract(dependencyContract);
	assert.ok(dependencyResult.errors.some((error) => error.code === "class_ut_dependency_mode"));
});

test("rejects duplicate suites and cases", () => {
	const contract = validContract() as { suites: Array<Record<string, unknown>> };
	contract.suites[1].id = contract.suites[0].id;
	(contract.suites[0].cases as Array<Record<string, unknown>>).push({
		id: "nominal",
		expectedOutputs: { brakeRequest: false },
	});
	const result = validateAscetTestContract(contract);
	assert.ok(result.errors.some((error) => error.code === "duplicate_suite"));
	assert.ok(result.errors.some((error) => error.code === "duplicate_case"));
});

test("validates request, approval gate and component path", () => {
	const result = validateAscetTestRequest({
		schemaVersion: "ascet-test-request/v1",
		runId: "run-001",
		componentPath: "AEB_Core",
		levels: ["class_ut", "component_ct"],
		contract: validContract(),
		executeLive: true,
	});
	assert.ok(result.errors.some((error) => error.code === "approval_missing"));

	const unsafe = validateAscetTestRequest({
		schemaVersion: "ascet-test-request/v1",
		runId: "run-002",
		componentPath: "../AEB_Core",
		levels: ["class_ut"],
		contract: validContract(),
	});
	assert.ok(unsafe.errors.some((error) => error.code === "unsafe_path"));
});

test("warns when a case has no oracle instead of claiming proof", () => {
	const contract = validContract() as { suites: Array<Record<string, unknown>> };
	const cases = contract.suites[0].cases as Array<Record<string, unknown>>;
	cases[0].expectedOutputs = {};
	delete cases[0].expectedSteps;
	const result = validateAscetTestContract(contract);
	assert.ok(result.warnings.some((warning) => warning.code === "trace_only_case"));
});

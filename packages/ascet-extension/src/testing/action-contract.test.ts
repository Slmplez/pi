import assert from "node:assert/strict";
import test from "node:test";
import { createAscetScheduler } from "../scheduler/scheduler.ts";
import type { AscetJob } from "../scheduler/types.ts";
import {
	ASCET_TEST_ACTIONS,
	classifyAscetTestAction,
	isAscetTestAction,
	parseAscetTestAction,
} from "./action-contract.ts";
import { runInternalAscetTest } from "./internal-runner.ts";

test("defines the internal AscetTest action surface", () => {
	assert.deepEqual(ASCET_TEST_ACTIONS, [
		"inspect",
		"generate-esdl",
		"generate-cases",
		"prepare",
		"apply",
		"export",
		"plan",
		"build",
		"run",
		"verify",
		"pipeline",
		"evidence",
	]);
	assert.equal(isAscetTestAction("pipeline"), true);
	assert.equal(isAscetTestAction("module_ut"), false);
	assert.throws(() => parseAscetTestAction("module_ut"), /Unsupported AscetTest action/);
});

test("routes live ASCET actions through the global scheduler resource", () => {
	assert.deepEqual(classifyAscetTestAction("inspect"), {
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
		commandId: "ascet_test_inspect",
	});
	assert.deepEqual(classifyAscetTestAction("apply", { executeLive: true }), {
		jobKind: "write",
		resourceKey: "ascet.toolapi.global",
		commandId: "ascet_test_apply",
	});
});

test("keeps offline build and test actions on an isolated test resource label", () => {
	assert.deepEqual(classifyAscetTestAction("build", { runId: "run-001" }), {
		jobKind: "maintenance",
		resourceKey: "ascet.test.run-001",
		commandId: "ascet_test_build",
	});
});

test("submits internal AscetTest execution to the current scheduler", async () => {
	let submitted: { resourceKey?: string; toolName: string; commandId: string; kind: string } | undefined;
	const scheduler = {
		submit<T>(job: AscetJob<T>) {
			submitted = {
				resourceKey: job.resourceKey,
				toolName: job.toolName,
				commandId: job.commandId,
				kind: job.kind,
			};
			return job.run(new AbortController().signal);
		},
		getSnapshot() {
			return createAscetScheduler().getSnapshot();
		},
	};

	const result = await runInternalAscetTest({
		cwd: process.cwd(),
		cliPath: process.execPath,
		action: "inspect",
		requestPath: "request.json",
		outputPath: "response.json",
		scheduler,
		executeCli: async (request) => ({
			exitCode: 0,
			stdout: JSON.stringify({ ok: true, action: request.args[1] }),
			stderr: "",
			timedOut: false,
			request,
		}),
	});

	assert.equal(result.ok, true);
	assert.deepEqual(submitted, {
		resourceKey: "ascet.toolapi.global",
		toolName: "ascet_test_internal",
		commandId: "ascet_test_inspect",
		kind: "read",
	});
});

test("scheduler diagnostics expose the active internal test resource", async () => {
	const scheduler = createAscetScheduler();
	let activeResource: string | undefined;
	await scheduler.submit({
		agentId: "test-agent",
		toolName: "ascet_test_internal",
		commandId: "ascet_test_build",
		kind: "maintenance",
		resourceKey: "ascet.test.run-001",
		queueTimeoutMs: 1000,
		executionTimeoutMs: 1000,
		run: async () => {
			activeResource = scheduler.getSnapshot().resource.key;
			return true;
		},
	});
	assert.equal(activeResource, "ascet.test.run-001");
});

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { setTimeout as delay } from "node:timers/promises";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { ascetEditTool } from "./definition.ts";

test("apply_element_spec keeps its generated spec alive until delayed Bridge consumption completes", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-element-spec-lifetime-"));
	let observedSpecFile: string | undefined;
	let existedAtBridgeEntry: boolean | undefined;
	let existedAfterDelay: boolean | undefined;
	try {
		const result = await ascetEditTool.execute(
			"apply-element-spec-lifetime",
			{
				action: "apply_element_spec",
				componentPath: "FeatureA/Consumer",
				elementIntent: "create",
				elements: [],
				intent: "apply",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				hasUI: true,
				ui: { confirm: async () => true },
				executeCli: async (request): Promise<AscetCliExecutionResult> => {
					observedSpecFile = request.args[3];
					assert.ok(observedSpecFile);
					existedAtBridgeEntry = existsSync(observedSpecFile);
					await delay(25);
					existedAfterDelay = existsSync(observedSpecFile);
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
								verificationMode: "same_session_requested_element_names",
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
		assert.equal(existedAtBridgeEntry, true);
		assert.equal(existedAfterDelay, true);
		assert.ok(observedSpecFile);
		assert.equal(existsSync(observedSpecFile), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

function successfulElementSpecExecution(request: AscetCliRequest): AscetCliExecutionResult {
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
				verificationMode: "same_session_requested_element_names",
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
}

test("apply_element_spec removes its generated spec after Bridge failure", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-element-spec-failure-"));
	let observedSpecFile: string | undefined;
	try {
		const result = await ascetEditTool.execute(
			"apply-element-spec-failure",
			{
				action: "apply_element_spec",
				componentPath: "FeatureA/Consumer",
				elementIntent: "create",
				elements: [],
				intent: "apply",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				hasUI: true,
				ui: { confirm: async () => true },
				executeCli: async (request) => {
					observedSpecFile = request.args[3];
					assert.ok(observedSpecFile);
					assert.equal(existsSync(observedSpecFile), true);
					return { exitCode: 1, stdout: "", stderr: "Bridge failed", timedOut: false, request };
				},
			},
		);
		assert.notEqual(result.details.outcome.status, "ok");
		assert.ok(observedSpecFile);
		assert.equal(existsSync(observedSpecFile), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("apply_element_spec removes its generated spec after abort", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-element-spec-abort-"));
	const controller = new AbortController();
	let observedSpecFile: string | undefined;
	try {
		const result = await ascetEditTool.execute(
			"apply-element-spec-abort",
			{
				action: "apply_element_spec",
				componentPath: "FeatureA/Consumer",
				elementIntent: "create",
				elements: [],
				intent: "apply",
			},
			controller.signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				hasUI: true,
				ui: { confirm: async () => true },
				executeCli: async (request) => {
					observedSpecFile = request.args[3];
					assert.ok(observedSpecFile);
					controller.abort();
					return { exitCode: null, stdout: "", stderr: "aborted", timedOut: false, aborted: true, request };
				},
			},
		);
		assert.notEqual(result.details.outcome.status, "ok");
		assert.ok(observedSpecFile);
		assert.equal(existsSync(observedSpecFile), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("concurrent apply_element_spec calls use distinct generated spec paths", async () => {
	const root = mkdtempSync(join(tmpdir(), "ascet-element-spec-concurrent-"));
	const observedSpecFiles: string[] = [];
	try {
		const execute = (componentPath: string) =>
			ascetEditTool.execute(
				`apply-element-spec-${componentPath}`,
				{ action: "apply_element_spec", componentPath, elementIntent: "create", elements: [], intent: "apply" },
				new AbortController().signal,
				undefined,
				{
					cwd: root,
					env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
					hasUI: true,
					ui: { confirm: async () => true },
					executeCli: async (request) => {
						const specFile = request.args[3];
						assert.ok(specFile);
						assert.equal(existsSync(specFile), true);
						observedSpecFiles.push(specFile);
						return successfulElementSpecExecution(request);
					},
				},
			);
		const results = await Promise.all([execute("FeatureA/ConsumerA"), execute("FeatureA/ConsumerB")]);
		assert.equal(new Set(observedSpecFiles).size, 2);
		for (const result of results) assert.equal(result.details.outcome.status, "ok");
		for (const specFile of observedSpecFiles) assert.equal(existsSync(specFile), false);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

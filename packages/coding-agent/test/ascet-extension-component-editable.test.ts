import { describe, expect, it } from "vitest";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../ascet-extension/src/cli.ts";
import {
	buildAscetEditabilityArgs,
	formatAscetEditabilityResult,
	runAscetEditability,
} from "../../ascet-extension/src/edit/editability.ts";
import { createAscetScheduler, getAscetCliLockSnapshot } from "../../ascet-extension/src/scheduler/index.ts";
import { ascetEditTool } from "../../ascet-extension/src/tools/edit/index.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

function tempRuntimeEnv() {
	return { PI_ASCET_RUNTIME_DIR: `${process.cwd()}\\.tmp\\pi-ascet-component-editable-test-${process.pid}` };
}

function checkResult(editable: boolean) {
	return {
		outcome: "succeeded",
		editable,
		mutationStatus: "read_only",
		changed: false,
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_scm_state",
		sessionCount: 1,
		nativeMutationAttemptCount: 0,
	};
}

function setResult(overrides: Record<string, unknown> = {}) {
	return {
		outcome: "succeeded",
		editable: true,
		beforeEditable: false,
		afterEditable: true,
		changed: true,
		mutationStatus: "applied",
		saveAttempted: false,
		saveSucceeded: false,
		saveState: "not_applicable",
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_scm_state",
		sessionCount: 1,
		saveCount: 0,
		nativeMutationAttemptCount: 1,
		nativeScmOperationCount: 1,
		nativeOperations: [{ name: "Lock", attempted: true, returned: true, threw: false }],
		recovery: { required: false, actions: [] },
		...overrides,
	};
}

describe("ASCET component editable PI tool", () => {
	it("builds AscetBridge exec check and set invocations with canonical output", () => {
		expect(buildAscetEditabilityArgs({ mode: "check", componentPath: "DEMO/PID" })).toEqual([
			"exec",
			"component_editable_check",
			"DEMO\\PID",
			"--json",
		]);
		expect(buildAscetEditabilityArgs({ mode: "set", componentPath: "\\DEMO\\PID" })).toEqual([
			"exec",
			"component_editable_set",
			"DEMO\\PID",
			"--json",
		]);
		expect(JSON.parse(formatAscetEditabilityResult({ ok: true, data: checkResult(true) } as never))).toEqual(
			checkResult(true),
		);
		expect(JSON.parse(formatAscetEditabilityResult({ ok: true, data: checkResult(false) } as never))).toEqual(
			checkResult(false),
		);
	});

	it("runs AscetBridge exec through the PI scheduler and CLI lock", async () => {
		const env = tempRuntimeEnv();
		const scheduler = createAscetScheduler();
		let sawLock = false;

		const result = await runAscetEditability(
			{ mode: "check", componentPath: "DEMO\\PID" },
			{
				cwd: repoRoot,
				env,
				scheduler,
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					sawLock = (await getAscetCliLockSnapshot({ env })).locked;
					expect(request.cliPath.replaceAll("\\", "/")).toMatch(/ascet-cli\/bin\/AscetBridge\.exe$/);
					expect(request.args).toEqual(["exec", "component_editable_check", "DEMO\\PID", "--json"]);
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: checkResult(true), error: null, meta: { mode: "exec" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		expect(result.ok).toBe(true);
		expect(result.data).toEqual(checkResult(true));
		expect(sawLock).toBe(true);
		expect((await getAscetCliLockSnapshot({ env })).locked).toBe(false);
		expect(scheduler.getSnapshot().recentJobs.at(-1)).toMatchObject({
			toolName: "ascet_edit",
			commandId: "component_editable_check",
			kind: "read",
		});
	});

	it("treats an AscetBridge set result with editable=false as a failed write", async () => {
		const scheduler = createAscetScheduler();
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO\\PID", intent: "apply" },
			{
				cwd: repoRoot,
				scheduler,
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
					exitCode: 2,
					stdout: JSON.stringify({
						type: "response",
						protocolVersion: 1,
						ok: false,
						result: setResult({
							outcome: "failed",
							editable: false,
							afterEditable: false,
							changed: false,
							mutationStatus: "verification_failed",
							verified: false,
							verificationStatus: "failed",
							error: { code: "component_not_editable", message: "Component remains read-only." },
							recovery: { required: true, actions: ["Inspect SCM state before retrying."] },
						}),
						error: { code: "component_not_editable", message: "Component remains read-only." },
						meta: {
							bridgePid: 1,
							bridgeGeneration: "test",
							durationMs: 1,
							sessionPolicy: "fresh_session",
							mode: "exec",
							mutationStarted: true,
						},
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(result.ok).toBe(false);
		expect(result.data).toMatchObject({ outcome: "failed", editable: false, mutationStatus: "verification_failed" });
		expect(result.error?.code).toBe("write_outcome_unknown");
		expect(JSON.parse(formatAscetEditabilityResult(result))).toMatchObject({
			error: { code: "component_not_editable" },
		});
		expect(scheduler.getSnapshot().recentJobs.at(-1)).toMatchObject({
			toolName: "ascet_edit",
			commandId: "component_editable_set",
			kind: "write",
		});
	});

	it("preserves structured mode=set mutation telemetry", async () => {
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO\\PID", intent: "apply" },
			{
				cwd: repoRoot,
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: setResult({
							beforeEditable: true,
							changed: false,
							mutationStatus: "no_op",
							nativeMutationAttemptCount: 0,
							nativeScmOperationCount: 0,
							nativeOperations: [],
						}),
						error: null,
						meta: { mode: "exec", mutationStarted: false },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(result.ok).toBe(true);
		expect(result.data).toMatchObject({ editable: true, changed: false, mutationStatus: "no_op" });
		expect(
			JSON.parse(formatAscetEditabilityResult(result, { mode: "set", componentPath: "DEMO\\PID", intent: "apply" })),
		).toMatchObject({
			editable: true,
			changed: false,
			mutationStatus: "no_op",
		});
	});
	it("registers the canonical PI tool and returns canonical check content", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_edit")?.definition;

		expect(tool).toMatchObject({ name: "ascet_edit", executionMode: "sequential" });

		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "check", componentPath: "DEMO\\PID" },
			new AbortController().signal,
			undefined,
			{
				cwd: repoRoot,
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: checkResult(true), error: null, meta: { mode: "exec" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(JSON.parse(text)).toEqual(checkResult(true));
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});

	it("uses the same intent permission gate as ascet_edit for set mode", async () => {
		let confirmCalled = false;
		const executedOperations: string[] = [];
		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "set", componentPath: "DEMO\\PID", intent: "preview" } as unknown as Parameters<
				typeof ascetEditTool.execute
			>[1],
			new AbortController().signal,
			undefined,
			{
				cwd: repoRoot,
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalled = true;
						return true;
					},
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					executedOperations.push(request.args[1] ?? "");
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: checkResult(true), error: null, meta: { mode: "exec" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(confirmCalled).toBe(false);
		expect(executedOperations).toEqual([]);
		expect(JSON.parse(text)).toMatchObject({ error: { code: "invalid_variant" } });
	});

	it("returns a structured error when confirmed set mode leaves the component read-only", async () => {
		let confirmCalled = false;
		const executedOperations: string[] = [];
		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "set", componentPath: "DEMO\\PID", intent: "apply" },
			new AbortController().signal,
			undefined,
			{
				cwd: repoRoot,
				hasUI: true,
				ui: {
					confirm: async (title: string, message: string) => {
						confirmCalled = true;
						expect(title).toBe("Make ASCET component editable?");
						expect(message).toBe("Target: DEMO\\PID");
						return true;
					},
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					executedOperations.push(request.args[1] ?? "");
					return {
						exitCode: 2,
						stdout: JSON.stringify({
							type: "response",
							protocolVersion: 1,
							ok: false,
							result: setResult({
								outcome: "failed",
								editable: false,
								afterEditable: false,
								changed: false,
								mutationStatus: "verification_failed",
								verified: false,
								verificationStatus: "failed",
								error: { code: "component_not_editable", message: "Component remains read-only." },
								recovery: { required: true, actions: ["Inspect SCM state before retrying."] },
							}),
							error: { code: "component_not_editable", message: "Component remains read-only." },
							meta: {
								bridgePid: 1,
								bridgeGeneration: "test",
								durationMs: 1,
								sessionPolicy: "fresh_session",
								mode: "exec",
								mutationStarted: true,
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(confirmCalled).toBe(true);
		expect(executedOperations).toEqual(["component_editable_set"]);

		expect(JSON.parse(text)).toMatchObject({ error: { code: "component_not_editable" } });
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});
});

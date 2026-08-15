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

describe("ASCET component editable PI tool", () => {
	it("builds AscetBridge exec check and set invocations with JSON primitive output", () => {
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
		expect(JSON.parse(formatAscetEditabilityResult({ ok: true, data: true } as never))).toEqual({ editable: true });
		expect(JSON.parse(formatAscetEditabilityResult({ ok: true, data: false } as never))).toEqual({ editable: false });
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
						stdout: JSON.stringify({ ok: true, result: { editable: true }, error: null, meta: { mode: "exec" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		expect(result.ok).toBe(true);
		expect(result.data).toBe(true);
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
			{ mode: "set", componentPath: "DEMO\\PID", intent: "preview" },
			{
				cwd: repoRoot,
				scheduler,
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { editable: false }, error: null, meta: { mode: "exec" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		expect(result.ok).toBe(false);
		expect(result.data).toBe(false);
		expect(result.error?.code).toBe("component_not_editable");
		expect(JSON.parse(formatAscetEditabilityResult(result))).toMatchObject({
			error: { code: "component_not_editable" },
		});
		expect(scheduler.getSnapshot().recentJobs.at(-1)).toMatchObject({
			toolName: "ascet_edit",
			commandId: "component_editable_set",
			kind: "write",
		});
	});

	it("registers the canonical PI tool and returns bare boolean tool content", async () => {
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
					stdout: JSON.stringify({ ok: true, result: true, error: null, meta: { mode: "exec" } }),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(JSON.parse(text)).toEqual({ editable: true });
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});

	it("uses the same intent permission gate as ascet_edit for set mode", async () => {
		let confirmCalled = false;
		const executedOperations: string[] = [];
		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "set", componentPath: "DEMO\\PID", intent: "preview" },
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
						stdout: JSON.stringify({ ok: true, result: true, error: null, meta: { mode: "exec" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(confirmCalled).toBe(false);
		expect(executedOperations).toEqual(["component_editable_check"]);
		expect(JSON.parse(text)).toEqual({ editable: true });
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
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
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: false, error: null, meta: { mode: "exec" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		const text = response.content[0]?.type === "text" ? response.content[0].text : "";

		expect(confirmCalled).toBe(true);
		expect(executedOperations).toEqual([
			"component_editable_check",
			"component_editable_check",
			"component_editable_set",
		]);
		expect(JSON.parse(text)).toMatchObject({ error: { code: "component_not_editable" } });
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});
});

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

	it("unwraps the AscetBridge exec envelope with an editable object result", async () => {
		const scheduler = createAscetScheduler();
		const result = await runAscetEditability(
			{ mode: "set", componentPath: "DEMO\\PID" },
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

		expect(result.ok).toBe(true);
		expect(result.data).toBe(false);
		expect(JSON.parse(formatAscetEditabilityResult(result))).toEqual({ editable: false });
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

	it("uses the same executeWrite permission gate as ascet_edit for set mode", async () => {
		let confirmCalled = false;
		let executed = false;
		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "set", componentPath: "DEMO\\PID" },
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
					executed = true;
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
		expect(executed).toBe(false);
		expect(text).toContain("ascet_edit_preflight_required");
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});

	it("requires confirmation after executeWrite=true for set mode and still returns bare boolean content", async () => {
		let confirmCalled = false;
		let executed = false;
		const response = await ascetEditTool.execute(
			"editable",
			{ mode: "set", componentPath: "DEMO\\PID", executeWrite: true },
			new AbortController().signal,
			undefined,
			{
				cwd: repoRoot,
				hasUI: true,
				ui: {
					confirm: async (_title: string, message: string) => {
						confirmCalled = true;
						expect(message).toContain("DEMO\\PID");
						return true;
					},
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					executed = true;
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
		expect(executed).toBe(true);
		expect(JSON.parse(text)).toEqual({ editable: false });
		expect(text).not.toContain('"ok"');
		expect(text).not.toContain('"action"');
	});
});

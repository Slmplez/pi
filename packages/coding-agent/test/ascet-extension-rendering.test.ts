import { describe, expect, test } from "vitest";
import { renderAscetToolCall, renderAscetToolResult } from "../../ascet-extension/src/rendering.ts";

const theme = {
	bold: (text: string) => text,
	fg: (_role: string, text: string) => text,
};

const renderCall = renderAscetToolCall as unknown as (...args: any[]) => { render(width: number): string[] };
const renderResult = renderAscetToolResult as unknown as (...args: any[]) => { render(width: number): string[] };

function lines(value: { render(width: number): string[] }): string {
	return value.render(160).join("\n");
}

describe("ASCET shared renderer", () => {
	test("renders ARGS before parameters are complete", () => {
		const rendered = lines(
			renderCall({ action: "read", componentPath: "DEMO\\PID" }, theme, {
				toolName: "ascet_read",
				argsComplete: false,
				executionStarted: false,
				hasResult: false,
			}),
		);

		expect(rendered).toContain("Status: ARGS");
	});

	test("renders QUEUED after parameters are complete but before execution starts", () => {
		const rendered = lines(
			renderCall({ action: "read", componentPath: "DEMO\\PID" }, theme, {
				toolName: "ascet_read",
				argsComplete: true,
				executionStarted: false,
				hasResult: false,
			}),
		);

		expect(rendered).toContain("Status: QUEUED");
	});

	test("does not keep the pending status when a host marks the result final", () => {
		const rendered = lines(
			renderCall({ action: "tree", target: { targetPathPrefix: "DEMO" } }, theme, {
				toolName: "ascet_get",
				executionStarted: true,
				isPartial: false,
				hasResult: undefined,
			}),
		);

		expect(rendered).not.toContain("Status: RUNNING");
	});

	test("renders action, target, and running state while a tool is executing", () => {
		const rendered = lines(
			renderCall({ action: "read_code", componentPath: "DEMO\\PID", methodName: "calc" }, theme, {
				toolName: "ascet_read",
				argsComplete: true,
				executionStarted: true,
				hasResult: false,
			}),
		);

		expect(rendered).toContain("ASCET Read · read_code");
		expect(rendered).toContain("Target: DEMO\\PID.calc");
		expect(rendered).toContain("Status: RUNNING");
	});

	test("renders a successful result with summary, counts, and duration", () => {
		const rendered = lines(
			renderResult(
				{
					details: {
						ok: true,
						action: "read_code",
						data: { result: { summary: "Class PID method calc" } },
						counts: { methods: 1 },
						diagnostics: { executionMs: 1800 },
					},
				},
				{ expanded: false, isPartial: false },
				theme,
				{ toolName: "ascet_read", hasResult: true },
			),
		);

		expect(rendered).toContain("Status: DONE");
		expect(rendered).toContain("Class PID method calc");
		expect(rendered).toContain("methods=1");
		expect(rendered).toContain("1.8s");
	});

	test("keeps multiline summaries compact in the collapsed status card", () => {
		const rendered = renderResult(
			{
				details: {
					ok: true,
					summary: "ASCET status: ready\nASCET installation: ready\n[ok] code_terms 2620",
				},
			},
			{ expanded: false, isPartial: false },
			theme,
			{ toolName: "ascet_status", hasResult: true },
		).render(160);

		expect(rendered).toEqual(["Status: DONE · ASCET status: ready"]);
	});

	test("renders an explicit readback phase for partial results", () => {
		const rendered = lines(
			renderResult(
				{ details: { status: "readback", progress: { message: "Checking saved method" } } },
				{ expanded: false, isPartial: true },
				theme,
				{ toolName: "ascet_write", hasResult: true, executionStarted: true },
			),
		);

		expect(rendered).toContain("Status: READBACK");
	});

	test("renders long targets with a readable suffix", () => {
		const rendered = renderCall(
			{
				action: "read_code",
				componentPath: "DEMO\\VeryLongFolderName\\AnotherLongFolder\\PID",
				methodName: "calc",
			},
			theme,
			{ toolName: "ascet_read", argsComplete: true, executionStarted: true, hasResult: false },
		).render(48);

		expect(rendered.join("\n")).toContain(".calc");
	});

	test("renders timeout and retryability without leaking raw JSON in collapsed mode", () => {
		const rendered = lines(
			renderResult(
				{
					details: {
						ok: false,
						action: "read",
						error: { code: "ascet_scheduler_exec_timeout", message: "ASCET execution timed out." },
						diagnostics: { stage: "scheduler_exec", retryable: true },
					},
				},
				{ expanded: false, isPartial: false },
				theme,
				{ toolName: "ascet_read", hasResult: true },
			),
		);

		expect(rendered).toContain("Status: TIMEOUT");
		expect(rendered).toContain("Retryable");
		expect(rendered).toContain("ascet_scheduler_exec_timeout");
		expect(rendered).not.toContain('"diagnostics"');
	});

	test("renders blocked outcomes and expanded recovery details", () => {
		const rendered = lines(
			renderResult(
				{
					details: {
						ok: false,
						status: "blocked",
						action: "set_method_code",
						error: {
							code: "confirmation_not_granted",
							message: "Confirmation is required.",
							recoveryActions: ["Confirm the write", "Run preflight again"],
						},
						command: {
							logicalCommandId: "AscetSetMethodCode",
							backendCommandId: "AscetSetClassMethodCode",
							operation: "set_method_code",
						},
						diagnostics: { queueWaitMs: 12, executionMs: 1800 },
						artifact: { path: "C:\\tmp\\ascet-result.json" },
					},
				},
				{ expanded: true, isPartial: false },
				theme,
				{ toolName: "ascet_write", hasResult: true },
			),
		);

		expect(rendered).toContain("Status: BLOCKED");
		expect(rendered).toContain("confirmation_not_granted");
		expect(rendered).toContain("Logical: AscetSetMethodCode");
		expect(rendered).toContain("Backend: AscetSetClassMethodCode");
		expect(rendered).toContain("Queue: 12ms");
		expect(rendered).toContain("Execution: 1.8s");
		expect(rendered).toContain("Artifact: C:\\tmp\\ascet-result.json");
		expect(rendered).toContain("Recovery: Confirm the write; Run preflight again");
	});
});

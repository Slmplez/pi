import assert from "node:assert/strict";
import { test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { canonicalAscetToolNames } from "../registry.ts";
import { ascetEditTool } from "./definition.ts";
import { ascetEditManifest } from "./manifest.ts";

function editableExecution(request: AscetCliRequest, editable: boolean): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: editable, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

test("ascet_edit remains canonical while the dependency-chain composite is explicitly registered", () => {
	const names: readonly string[] = canonicalAscetToolNames;
	assert.equal(ascetEditTool.name, "ascet_edit");
	assert.deepEqual(names, [
		"ascet_status",
		"ascet_capabilities",
		"ascet_recover",
		"ascet_scheduler_status",
		"ascet_get",
		"ascet_read",
		"ascet_diff",
		"ascet_edit",
		"configure_parameter_dependency_chain",
	]);
	assert.deepEqual([...ascetEditManifest.map((route) => route.action)].sort(), [
		"apply_element_spec",
		"apply_project_formula",
		"check",
		"create_component",
		"create_folder",
		"create_method",
		"delete_component",
		"delete_folder",
		"delete_method",
		"set",
		"set_element_dependency",
		"set_enumerators",
		"set_method_code",
		"set_method_signature",
		"set_module_code",
		"set_state_machine_code",
	]);
});

test("ascet_edit check keeps the editability value and backend operation", async () => {
	let observedArgs: string[] | undefined;
	const result = await ascetEditTool.execute(
		"call-1",
		{ mode: "check", componentPath: "DEMO/PID" },
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
			executeCli: async (request) => {
				observedArgs = request.args;
				return editableExecution(request, true);
			},
		},
	);

	assert.deepEqual(observedArgs, ["exec", "component_editable_check", "DEMO\\PID", "--json"]);
	assert.equal(result.details.tool, "ascet_edit");
	assert.equal(result.details.action, "check");
	assert.equal(result.details.mode, "check");
	assert.equal(result.details.value, true);
	assert.deepEqual(result.details.command, {
		logicalCommandId: "AscetComponentEditableCheck",
		backendCommandId: "AscetComponentEditableCheck",
		operation: "component_editable_check",
	});
	assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), { editable: true });
});

test("ascet_edit write actions remain preflight by default", async () => {
	const result = await ascetEditTool.execute(
		"call-1",
		{ action: "create_folder", folderPath: "DEMO/New" },
		new AbortController().signal,
		undefined,
		{ cwd: process.cwd() },
	);

	assert.equal(result.details.outcome.status, "preflight");
	assert.deepEqual(result.details.command, {
		logicalCommandId: "AscetCreateFolder",
		backendCommandId: "AscetCreateFolder",
		operation: "create_folder",
	});
});

test("ascet_edit returns a blocked outcome when confirmation is not granted", async () => {
	let cliCalls = 0;
	const result = await ascetEditTool.execute(
		"call-1",
		{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
			executeCli: async (request) => {
				cliCalls += 1;
				return editableExecution(request, true);
			},
			hasUI: true,
			ui: { confirm: async () => false },
		},
	);

	assert.equal(cliCalls, 0);
	assert.equal(result.details.outcome.status, "blocked");
	if (result.details.outcome.status === "blocked") {
		assert.equal(result.details.outcome.code, "ascet_edit_confirmation_not_granted");
	}
	assert.deepEqual(result.details.raw?.data, {
		operation: "create_folder",
		summary: "ASCET edit request:\noperation: create_folder\nfolderPath: DEMO/New\nverifyReadback: true",
		writeExecuted: false,
		confirmation: { code: "ascet_edit_confirmation_not_granted" },
	});
});

test("ascet_edit keeps confirmation independent from a cancelled tool run and never writes afterward", async () => {
	const toolRun = new AbortController();
	let cliCalls = 0;
	let confirmationSignal: AbortSignal | undefined;
	const result = await ascetEditTool.execute(
		"call-1",
		{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
		toolRun.signal,
		undefined,
		{
			cwd: process.cwd(),
			executeCli: async (request) => {
				cliCalls += 1;
				return editableExecution(request, true);
			},
			hasUI: true,
			ui: {
				confirm: async (_title, _message, options) => {
					confirmationSignal = options?.signal;
					toolRun.abort();
					return true;
				},
			},
		},
	);

	assert.equal(confirmationSignal, undefined);
	assert.equal(cliCalls, 0);
	assert.equal(result.details.outcome.status, "blocked");
	if (result.details.outcome.status === "blocked") {
		assert.equal(result.details.outcome.code, "ascet_edit_operation_aborted_before_write");
	}
	assert.deepEqual(result.details.raw?.data, {
		operation: "create_folder",
		summary: "ASCET edit request:\noperation: create_folder\nfolderPath: DEMO/New\nverifyReadback: true",
		writeExecuted: false,
		confirmation: { code: "ascet_edit_operation_aborted_before_write" },
	});
});

test("ascet_edit reports a confirmation UI failure as an error", async () => {
	const result = await ascetEditTool.execute(
		"call-1",
		{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
		new AbortController().signal,
		undefined,
		{
			cwd: process.cwd(),
			hasUI: true,
			ui: {
				confirm: async () => {
					throw new Error("renderer disconnected");
				},
			},
		},
	);

	assert.equal(result.details.outcome.status, "error");
	if (result.details.outcome.status === "error") {
		assert.equal(result.details.outcome.error.code, "ascet_edit_confirmation_ui_failed");
	}
});

test("ascet_edit set routes through the unified approval path", async () => {
	const result = await ascetEditTool.execute(
		"call-1",
		{ mode: "set", componentPath: "DEMO/PID", executeWrite: true },
		new AbortController().signal,
		undefined,
		{ cwd: process.cwd() },
	);

	assert.equal(result.details.tool, "ascet_edit");
	assert.equal(result.details.action, "set");
	assert.equal(result.details.mode, "set");
	assert.equal(result.details.error?.code, "ascet_edit_ui_required");
	assert.deepEqual(result.details.command, {
		logicalCommandId: "AscetComponentEditableSet",
		backendCommandId: "AscetComponentEditableSet",
		operation: "component_editable_set",
	});
});

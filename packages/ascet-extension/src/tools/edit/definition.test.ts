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

test("ascet_edit is the sole canonical edit tool", () => {
	const names: readonly string[] = canonicalAscetToolNames;
	assert.equal(ascetEditTool.name, "ascet_edit");
	assert.deepEqual(names, [
		"ascet_status",
		"ascet_capabilities",
		"ascet_index",
		"ascet_recover",
		"ascet_scheduler_status",
		"ascet_explore",
		"ascet_search",
		"ascet_read",
		"ascet_diff",
		"ascet_edit",
		"ascet_verify",
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

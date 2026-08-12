import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
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

function guardedCreateFolderExecution(request: AscetCliRequest): AscetCliExecutionResult {
	const operation = request.args[1];
	const result =
		operation === "get_database_identity"
			? { database: { name: "DB", path: "C:/Repo/DB" } }
			: operation === "get_tree"
				? {
						items: [{ path: "DEMO", oid: "F-1", kind: "folder" }],
						coverage: {
							status: "complete_for_scope",
							completeness: "complete",
							collectorCompleted: true,
						},
						truncated: false,
						database: { name: "DB", path: "C:/Repo/DB" },
					}
				: { writeSucceeded: true, verifyReadbackRequested: true, readbackVerified: true };
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
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
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-denied-"));
	let mutationDispatches = 0;
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => {
					if (request.args[1] !== "get_database_identity" && request.args[1] !== "get_tree") {
						mutationDispatches++;
					}
					return guardedCreateFolderExecution(request);
				},
				hasUI: true,
				ui: { confirm: async () => false },
			},
		);

		assert.equal(mutationDispatches, 0);
		assert.equal(result.details.outcome.status, "blocked");
		if (result.details.outcome.status === "blocked") {
			assert.equal(result.details.outcome.code, "ascet_edit_confirmation_not_granted");
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ascet_edit keeps confirmation independent from a cancelled tool run and never writes afterward", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-cancelled-"));
	const toolRun = new AbortController();
	let mutationDispatches = 0;
	let confirmationSignal: AbortSignal | undefined;
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
			toolRun.signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => {
					if (request.args[1] !== "get_database_identity" && request.args[1] !== "get_tree") {
						mutationDispatches++;
					}
					return guardedCreateFolderExecution(request);
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
		assert.equal(mutationDispatches, 0);
		assert.equal(result.details.outcome.status, "blocked");
		if (result.details.outcome.status === "blocked") {
			assert.equal(result.details.outcome.code, "ascet_edit_operation_aborted_before_write");
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ascet_edit reports a confirmation UI failure as an error", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-ui-failure-"));
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", executeWrite: true },
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => guardedCreateFolderExecution(request),
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
	} finally {
		rmSync(root, { recursive: true, force: true });
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

test("reports only selected set_element_dependency schema errors", async () => {
	const invalidParams = {
		action: "set_element_dependency",
		targetPath: "DEMO\\Consumer",
		elementName: "C_K",
		dependency: "dependent",
		folderPath: "DEMO\\Unexpected",
	} as unknown as Parameters<typeof ascetEditTool.execute>[1];
	const result = await ascetEditTool.execute("call-1", invalidParams, new AbortController().signal, undefined, {
		cwd: process.cwd(),
	});

	const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
		error?: { details?: { errors?: Array<{ message?: string; path?: string }> } };
	};
	const errors = payload.error?.details?.errors ?? [];
	assert.ok(errors.length > 0);
	assert.equal(
		errors.some((error) => error.message?.includes("folderPath must have required properties")),
		false,
	);
	assert.equal(
		errors.some((error) => error.message?.includes("componentPath must have required properties")),
		false,
	);
	assert.equal(
		errors.some((error) => error.message?.includes("methodName must have required properties")),
		false,
	);
});

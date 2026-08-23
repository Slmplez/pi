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
		stdout: JSON.stringify({
			ok: true,
			result: {
				outcome: "succeeded",
				editable,
				mutationStatus: "read_only",
				changed: false,
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_scm_state",
				sessionCount: 1,
				nativeMutationAttemptCount: 0,
			},
			error: null,
		}),
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
			: operation === "preflight_create_folder"
				? {
						folderPath: request.args[2],
						databasePath: "C:/Repo/DB",
						existing: ["DEMO"],
						willCreate: [request.args[2]],
						conflicts: [],
						capability: {
							status: "supported",
							methods: ["AddFolder(String)"],
							saveAvailable: true,
							readbackAvailable: true,
						},
						noOp: false,
					}
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

test("ascet_edit remains canonical and the retired dependency-chain composite is not registered", () => {
	const names: readonly string[] = canonicalAscetToolNames;
	assert.equal(ascetEditTool.name, "ascet_edit");
	assert.deepEqual(names, [
		"ascet_status",
		"ascet_capabilities",
		"ascet_recover",
		"ascet_scheduler_status",
		"ascet_search",
		"ascet_get",
		"ascet_read",
		"ascet_diff",
		"ascet_edit",
	]);
	assert.deepEqual([...ascetEditManifest.map((route) => route.action)].sort(), [
		"apply_element_spec",
		"apply_project_formula",
		"check",
		"create_component",
		"create_dependent_chain",
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
	assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
		outcome: "succeeded",
		editable: true,
		mutationStatus: "read_only",
		changed: false,
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_scm_state",
		sessionCount: 1,
		nativeMutationAttemptCount: 0,
	});
});

test("ascet_edit rejects retired preview writes before Bridge dispatch", async () => {
	const result = await ascetEditTool.execute(
		"call-1",
		{ action: "create_folder", folderPath: "DEMO/New", intent: "preview" } as unknown as Parameters<
			typeof ascetEditTool.execute
		>[1],
		new AbortController().signal,
		undefined,
		{ cwd: process.cwd() },
	);

	assert.equal((result.details as { ok?: boolean }).ok, false);
	assert.equal(result.details.error?.code, "invalid_variant");
	assert.equal(result.details.command, undefined);
});

test("ascet_edit returns a blocked outcome when confirmation is not granted", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-denied-"));
	let mutationDispatches = 0;
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => {
					if (request.args[1] === "create_folder") mutationDispatches++;
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

test("ascet_edit applies exact scoped deny settings to the planned write target", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-scoped-deny-"));
	let confirmations = 0;
	let mutationDispatches = 0;
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/Denied", intent: "apply" },
			new AbortController().signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				ascetPermission: {
					mode: "auto",
					rules: [{ behavior: "deny", action: "create_folder", path: "DEMO\\Denied" }],
				},
				executeCli: async (request) => {
					if (request.args[1] === "create_folder") mutationDispatches++;
					return guardedCreateFolderExecution(request);
				},
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmations++;
						return true;
					},
				},
			},
		);

		assert.equal(result.details.outcome.status, "blocked");
		if (result.details.outcome.status === "blocked") {
			assert.equal(result.details.outcome.code, "ascet_edit_permission_denied");
		}
		assert.equal(result.details.mutationResult?.permission.decision, "deny");
		assert.equal(result.details.mutationResult?.permission.rule?.path, "DEMO\\Denied");
		assert.equal(result.details.mutationResult?.bridge.bridgeEntered, false);
		assert.equal(confirmations, 0);
		assert.equal(mutationDispatches, 0);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ascet_edit cancels approval with the tool run and never writes afterward", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-cancelled-"));
	const toolRun = new AbortController();
	let mutationDispatches = 0;
	let confirmationSignal: AbortSignal | undefined;
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			toolRun.signal,
			undefined,
			{
				cwd: root,
				env: { PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts") },
				executeCli: async (request) => {
					if (request.args[1] === "create_folder") mutationDispatches++;
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

		assert.equal(confirmationSignal, toolRun.signal);
		assert.equal(mutationDispatches, 0);
		assert.equal(result.details.outcome.status, "blocked");
		if (result.details.outcome.status === "blocked") {
			assert.equal(result.details.outcome.code, "ascet_edit_operation_aborted_before_write");
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ascet_edit reports a confirmation UI failure as blocked", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-confirm-ui-failure-"));
	try {
		const result = await ascetEditTool.execute(
			"call-1",
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
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

		assert.equal(result.details.outcome.status, "blocked");
		if (result.details.outcome.status === "blocked") {
			assert.equal(result.details.outcome.code, "ascet_edit_confirmation_ui_failed");
		}
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
});

test("ascet_edit set routes through the unified approval path", async () => {
	const result = await ascetEditTool.execute(
		"call-1",
		{ mode: "set", componentPath: "DEMO/PID", intent: "apply" },
		new AbortController().signal,
		undefined,
		{ cwd: process.cwd(), executeCli: async (request) => editableExecution(request, false) },
	);

	assert.equal(result.details.tool, "ascet_edit");
	assert.equal(result.details.action, "set");
	assert.equal(result.details.mode, "set");
	assert.equal(result.details.error?.code, "ascet_edit_approval_required");
	assert.deepEqual(result.details.command, {
		logicalCommandId: "AscetComponentEditableSet",
		backendCommandId: "AscetComponentEditableSet",
		operation: "component_editable_set",
	});
});

test("rejects the retired set_dependent_chain public action", async () => {
	const invalidParams = {
		action: "set_dependent_chain",
		componentPath: "DEMO\\Consumer",
		dependentElement: "C_K",
		intent: "preview",
	} as unknown as Parameters<typeof ascetEditTool.execute>[1];
	const result = await ascetEditTool.execute("call-1", invalidParams, new AbortController().signal, undefined, {
		cwd: process.cwd(),
	});

	const payload = JSON.parse(result.content[0]?.text ?? "{}") as { error?: { code?: string } };
	assert.ok(payload.error?.code);
});

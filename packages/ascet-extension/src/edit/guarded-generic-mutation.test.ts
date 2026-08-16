import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { runAscetEdit } from "./service.ts";

function response(request: AscetCliRequest, result: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function completeTree(request: AscetCliRequest): AscetCliExecutionResult {
	return response(request, {
		items: [
			{ path: "DEMO\\Enums\\EngineStallStatus", oid: "E-1", kind: "enumeration" },
			{ path: "DEMO\\Project::Controller", oid: "C-1", kind: "module" },
		],
		coverage: { status: "complete_for_scope", completeness: "complete", collectorCompleted: true },
		truncated: false,
		database: { name: "DB", path: "C:/Repo/DB" },
	});
}

describe("generic guarded ASCET mutation", () => {
	test("acquires editability and applies set_enumerators in one guarded backend call", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-generic-"));
		const calls: string[][] = [];
		let confirmations = 0;
		try {
			const enumerators = ["EngineStallStatus_NO_RISK", "EngineStallStatus_WARNING"];
			const result = await runAscetEdit(
				{
					action: "set_enumerators",
					componentPath: "DEMO\\Enums\\EngineStallStatus",
					enumerators,
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") return completeTree(request);
						if (operation === "component_editable_check") return response(request, false);
						if (operation === "guarded_mutation") {
							const requestFile = request.args[request.args.indexOf("--request-file") + 1];
							assert.ok(requestFile);
							const guardedRequest = JSON.parse(readFileSync(requestFile, "utf8")) as {
								operation: string;
								operationArgs: string[];
								editableTargets: string[];
								acquireEditability: boolean;
							};
							assert.equal(guardedRequest.operation, "set_enumerators");
							assert.deepEqual(guardedRequest.editableTargets, ["DEMO\\Enums\\EngineStallStatus"]);
							assert.equal(guardedRequest.acquireEditability, true);
							assert.ok(guardedRequest.operationArgs.includes("--verify-readback"));
							return response(request, {
								success: true,
								operation: "set_enumerators",
								editabilityMutationStarted: true,
								editabilityAcquired: true,
								primaryMutationStarted: true,
								mutationStatus: "applied",
								verificationStatus: "passed",
								targets: [
									{
										path: "DEMO\\Enums\\EngineStallStatus",
										initiallyEditable: false,
										editabilityMutationStarted: true,
										editabilityAcquired: true,
										finalEditable: true,
									},
								],
								error: null,
								primaryResult: {
									componentPath: "DEMO\\Enums\\EngineStallStatus",
									enumerators,
									writeSucceeded: true,
									verifyReadbackRequested: true,
									readbackVerified: true,
								},
							});
						}
						throw new Error(`Unexpected operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: {
						confirm: async (_title, message) => {
							confirmations++;
							assert.match(message, /Request component editability/);
							return true;
						},
					},
				},
			);

			assert.equal(confirmations, 1);
			assert.equal(result.details.outcome.status, "ok");
			assert.ok(result.details.mutationResult);
			assert.deepEqual(result.details.mutationResult.editability, {
				status: "acquired",
				initiallyEditable: false,
				acquiredByThisOperation: true,
				finalEditableState: "editable",
			});
			assert.equal(result.details.mutationResult.mutation.status, "applied");
			assert.equal(result.details.mutationResult.verification.status, "passed");
			assert.deepEqual(result.details.mutationResult.bridge, {
				beforeBridge: true,
				bridgeEntered: true,
				backendResponseReceived: true,
			});
			assert.equal(calls.filter((args) => args[1] === "guarded_mutation").length, 1);
			assert.equal(calls.filter((args) => args[1] === "set_enumerators").length, 0);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("reports partial state when the primary mutation fails after editability acquisition", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-generic-failure-"));
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_enumerators",
					componentPath: "DEMO\\Enums\\EngineStallStatus",
					enumerators: ["OFF", "ON"],
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") return completeTree(request);
						if (operation === "component_editable_check") return response(request, false);
						if (operation === "guarded_mutation") {
							return response(request, {
								success: false,
								operation: "set_enumerators",
								editabilityMutationStarted: true,
								editabilityAcquired: true,
								primaryMutationStarted: true,
								mutationStatus: "partially_applied",
								verificationStatus: "unknown",
								targets: [
									{
										path: "DEMO\\Enums\\EngineStallStatus",
										initiallyEditable: false,
										editabilityMutationStarted: true,
										editabilityAcquired: true,
										finalEditable: true,
									},
								],
								error: {
									code: "set_enumerators_failed",
									message: "Primary mutation failed after acquisition.",
								},
								primaryResult: null,
							});
						}
						throw new Error(`Unexpected operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: { confirm: async () => true },
				},
			);

			assert.equal(result.details.outcome.status, "partial");
			assert.equal(result.details.mutationResult?.status, "partial");
			assert.deepEqual(result.details.mutationResult?.editability, {
				status: "acquired",
				initiallyEditable: false,
				acquiredByThisOperation: true,
				finalEditableState: "editable",
			});
			assert.equal(result.details.mutationResult?.mutation.status, "partially_applied");
			assert.equal(result.details.mutationResult?.verification.status, "unknown");
			assert.equal(result.details.mutationResult?.error?.code, "set_enumerators_failed");
			assert.equal(result.details.mutationResult?.recovery.required, true);
			assert.ok(
				result.details.mutationResult?.recovery.actions.some((action) => action.includes("may remain changed")),
			);
			assert.equal(calls.filter((args) => args[1] === "guarded_mutation").length, 1);
			assert.equal(calls.filter((args) => args[1] === "set_enumerators").length, 0);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
	test("reports rolled-back create_method after verified Diagram compensation", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-method-rollback-"));
		let guardedWrites = 0;
		try {
			const result = await runAscetEdit(
				{
					action: "create_method",
					componentPath: "DEMO\\Project::Controller",
					methodName: "stateProbe",
					methodKind: "action",
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") return completeTree(request);
						if (operation === "preflight_create_method") {
							return response(request, {
								databasePath: "C:/Repo/DB",
								componentPath: "DEMO\\Project::Controller",
								componentOid: "C-1",
								componentKind: "StateMachine",
								languageKind: "ESDL",
								diagramName: "Main",
								diagramExists: false,
								diagramRuntimeType: null,
								requiredMethod: "AddAction",
								requiredMethodAvailable: true,
								editable: true,
								readbackAvailable: true,
								noOp: false,
								plannedEffects: [
									{ kind: "create_diagram", target: "DEMO\\Project::Controller::Main" },
									{ kind: "create_method", target: "DEMO\\Project::Controller::stateProbe" },
								],
								capability: { status: "supported" },
							});
						}
						if (operation === "guarded_create_method") {
							guardedWrites++;
							return response(request, {
								success: false,
								initiallyEditable: true,
								editabilityMutationStarted: false,
								editabilityAcquired: false,
								primaryMutationStarted: true,
								finalEditable: true,
								diagramInitiallyExisted: false,
								diagramCreated: true,
								diagramCompensationAttempted: true,
								diagramCompensated: true,
								methodPresentAfterFailure: false,
								mutationStatus: "rolled_back",
								verificationStatus: "not_applicable",
								error: {
									code: "create_method_failed",
									message: "Method creation failed after Diagram creation.",
								},
								method: null,
							});
						}
						throw new Error(`Unexpected operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: { confirm: async () => true },
				},
			);

			assert.equal(guardedWrites, 1);
			assert.equal(result.details.outcome.status, "partial");
			assert.equal(result.details.mutationResult?.status, "rolled_back");
			assert.deepEqual(result.details.mutationResult?.editability, {
				status: "editable",
				initiallyEditable: true,
				acquiredByThisOperation: false,
				finalEditableState: "editable",
			});
			assert.equal(result.details.mutationResult?.mutation.status, "rolled_back");
			assert.equal(result.details.mutationResult?.verification.status, "not_applicable");
			assert.equal(result.details.mutationResult?.error?.code, "create_method_failed");
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("preserves acquired editability evidence after compensated create_method failure", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-method-partial-"));
		try {
			const result = await runAscetEdit(
				{
					action: "create_method",
					componentPath: "DEMO\\Project::Controller",
					methodName: "stateProbe",
					methodKind: "action",
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") return completeTree(request);
						if (operation === "preflight_create_method") {
							return response(request, {
								databasePath: "C:/Repo/DB",
								componentPath: "DEMO\\Project::Controller",
								componentOid: "C-1",
								componentKind: "StateMachine",
								languageKind: "ESDL",
								diagramName: "Main",
								diagramExists: false,
								diagramRuntimeType: null,
								requiredMethod: "AddAction",
								requiredMethodAvailable: true,
								editable: false,
								readbackAvailable: true,
								noOp: false,
								plannedEffects: [
									{ kind: "request_editability", target: "DEMO\\Project::Controller" },
									{ kind: "create_diagram", target: "DEMO\\Project::Controller::Main" },
									{ kind: "create_method", target: "DEMO\\Project::Controller::stateProbe" },
								],
								capability: { status: "supported" },
							});
						}
						if (operation === "guarded_create_method") {
							assert.equal(request.args.includes("--acquire-editability"), true);
							return response(request, {
								success: false,
								initiallyEditable: false,
								editabilityMutationStarted: true,
								editabilityAcquired: true,
								primaryMutationStarted: true,
								finalEditable: true,
								diagramInitiallyExisted: false,
								diagramCreated: true,
								diagramCompensationAttempted: true,
								diagramCompensated: true,
								methodPresentAfterFailure: false,
								mutationStatus: "partially_applied",
								verificationStatus: "not_applicable",
								error: {
									code: "create_method_failed",
									message: "Method creation failed after editability acquisition.",
								},
								method: null,
							});
						}
						throw new Error(`Unexpected operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: { confirm: async () => true },
				},
			);

			assert.equal(result.details.outcome.status, "partial");
			assert.equal(result.details.mutationResult?.status, "partial");
			assert.deepEqual(result.details.mutationResult?.editability, {
				status: "acquired",
				initiallyEditable: false,
				acquiredByThisOperation: true,
				finalEditableState: "editable",
			});
			assert.equal(result.details.mutationResult?.mutation.status, "partially_applied");
			assert.equal(result.details.mutationResult?.verification.status, "not_applicable");
			assert.ok(
				result.details.mutationResult?.recovery.actions.some((action) => action.includes("may remain changed")),
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("preserves primary mutation not-started evidence from guarded backend failures", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-guarded-not-started-"));
		try {
			const result = await runAscetEdit(
				{
					action: "set_enumerators",
					componentPath: "DEMO\\Enums\\EngineStallStatus",
					enumerators: ["OFF", "ON"],
					intent: "apply",
				},
				{
					cwd: process.cwd(),
					env: {
						PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					},
					executeCli: async (request) => {
						const operation = request.args[1];
						if (operation === "get_database_identity") {
							return response(request, { database: { name: "DB", path: "C:/Repo/DB" } });
						}
						if (operation === "get_tree") return completeTree(request);
						if (operation === "component_editable_check") return response(request, false);
						if (operation === "set_enumerators") {
							return response(request, {
								writeSucceeded: true,
								verifyReadbackRequested: true,
								readbackVerified: true,
							});
						}
						if (operation === "guarded_mutation") {
							return response(request, {
								success: false,
								operation: "set_enumerators",
								editabilityMutationStarted: true,
								editabilityAcquired: false,
								primaryMutationStarted: false,
								mutationStatus: "not_started",
								verificationStatus: "not_applicable",
								targets: [
									{
										path: "DEMO\\Enums\\EngineStallStatus",
										initiallyEditable: false,
										editabilityMutationStarted: true,
										editabilityAcquired: false,
										finalEditable: false,
									},
								],
								error: {
									code: "component_not_editable",
									message: "Editability acquisition failed before mutation.",
								},
								primaryResult: null,
							});
						}
						throw new Error(`Unexpected operation ${operation ?? request.args.join(" ")}`);
					},
				},
				{
					ascetPermission: { mode: "default", rules: [] },
					hasUI: true,
					ui: { confirm: async () => true },
				},
			);

			assert.equal(result.details.outcome.status, "error");
			assert.equal(result.details.mutationResult?.status, "error");
			assert.equal(result.details.mutationResult?.mutation.status, "not_started");
			assert.equal(result.details.mutationResult?.verification.status, "not_applicable");
			assert.equal(result.details.mutationResult?.error?.code, "component_not_editable");
			assert.deepEqual(result.details.mutationResult?.editability, {
				status: "blocked",
				initiallyEditable: false,
				acquiredByThisOperation: false,
				finalEditableState: "read_only",
			});
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

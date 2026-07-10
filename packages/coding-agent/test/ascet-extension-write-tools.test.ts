import { describe, expect, it } from "vitest";
import { buildBatchWriteArgs, runApprovedAscetBatchWrite } from "../../ascet-extension/src/batch-write.ts";
import {
	buildCreateComponentArgs,
	runApprovedAscetCreateComponent,
} from "../../ascet-extension/src/create-component.ts";
import { buildCreateFolderArgs, runApprovedAscetCreateFolder } from "../../ascet-extension/src/create-folder.ts";
import { buildCreateMethodArgs, runApprovedAscetCreateMethod } from "../../ascet-extension/src/create-method.ts";
import {
	buildSetClassMethodCodeArgs,
	runApprovedAscetSetClassMethodCode,
} from "../../ascet-extension/src/set-class-method-code.ts";
import { requestAscetWriteApproval } from "../../ascet-extension/src/write-policy.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

describe("ASCET guarded write PI tools", () => {
	it("builds JSON structural write invocations with readback verification", () => {
		expect(buildCreateFolderArgs({ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true })).toEqual([
			"exec",
			"create_folder",
			"DEMO\\__pi_write_smoke__",
			"--verify-readback",
			"--json",
		]);
		expect(
			buildCreateComponentArgs({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				kind: "class",
				language: "ESDL",
				ifExists: "return-existing",
				verifyReadback: true,
				rollbackOnFailure: true,
			}),
		).toEqual([
			"exec",
			"create_component",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"--kind",
			"class",
			"--language",
			"ESDL",
			"--if-exists",
			"return-existing",
			"--verify-readback",
			"--rollback-on-failure",
			"--json",
		]);
		expect(
			buildCreateMethodArgs({
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				methodKind: "abstract",
				ifExists: "return-existing",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"create_method",
			"DEMO\\__pi_write_smoke__\\PiSmoke",
			"calc",
			"--method-kind",
			"abstract",
			"--if-exists",
			"return-existing",
			"--verify-readback",
			"--json",
		]);
	});

	it("builds JSON set_class_method_code invocation with readback verification", () => {
		expect(
			buildSetClassMethodCodeArgs({
				classPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
			}),
		).toEqual([
			"exec",
			"set_class_method_code",
			"DEMO\\PID",
			"calc",
			"E:\\tmp\\calc.c",
			"--verify-readback",
			"--json",
		]);
	});

	it("builds batch write invocation and stdin payload", async () => {
		expect(
			buildBatchWriteArgs({
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
			}),
		).toEqual(["batch", "create_folder"]);

		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: false,
			},
			{ cwd: repoRoot },
			{ hasUI: true, ui: { confirm: async () => true } },
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("ascet_write_preflight_required");
		expect(result.request.args).toEqual(["batch", "create_folder"]);
		expect(JSON.parse(result.request.stdin ?? "{}")).toEqual({
			requests: [
				{
					id: "req-1",
					operation: "create_folder",
					args: { folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true },
				},
			],
		});
	});

	it("requires executeWrite before asking for interactive confirmation", async () => {
		const approval = await requestAscetWriteApproval(
			{
				executeWrite: false,
				title: "Confirm ASCET write",
				message: "write",
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);

		expect(approval).toMatchObject({
			approved: false,
			code: "ascet_write_preflight_required",
		});
	});

	it("blocks writes when no interactive confirmation UI is available", async () => {
		const setCodeResult = await runApprovedAscetSetClassMethodCode(
			{
				classPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const createFolderResult = await runApprovedAscetCreateFolder(
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, executeWrite: true },
			{ cwd: repoRoot },
			{ hasUI: false },
		);
		const batchWriteResult = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true }],
				executeWrite: true,
			},
			{ cwd: repoRoot },
			{ hasUI: false },
		);

		expect(setCodeResult.ok).toBe(false);
		expect(setCodeResult.error?.code).toBe("ascet_write_ui_required");
		expect(setCodeResult.request.args).toContain("--verify-readback");
		expect(createFolderResult.ok).toBe(false);
		expect(createFolderResult.error?.code).toBe("ascet_write_ui_required");
		expect(batchWriteResult.ok).toBe(false);
		expect(batchWriteResult.error?.code).toBe("ascet_write_ui_required");
	});

	it("runs the write command only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetSetClassMethodCode(
			{
				classPath: "DEMO\\PID",
				methodName: "calc",
				codeFile: "E:\\tmp\\calc.c",
				verifyReadback: true,
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { readbackVerified: true } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalls++;
						return true;
					},
				},
			},
		);

		expect(confirmCalls).toBe(1);
		expect(executeCalls).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.data).toMatchObject({ ok: true, result: { readbackVerified: true } });
	});

	it("runs structural writes only after interactive confirmation", async () => {
		const executedArgs: string[][] = [];
		const options = {
			cwd: repoRoot,
			executeCli: async (request) => {
				executedArgs.push(request.args);
				return {
					exitCode: 0,
					stdout: JSON.stringify({ ok: true, result: { applied: true } }),
					stderr: "",
					timedOut: false,
					request,
				};
			},
		};
		const ctx = {
			hasUI: true,
			ui: {
				confirm: async () => true,
			},
		};

		await runApprovedAscetCreateFolder(
			{ folderPath: "DEMO\\__pi_write_smoke__", verifyReadback: true, executeWrite: true },
			options,
			ctx,
		);
		await runApprovedAscetCreateComponent(
			{
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				kind: "class",
				language: "ESDL",
				ifExists: "return-existing",
				verifyReadback: true,
				executeWrite: true,
			},
			options,
			ctx,
		);
		await runApprovedAscetCreateMethod(
			{
				componentPath: "DEMO\\__pi_write_smoke__\\PiSmoke",
				methodName: "calc",
				methodKind: "abstract",
				ifExists: "return-existing",
				verifyReadback: true,
				executeWrite: true,
			},
			options,
			ctx,
		);

		expect(executedArgs).toEqual([
			["exec", "create_folder", "DEMO\\__pi_write_smoke__", "--verify-readback", "--json"],
			[
				"exec",
				"create_component",
				"DEMO\\__pi_write_smoke__\\PiSmoke",
				"--kind",
				"class",
				"--language",
				"ESDL",
				"--if-exists",
				"return-existing",
				"--verify-readback",
				"--json",
			],
			[
				"exec",
				"create_method",
				"DEMO\\__pi_write_smoke__\\PiSmoke",
				"calc",
				"--method-kind",
				"abstract",
				"--if-exists",
				"return-existing",
				"--verify-readback",
				"--json",
			],
		]);
	});

	it("runs batch write only after interactive confirmation", async () => {
		let confirmCalls = 0;
		let executeCalls = 0;
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => {
					executeCalls++;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { results: [{ ok: true }] } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => {
						confirmCalls++;
						return true;
					},
				},
			},
		);

		expect(confirmCalls).toBe(1);
		expect(executeCalls).toBe(1);
		expect(result.ok).toBe(true);
		expect(result.request.args).toEqual(["batch", "create_folder"]);
		expect(result.request.stdin).toContain('"operation":"create_folder"');
	});

	it("classifies batch write invalid JSON output as a tool failure", async () => {
		const result = await runApprovedAscetBatchWrite(
			{
				operation: "batch_create_folder",
				requests: [{ folderPath: "DEMO\\__pi_write_smoke__", ifExists: "ignore", verifyReadback: true }],
				executeWrite: true,
			},
			{
				cwd: repoRoot,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: "not json",
					stderr: "",
					timedOut: false,
					request,
				}),
			},
			{
				hasUI: true,
				ui: {
					confirm: async () => true,
				},
			},
		);

		expect(result.ok).toBe(false);
		expect(result.error?.code).toBe("ascet_cli_invalid_json");
		expect(result.data).toBeNull();
	});

	it("registers the write tool as sequential", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.tools.get("ascet_create_folder")?.definition).toMatchObject({
			name: "ascet_create_folder",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_create_component")?.definition).toMatchObject({
			name: "ascet_create_component",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_create_method")?.definition).toMatchObject({
			name: "ascet_create_method",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_set_class_method_code")?.definition).toMatchObject({
			name: "ascet_set_class_method_code",
			executionMode: "sequential",
		});
		expect(ascetExtension?.tools.get("ascet_batch_write")?.definition).toMatchObject({
			name: "ascet_batch_write",
			executionMode: "sequential",
		});
	});
});

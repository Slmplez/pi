import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { runAscetEdit } from "./service.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

function bridgeResult(
	request: AscetCliRequest,
	result: unknown = {
		changed: true,
		mutationStatus: "applied",
		saveAttempted: true,
		saveSucceeded: true,
		saveState: "saved",
		verified: true,
		verificationStatus: "passed",
		verificationMode: "same_session_exact_target",
		sessionCount: 1,
		saveCount: 1,
		editableRetryCount: 0,
		nativeMutationAttemptCount: 1,
	},
): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function options(
	calls: string[][],
	result?: unknown,
	allowEditability = false,
	env?: Record<string, string | undefined>,
) {
	return {
		cwd: process.cwd(),
		...(env ? { env } : {}),
		executeCli: async (request: AscetCliRequest) => {
			calls.push(request.args);
			if (
				!allowEditability &&
				(request.args[1] === "component_editable_check" || request.args[1] === "component_editable_set")
			) {
				throw new Error(`normal writes must not call ${request.args[1]}`);
			}
			return bridgeResult(request, result);
		},
	};
}

describe("ASCET edit fast path", () => {
	test("dispatches every retained mutation action through one direct Bridge request", async () => {
		const root = mkdtempSync(join(tmpdir(), "ascet-edit-fast-path-"));
		const formulaFile = join(root, "formula.json");
		writeFileSync(formulaFile, "{}", "utf8");
		const calls: string[][] = [];
		const cases = [
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			{ action: "create_component", componentPath: "DEMO/C", kind: "class", intent: "apply" },
			{
				action: "create_method",
				componentPath: "DEMO/C",
				methodName: "run",
				methodKind: "process",
				intent: "apply",
			},
			{
				action: "set_method_signature",
				componentPath: "DEMO/C",
				methodName: "run",
				returnType: "cont",
				intent: "apply",
			},
			{ action: "delete_component", componentPath: "DEMO/C", intent: "apply" },
			{ action: "delete_method", componentPath: "DEMO/C", methodName: "run", intent: "apply" },
			{ action: "delete_folder", folderPath: "DEMO/Old", intent: "apply" },
			{ action: "set_method_code", componentPath: "DEMO/C", methodName: "run", code: "return;", intent: "apply" },
			{
				action: "set_module_code",
				modulePath: "DEMO/C",
				operation: "set-header",
				code: "/* header */",
				intent: "apply",
			},
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/SM",
				operation: "set-start-state",
				stateName: "Init",
				intent: "apply",
			},
			{ action: "set_enumerators", componentPath: "DEMO/E", enumerators: ["Off", "On"], intent: "apply" },
			{
				action: "apply_element_spec",
				componentPath: "DEMO/C",
				elementIntent: "create",
				elements: [],
				intent: "apply",
			},
			{ action: "apply_project_formula", projectPath: "DEMO/P", specFile: formulaFile, intent: "apply" },
			{
				action: "set_element_dependency",
				targetPath: "DEMO/C",
				elementName: "P",
				dependency: "dependent",
				dependencyFormula: "P",
				dependencyMappings: { P: "P" },
				variantPolicy: "default",
				intent: "apply",
			},
		] as const;
		try {
			for (const params of cases) {
				const result = await runAscetEdit(params, options(calls), approvingContext);
				assert.equal(result.details.outcome.status, "ok", params.action);
				const request = calls.at(-1);
				assert.ok(request, params.action);
				assert.equal(request[0], "exec", params.action);
				assert.equal(request[1], params.action, params.action);
			}
			assert.equal(calls.length, cases.length);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("normalizes public element roles before writing the Bridge spec file", async () => {
		const requestArgs: string[][] = [];
		const result = await runAscetEdit(
			{
				action: "apply_element_spec",
				componentPath: "DEMO/C",
				elementIntent: "create",
				elements: [
					{
						role: "standardPrimitive",
						name: "C_Test",
						kind: "parameter",
						modelType: "cont",
						scope: "local",
						data: { value: 0 },
						physicalRange: { min: -1, max: 1 },
						impl: { valueType: "real32" },
					},
				],
				intent: "apply",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request: AscetCliRequest) => {
					requestArgs.push(request.args);
					const spec = JSON.parse(readFileSync(request.args[3]!, "utf8")) as {
						elements: Array<Record<string, unknown>>;
					};
					assert.equal(spec.elements[0]?.role, undefined);
					return bridgeResult(request);
				},
			},
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		assert.equal(requestArgs.length, 1);
	});
	test("accepts canonical evidence nested in the Bridge result payload", async () => {
		const calls: string[][] = [];
		const result = await runAscetEdit(
			{ action: "create_component", componentPath: "DEMO/C", kind: "class", intent: "apply" },
			options(calls, {
				operationName: "create_component",
				writeSucceeded: true,
				payload: {
					changed: true,
					mutationStatus: "applied",
					saveAttempted: true,
					saveSucceeded: true,
					saveState: "saved",
					verified: true,
					verificationStatus: "passed",
					verificationMode: "same_session_exact_path",
					sessionCount: 1,
					saveCount: 1,
					editableRetryCount: 0,
					nativeMutationAttemptCount: 1,
				},
			}),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		assert.equal(result.details.mutationResult?.changed, true);
		assert.equal(result.details.mutationResult?.mutationStatus, "applied");
		assert.equal(result.details.mutationResult?.saveAttempted, true);
		assert.equal(result.details.mutationResult?.saveSucceeded, true);
		assert.equal(result.details.mutationResult?.saveState, "saved");
		assert.equal(result.details.mutationResult?.verified, true);
		assert.equal(result.details.mutationResult?.verificationMode, "same_session_exact_path");
		assert.equal(result.details.mutationResult?.sessionCount, 1);
		assert.equal(result.details.mutationResult?.saveCount, 1);
		assert.equal(result.details.mutationResult?.editableRetryCount, 0);
		assert.equal(result.details.mutationResult?.nativeMutationAttemptCount, 1);
		assert.equal(calls.length, 1);
	});
	test("does not execute a legacy preview or auxiliary read", async () => {
		const calls: string[][] = [];
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO/New", intent: "preview" },
			options(calls),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "error");
		assert.equal(calls.length, 0);
	});

	test("does not report success when save or verification evidence is false", async () => {
		for (const resultPayload of [
			{ mutationStatus: "applied", verificationStatus: "passed", readbackVerified: true, saveSucceeded: false },
			{ mutationStatus: "applied", verificationStatus: "failed", readbackVerified: false, saveSucceeded: true },
		]) {
			const calls: string[][] = [];
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
				options(calls, resultPayload),
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "partial");
			assert.equal(calls.length, 1);
		}
	});

	test("rejects incomplete or contradictory canonical write evidence", async () => {
		const invalidPayloads = [
			{
				changed: true,
				mutationStatus: "applied",
				saveAttempted: true,
				saveSucceeded: true,
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
			},
			{
				changed: true,
				mutationStatus: "applied",
				saveAttempted: true,
				saveSucceeded: true,
				saveState: "unknown",
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
			},
			{
				changed: true,
				mutationStatus: "applied",
				saveAttempted: true,
				saveSucceeded: true,
				saveState: "saved",
				verified: true,
				verificationStatus: "passed",
			},
			{
				changed: true,
				mutationStatus: "unknown",
				saveAttempted: true,
				saveSucceeded: true,
				saveState: "saved",
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
			},
			{
				changed: true,
				mutationStatus: "applied",
				saveAttempted: false,
				saveSucceeded: true,
				saveState: "not_required",
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
			},
		];
		for (const payload of invalidPayloads) {
			const calls: string[][] = [];
			const result = await runAscetEdit(
				{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
				options(calls, payload),
				approvingContext,
			);
			assert.notEqual(result.details.outcome.status, "ok", JSON.stringify(payload));
			assert.equal(calls.length, 1);
		}
	});

	test("accepts only explicit canonical no-op evidence without Save", async () => {
		const calls: string[][] = [];
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			options(calls, {
				changed: false,
				mutationStatus: "no_op",
				saveAttempted: false,
				saveSucceeded: false,
				saveState: "not_required",
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
				sessionCount: 1,
				saveCount: 0,
				editableRetryCount: 0,
				nativeMutationAttemptCount: 0,
			}),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		assert.equal(calls.length, 1);
	});

	test("rejects no-op evidence that claims Save succeeded without an attempt", async () => {
		const calls: string[][] = [];
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			options(calls, {
				changed: false,
				mutationStatus: "no_op",
				saveAttempted: false,
				saveSucceeded: true,
				saveState: "not_required",
				verified: true,
				verificationStatus: "passed",
				verificationMode: "same_session_exact_target",
				sessionCount: 1,
				saveCount: 0,
				editableRetryCount: 0,
				nativeMutationAttemptCount: 0,
			}),
			approvingContext,
		);
		assert.notEqual(result.details.outcome.status, "ok");
		assert.equal(calls.length, 1);
	});
	test("exposes canonical write evidence on the public mutation result envelope", async () => {
		const calls: string[][] = [];
		const result = await runAscetEdit(
			{ action: "create_folder", folderPath: "DEMO/New", intent: "apply" },
			options(calls),
			approvingContext,
		);
		assert.deepEqual(result.details.mutationResult, {
			...result.details.mutationResult,
			changed: true,
			mutationStatus: "applied",
			saveAttempted: true,
			saveSucceeded: true,
			saveState: "saved",
			verified: true,
			verificationMode: "same_session_exact_target",
			sessionCount: 1,
			saveCount: 1,
			editableRetryCount: 0,
			nativeMutationAttemptCount: 1,
		});
	});

	test("keeps explicit editability modes as one native Bridge operation", async () => {
		for (const mode of ["check", "set"] as const) {
			const calls: string[][] = [];
			const result = await runAscetEdit(
				{ mode, componentPath: "DEMO/C", ...(mode === "set" ? { intent: "apply" } : {}) },
				options(calls, true, true),
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(calls.length, 1);
			assert.equal(calls[0]?.[1], mode === "check" ? "component_editable_check" : "component_editable_set");
		}
	});
});

function elementSpecFiles(artifactRoot: string): string[] {
	const partition = createHash("sha256").update(artifactRoot).digest("hex").slice(0, 16);
	const directory = join(tmpdir(), "pi-ascet-extension", "element-spec-plans", partition);
	return existsSync(directory)
		? readdirSync(directory).filter((file) => file.startsWith("inline-") && file.endsWith(".json"))
		: [];
}

test("identity create and patch use one Bridge call without a synthesized Project", async () => {
	for (const elementIntent of ["create", "patch"] as const) {
		const calls: string[][] = [];
		const elements =
			elementIntent === "create"
				? [
						{
							role: "standardPrimitive",
							name: "P_Identity",
							kind: "parameter",
							modelType: "udisc",
							scope: "local",
							impl: { formula: "ident" },
						},
					]
				: [{ role: "standardPrimitive", name: "P_Identity", impl: { formula: "ident" } }];
		const result = await runAscetEdit(
			{
				action: "apply_element_spec",
				componentPath: "PI_EDIT_TEST_READWRITE_004/Core/ClassUnderTest",
				elementIntent,
				elements,
				intent: "apply",
			},
			options(calls),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		assert.equal(calls.length, 1);
		assert.equal(calls[0]?.[1], "apply_element_spec");
		assert.equal(calls[0]?.includes("--project-path"), false);
	}
});

test("IDENT and no formula remain valid without a Project", async () => {
	for (const impl of [{ formula: " IDENT " }, undefined]) {
		const calls: string[][] = [];
		const element = {
			role: "standardPrimitive",
			name: "P_Default",
			kind: "parameter",
			modelType: "udisc",
			scope: "local",
			...(impl ? { impl } : {}),
		};
		const result = await runAscetEdit(
			{
				action: "apply_element_spec",
				componentPath: "PI_EDIT_TEST_READWRITE_004/Core/ClassUnderTest",
				elementIntent: "create",
				elements: [element],
				intent: "apply",
			},
			options(calls),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "ok");
		assert.equal(calls.length, 1);
	}
});

test("custom formula without Project is rejected before Bridge and leaves no temp spec", async () => {
	const calls: string[][] = [];
	const artifactRoot = mkdtempSync(join(tmpdir(), "ascet-edit-preflight-artifacts-"));
	const env = { PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot };
	const before = elementSpecFiles(artifactRoot);
	try {
		const result = await runAscetEdit(
			{
				action: "apply_element_spec",
				componentPath: "PI_EDIT_TEST_READWRITE_004/Core/ClassUnderTest",
				elementIntent: "create",
				elements: [
					{
						role: "standardPrimitive",
						name: "P_Custom",
						kind: "parameter",
						modelType: "udisc",
						scope: "local",
						impl: { formula: "CustomFormula" },
					},
				],
				intent: "apply",
			},
			options(calls, undefined, false, env),
			approvingContext,
		);
		assert.equal(result.details.outcome.status, "error");
		assert.equal(result.details.error?.code, "ascet_edit_project_context_required");
		assert.equal(result.details.mutationResult?.mutationStatus, "not_started");
		assert.equal(calls.length, 0);
		assert.deepEqual(elementSpecFiles(artifactRoot), before);
	} finally {
		rmSync(artifactRoot, { recursive: true, force: true });
	}
});

test("mixed identity and custom formulas are rejected before Bridge", async () => {
	const calls: string[][] = [];
	const result = await runAscetEdit(
		{
			action: "apply_element_spec",
			componentPath: "PI_EDIT_TEST_READWRITE_004/Core/ClassUnderTest",
			elementIntent: "create",
			elements: [
				{
					role: "standardPrimitive",
					name: "P_Identity",
					kind: "parameter",
					modelType: "udisc",
					scope: "local",
					impl: { formula: "ident" },
				},
				{
					role: "standardPrimitive",
					name: "P_Custom",
					kind: "parameter",
					modelType: "udisc",
					scope: "local",
					impl: { formula: "CustomFormula" },
				},
			],
			intent: "apply",
		},
		options(calls),
		approvingContext,
	);
	assert.equal(result.details.outcome.status, "error");
	assert.equal(result.details.error?.code, "ascet_edit_project_context_required");
	assert.equal(calls.length, 0);
});

test("custom formula with explicit Project reaches Bridge with normalized caller path", async () => {
	const calls: string[][] = [];
	const result = await runAscetEdit(
		{
			action: "apply_element_spec",
			componentPath: "PI_EDIT_TEST_READWRITE_004/Core/ClassUnderTest",
			projectPath: "PI_EDIT_TEST_READWRITE_004/Core/FormulaProject",
			elementIntent: "create",
			elements: [
				{
					role: "standardPrimitive",
					name: "P_Custom",
					kind: "parameter",
					modelType: "udisc",
					scope: "local",
					impl: { formula: "CustomFormula" },
				},
			],
			intent: "apply",
		},
		options(calls),
		approvingContext,
	);
	assert.equal(result.details.outcome.status, "ok");
	assert.equal(calls.length, 1);
	const request = calls[0]!;
	const flag = request.indexOf("--project-path");
	assert.ok(flag >= 0);
	assert.equal(request[flag + 1], "PI_EDIT_TEST_READWRITE_004\\Core\\FormulaProject");
});

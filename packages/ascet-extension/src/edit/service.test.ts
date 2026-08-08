import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import type { AscetEditApprovalContext } from "./approval.ts";
import { type AscetMutationParams, getAscetEditActionId, resolveAscetEditInvocation, runAscetEdit } from "./service.ts";

const approvingContext: AscetEditApprovalContext = {
	hasUI: true,
	ui: { confirm: async () => true },
};

describe("ASCET edit service", () => {
	test("uses action or mode as the canonical edit action id", () => {
		assert.equal(
			getAscetEditActionId({ action: "set_enumerators", componentPath: "DEMO/E", enumerators: ["OFF"] }),
			"set_enumerators",
		);
		assert.equal(getAscetEditActionId({ mode: "check", componentPath: "DEMO/C" }), "check");
		assert.equal(
			getAscetEditActionId({
				action: "apply_element_spec",
				componentPath: "DEMO/C",
				intent: "create",
				elements: [],
			}),
			"apply_element_spec",
		);
		assert.deepEqual(resolveAscetEditInvocation({ mode: "check", componentPath: "DEMO/C" }), {
			kind: "editability",
			mode: "check",
		});
		assert.deepEqual(
			resolveAscetEditInvocation({
				action: "apply_project_formula",
				projectPath: "DEMO/P",
				specFile: "spec.json",
				mode: "restore",
			}),
			{ kind: "mutation", action: "apply_project_formula" },
		);
	});

	test("rejects unknown and ambiguous discriminators before dispatch", async () => {
		for (const params of [
			{ action: "not_a_real_edit" },
			{ action: "not_a_real_edit", mode: "check", executeWrite: true },
			{ action: undefined, mode: "check" },
			{ mode: "restore", componentPath: "DEMO/C" },
			{ action: "create_folder", mode: "check", folderPath: "DEMO/New" },
			{},
		]) {
			assert.equal(getAscetEditActionId(params), undefined);
			const result = await runAscetEdit(params, { cwd: process.cwd() }, {});
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message:
						"ascet_edit requires exactly one supported discriminator: action for a mutation, or mode=check/set for editability.",
				},
			});
		}
	});

	test("does not dispatch an invalid action even when mode is valid", async () => {
		let dispatches = 0;
		const result = await runAscetEdit(
			{ action: "not_a_real_edit", mode: "check", executeWrite: true },
			{
				cwd: process.cwd(),
				executeCli: async () => {
					dispatches += 1;
					throw new Error("Malformed edit parameters must not dispatch.");
				},
			},
			{},
		);
		assert.equal(result.details.outcome.status, "error");
		assert.equal(dispatches, 0);
	});

	test("recognizes every preserved mutation discriminator", () => {
		const actions: AscetMutationParams["action"][] = [
			"create_folder",
			"create_component",
			"create_method",
			"set_method_signature",
			"delete_component",
			"delete_method",
			"delete_folder",
			"set_method_code",
			"set_module_code",
			"set_state_machine_code",
			"set_enumerators",
			"apply_element_spec",
			"apply_project_formula",
			"set_element_dependency",
		];

		for (const action of actions) {
			assert.equal(getAscetEditActionId({ action } as AscetMutationParams), action);
		}
	});

	test("returns a guarded preflight outcome for every mutation action", async () => {
		const payloads: AscetMutationParams[] = [
			{ action: "create_folder", folderPath: "DEMO/New" },
			{ action: "create_component", componentPath: "DEMO/New/C", kind: "class" },
			{ action: "create_method", componentPath: "DEMO/C", methodName: "calc" },
			{ action: "set_method_signature", componentPath: "DEMO/C", methodName: "calc", returnType: "cont" },
			{ action: "delete_component", componentPath: "DEMO/C" },
			{ action: "delete_method", componentPath: "DEMO/C", methodName: "calc" },
			{ action: "delete_folder", folderPath: "DEMO/New" },
			{ action: "set_method_code", componentPath: "DEMO/C", methodName: "calc", code: "return;" },
			{ action: "set_module_code", modulePath: "DEMO/M", operation: "set-header", code: "" },
			{
				action: "set_state_machine_code",
				stateMachinePath: "DEMO/SM",
				operation: "set-method",
				methodName: "onTick",
				code: "return;",
			},
			{ action: "set_enumerators", componentPath: "DEMO/E", enumerators: ["OFF", "ON"] },
			{ action: "apply_project_formula", projectPath: "DEMO/P", specFile: "formula.json", mode: "restore" },
			{
				action: "set_element_dependency",
				targetPath: "DEMO/C",
				elementName: "K",
				dependency: "independent",
				variantPolicy: "default",
				valueRestoration: { policy: "explicit", valuesByVariant: { default: 0 } },
			},
		];

		for (const params of payloads) {
			const result = await runAscetEdit(
				params,
				{
					cwd: process.cwd(),
					executeCli: async (request) => ({
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { validated: true } }),
						stderr: "",
						timedOut: false,
						request,
					}),
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight", params.action);
			assert.equal(result.details.outcome.plan.action, params.action);
		}
	});

	test("rejects unknown apply_element_spec controls instead of forwarding them", async () => {
		for (const extra of ["dryRun", "backupDir"]) {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					specFile: "spec.json",
					[extra]: extra === "dryRun" ? true : "backups",
				},
				{ cwd: process.cwd() },
				{},
			);
			assert.deepEqual(result.details.outcome, {
				status: "error",
				error: {
					code: "ascet_edit_invalid_parameter",
					message:
						"Invalid parameters for ascet_edit action 'apply_element_spec'. Unknown properties and values not accepted by the action contract are rejected.",
				},
			});
		}
	});

	test("rejects targetKind values not supported by the delegated TypeScript runner", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO/C",
				elementName: "P",
				dependency: "independent",
				targetKind: "project",
			},
			{ cwd: process.cwd() },
			{},
		);
		assert.equal(result.details.outcome.status, "error");
		if (result.details.outcome.status === "error") {
			assert.equal(result.details.outcome.error.code, "ascet_edit_invalid_parameter");
		}
	});

	test("rejects conflicting targetPath and componentPath values", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO/Provider",
				componentPath: "DEMO/Consumer",
				elementName: "P",
				dependency: "independent",
			},
			{ cwd: process.cwd() },
			{},
		);
		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "ascet_edit_conflicting_parameter",
				message:
					"set_element_dependency targetPath and componentPath must identify the same target when both are provided.",
			},
		});
	});

	test("checks apply_element_spec input and runs backend diff preflight", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-spec-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetCli.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let diffSpec: unknown;
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					intent: "create",
					elements: [
						{ role: "standardPrimitive", name: "K", kind: "parameter", modelType: "cont", scope: "local" },
					],
				},
				{
					cwd: root,
					env: { ASCET_CLI_PATH: cliPath, ASCET_CONTRACTS_PATH: contractsRoot },
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "diff_element_spec") {
							diffSpec = JSON.parse(readFileSync(request.args[3]!, "utf8"));
						}
						const result = request.args[1] === "read_element_catalog" ? { elements: [] } : { changes: [] };
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog", "diff_element_spec"],
			);
			assert.deepEqual(diffSpec, {
				elements: [{ name: "K", kind: "parameter", modelType: "cont", scope: "local" }],
			});
			if (result.details.outcome.status === "preflight") {
				const plan = result.details.outcome.plan as { backendPreflight: { validated: boolean } };
				assert.equal(plan.backendPreflight.validated, true);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("patch reads the live catalog, merges a full snapshot, and keeps specFile internal", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-patch-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		let diffSpec: unknown;
		try {
			const result = await runAscetEdit(
				{
					action: "apply_element_spec",
					componentPath: "DEMO/C",
					intent: "patch",
					elements: [{ name: "P", comment: "Updated" }],
				},
				{
					cwd: root,
					env: { ASCET_CLI_PATH: join(root, "AscetCli.exe"), ASCET_CONTRACTS_PATH: contractsRoot },
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "diff_element_spec") {
							diffSpec = JSON.parse(readFileSync(request.args[3]!, "utf8"));
						}
						const result =
							request.args[1] === "read_element_catalog"
								? {
										elements: [
											{
												name: "P",
												kind: "parameter",
												modelType: "cont",
												scope: "local",
												data: { value: 1 },
												impl: { valueType: "sint16" },
												comment: "Old",
											},
										],
										identity: { componentOID: "C-1", elementOIDs: { P: "E-1" } },
										provenance: {
											dataConfiguration: "DefaultData",
											implementationConfiguration: "DefaultImpl",
										},
									}
								: { changes: [{ name: "P", operation: "update" }] };
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			if (result.details.outcome.status === "preflight") {
				const backend = result.details.outcome.plan.backendPreflight as Record<string, unknown>;
				assert.deepEqual(backend.catalogIdentity, { componentOID: "C-1", elementOIDs: { P: "E-1" } });
				assert.deepEqual((backend.catalogSnapshot as Record<string, unknown>).provenance, {
					dataConfiguration: "DefaultData",
					implementationConfiguration: "DefaultImpl",
				});
				assert.equal(typeof backend.liveSnapshotHash, "string");
			}
			assert.deepEqual(
				calls.map((call) => call[1]),
				["read_element_catalog", "diff_element_spec"],
			);
			const normalizedSpec = diffSpec as {
				elements: Array<Record<string, unknown>>;
			};
			assert.deepEqual(normalizedSpec.elements[0], {
				name: "P",
				kind: "parameter",
				modelType: "cont",
				scope: "local",
				data: { value: 1 },
				impl: { valueType: "sint16" },
				comment: "Updated",
			});
			assert.equal(JSON.stringify(result).includes("specFile"), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("uses the backend dependency dry-run during non-executing preflight", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-dependency-preflight-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetCli.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "DEMO/C",
					elementName: "P",
					dependency: "dependent",
					dependencyFormula: "P_Input",
					dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
					variantPolicy: "default",
				},
				{
					cwd: root,
					env: { ASCET_CLI_PATH: cliPath, ASCET_CONTRACTS_PATH: contractsRoot },
					executeCli: async (request) => {
						calls.push(request.args);
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: { dryRun: true, validated: true } }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			assert.equal(calls[0]?.includes("--dry-run"), true);
			if (result.details.outcome.status === "preflight") {
				const plan = result.details.outcome.plan as { backendPreflight: { validated: boolean } };
				assert.equal(plan.backendPreflight.validated, true);
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("normalizes autoExactName formals into exact backend mappings", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-auto-binding-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		const cliPath = join(root, "AscetCli.exe");
		writeFileSync(cliPath, "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetEdit(
				{
					action: "set_element_dependency",
					targetPath: "DEMO/C",
					elementName: "P",
					dependency: "dependent",
					dependencyFormula: "max(A,B) * 1e-3",
					dependencyFormals: ["A", "B"],
					bindingPolicy: "autoExactName",
					variantPolicy: "default",
				},
				{
					cwd: root,
					env: { ASCET_CLI_PATH: cliPath, ASCET_CONTRACTS_PATH: contractsRoot },
					executeCli: async (request) => {
						calls.push(request.args);
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: { dryRun: true, validated: true } }),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
				{},
			);
			assert.equal(result.details.outcome.status, "preflight");
			assert.ok(calls[0]?.includes("A=A"));
			assert.ok(calls[0]?.includes("B=B"));
			assert.equal(
				calls[0]?.some((arg) => arg.includes("max=max") || arg.includes("e=e")),
				false,
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("requires explicit dependency mappings for formulas", async () => {
		const result = await runAscetEdit(
			{
				action: "set_element_dependency",
				targetPath: "DEMO/Controller",
				elementName: "P_Effective",
				dependency: "dependent",
				dependencyFormula: "max(A, B) * 1e-3",
			},
			{ cwd: process.cwd() },
			{},
		);

		assert.deepEqual(result.details.outcome, {
			status: "error",
			error: {
				code: "dependency_mappings_required",
				message:
					"set_element_dependency dependencyFormula requires explicit dependencyMappings, or autoExactName with explicit dependencyFormals; formula token inference is disabled.",
			},
		});
	});

	test("does not issue secondary live reads when apply_element_spec readback is unverified", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-service-unverified-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const options = {
				cwd: root,
				env: {
					ASCET_CLI_PATH: join(root, "AscetCli.exe"),
					ASCET_CONTRACTS_PATH: contractsRoot,
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					calls.push(request.args);
					const result =
						request.args[1] === "read_element_catalog"
							? { elements: [] }
							: request.args[1] === "diff_element_spec"
								? { changes: [] }
								: { ReadbackVerified: false, ElementResults: [{ name: "K", readbackVerified: false }] };
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result, error: null }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			};
			const plan = await runAscetEdit(
				{
					action: "apply_element_spec",
					phase: "plan",
					componentPath: "DEMO\\Controller",
					intent: "create",
					elements: [
						{ role: "standardPrimitive", name: "K", kind: "parameter", modelType: "cont", scope: "local" },
					],
					verifyReadback: false,
				},
				options,
				{},
			);
			assert.equal(plan.details.outcome.status, "preflight");
			if (plan.details.outcome.status !== "preflight") return;
			const planId = plan.details.outcome.plan.planId as string;
			const result = await runAscetEdit(
				{ action: "apply_element_spec", phase: "commit", planId },
				options,
				approvingContext,
			);

			const outcome = result.details.outcome;
			assert.equal(outcome.status, "ok");
			assert.deepEqual(
				calls.map((args) => args[1]),
				[
					"read_element_catalog",
					"diff_element_spec",
					"read_element_catalog",
					"diff_element_spec",
					"apply_element_spec",
				],
			);
			if (outcome.status === "ok") {
				const observations = (outcome.data as { observations: { invalidated: string[] } }).observations;
				assert.deepEqual(observations, { invalidated: [] });
			}
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("commits a persisted set_element_dependency plan without leaking internal dryRun into the public contract", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-edit-dependency-commit-"));
		const contractsRoot = join(root, "contracts");
		mkdirSync(contractsRoot, { recursive: true });
		writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
		writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
		const calls: string[][] = [];
		try {
			const options = {
				cwd: root,
				env: {
					ASCET_CLI_PATH: join(root, "AscetCli.exe"),
					ASCET_CONTRACTS_PATH: contractsRoot,
					PI_ASCET_EXTENSION_ARTIFACT_ROOT: join(root, "artifacts"),
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
				},
				executeCli: async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
					calls.push(request.args);
					const dryRun = request.args.includes("--dry-run");
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: dryRun
								? { dryRun: true, beforeDependency: "independent", beforeFormula: "", mappings: [] }
								: { writeSucceeded: true, readbackVerified: true },
							error: null,
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			};
			const plan = await runAscetEdit(
				{
					action: "set_element_dependency",
					phase: "plan",
					targetPath: "DEMO\\Controller",
					elementName: "P_Local",
					dependency: "dependent",
					dependencyFormula: "P_Input",
					dependencyMappings: { P_Input: { kind: "parameter", name: "P_Input" } },
					variantPolicy: "default",
				},
				options,
				{},
			);
			assert.equal(plan.details.outcome.status, "preflight");
			if (plan.details.outcome.status !== "preflight") return;
			const result = await runAscetEdit(
				{ action: "set_element_dependency", phase: "commit", planId: plan.details.outcome.plan.planId as string },
				options,
				approvingContext,
			);
			assert.equal(result.details.outcome.status, "ok");
			assert.equal(calls.length, 3);
			assert.equal(calls[0]?.includes("--dry-run"), true);
			assert.equal(calls[1]?.includes("--dry-run"), true);
			assert.equal(calls[2]?.includes("--dry-run"), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	type ConfigureParameterDependencyChainParams,
	type ConfigureParameterDependencyDefinition,
	configureParameterDependencyChainParameters,
	runConfigureParameterDependencyChain,
} from "./configure-parameter-dependency-chain.ts";
import { createCompensatingRollbackOrchestrator } from "./configure-parameter-dependency-chain-rollback.ts";
import { type AscetPlanJsonValue, AscetPlanStore, createAscetPlanBinding } from "./edit/plan-store.ts";

function createDefinition(): ConfigureParameterDependencyDefinition {
	return {
		provider: {
			componentPath: "DEMO/Provider",
			element: {
				role: "providerExportedParameter",
				name: "P_Threshold",
				modelType: "cont",
				unit: "",
				comment: "Provider output",
				calibration: false,
				range: { mode: "none" },
				data: { mode: "ascetDefault" },
				implementation: { mode: "ascetDefault" },
			},
		},
		consumer: {
			componentPath: "DEMO/Consumer",
			element: {
				role: "consumerImportedParameter",
				name: "P_Threshold",
				modelType: "cont",
				unit: "",
			},
		},
		local: {
			componentPath: "DEMO/Consumer",
			element: {
				role: "localDependentParameter",
				name: "C_Threshold",
				modelType: "cont",
				unit: "",
				comment: "Dependent local",
				calibration: false,
				range: { mode: "none" },
				implementation: { mode: "ascetDefault" },
			},
		},
		dependency: {
			formula: "P_Threshold + K",
			formals: ["P_Threshold", "K"],
			bindingPolicy: "explicit",
			mappings: {
				P_Threshold: { kind: "parameter", name: "P_Threshold" },
				K: { kind: "constant", name: "K" },
			},
			variantPolicy: "selected",
			variants: ["Nominal"],
		},
	};
}

function createParams(mode: "plan" | "commit", planId?: string): ConfigureParameterDependencyChainParams {
	return mode === "plan" ? { ...createDefinition(), mode } : { mode, planId: planId ?? "missing-plan" };
}

function createFixture(): { cwd: string; store: AscetPlanStore; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "ascet-chain-test-"));
	const store = new AscetPlanStore({ artifactRoot: cwd });
	return { cwd, store, cleanup: () => rmSync(cwd, { recursive: true, force: true }) };
}

function appliedElementName(request: AscetCliRequest): string | undefined {
	if (request.args[1] !== "apply_element_spec" || request.args.includes("--mode")) return undefined;
	const specFile = request.args[3];
	if (!specFile) return undefined;
	const document = JSON.parse(readFileSync(specFile, "utf8")) as { elements?: Array<{ name?: string }> };
	return document.elements?.[0]?.name;
}

function successExecution(request: AscetCliRequest, marker: number): AscetCliExecutionResult {
	const command = request.args[1];
	const result =
		command === "read_element_catalog"
			? { elements: [] }
			: { readbackVerified: true, beforeDependency: "independent", beforeFormula: "", marker };
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function errorExecution(request: AscetCliRequest, code: string): AscetCliExecutionResult {
	return {
		exitCode: 1,
		stdout: JSON.stringify({ ok: false, error: { code, message: `${code} failed` } }),
		stderr: `${code} failed`,
		timedOut: false,
		request,
	};
}

async function makePlan(
	fixture: { cwd: string; store: AscetPlanStore },
	executeCli: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>,
	binding: { agentId?: string; sessionId?: string } = {},
): Promise<{ planId: string; calls: string[][] }> {
	const calls: string[][] = [];
	const result = await runConfigureParameterDependencyChain(
		createParams("plan"),
		{
			cwd: fixture.cwd,
			agentId: binding.agentId,
			sessionId: binding.sessionId,
			planStore: fixture.store,
			executeCli: async (request) => {
				calls.push(request.args);
				return executeCli(request);
			},
		},
		{},
	);
	assert.equal(result.status, "planned");
	if (result.status !== "planned") throw new Error("Expected plan result.");
	return { planId: result.planId, calls };
}

describe("configure_parameter_dependency_chain", () => {
	test("uses strict plan/commit schemas and persists all four preflight payloads", async () => {
		const fixture = createFixture();
		try {
			assert.equal(Value.Check(configureParameterDependencyChainParameters, createParams("plan")), true);
			const definition = createDefinition();
			assert.equal(
				Value.Check(configureParameterDependencyChainParameters, {
					...createParams("plan"),
					provider: { ...definition.provider, specFile: "provider.json" },
				}),
				false,
			);
			const { data: omittedData, ...incompleteProvider } = definition.provider.element;
			assert.ok(omittedData);
			assert.equal(
				Value.Check(configureParameterDependencyChainParameters, {
					...createParams("plan"),
					provider: { componentPath: definition.provider.componentPath, element: incompleteProvider },
				}),
				false,
			);
			assert.equal(
				Value.Check(configureParameterDependencyChainParameters, { ...createParams("plan"), unexpected: true }),
				false,
			);
			assert.equal(Value.Check(configureParameterDependencyChainParameters, createParams("commit", "plan-1")), true);
			assert.equal(
				Value.Check(configureParameterDependencyChainParameters, {
					...createParams("commit", "plan-1"),
					...createDefinition(),
				}),
				false,
			);
			const planned = await makePlan(fixture, (request) => Promise.resolve(successExecution(request, 1)));
			const persisted = fixture.store.load(planned.planId);
			const persistedDefinition = persisted.params as unknown as ConfigureParameterDependencyDefinition;
			assert.equal(Object.hasOwn(persistedDefinition.consumer.element, "comment"), false);
			assert.notEqual(planned.planId, "missing-plan");
			assert.ok(Array.isArray((persisted.backendPreflight as { stages?: unknown }).stages));
			assert.equal((persisted.backendPreflight as { stages: unknown[] }).stages.length, 4);
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects invalid P_/P_/C_ names before live preflight", async () => {
		const fixture = createFixture();
		try {
			const cases: Array<{
				name: string;
				mutate: (definition: ConfigureParameterDependencyDefinition) => void;
				errorCode: string;
			}> = [
				{
					name: "provider prefix",
					mutate: (definition) => {
						definition.provider.element.name = "Threshold";
					},
					errorCode: "provider_parameter_name_invalid",
				},
				{
					name: "imported prefix",
					mutate: (definition) => {
						definition.consumer.element.name = "Threshold";
					},
					errorCode: "imported_parameter_name_invalid",
				},
				{
					name: "provider/imported mismatch",
					mutate: (definition) => {
						definition.consumer.element.name = "P_Other";
					},
					errorCode: "provider_imported_parameter_name_mismatch",
				},
				{
					name: "local prefix",
					mutate: (definition) => {
						definition.local.element.name = "P_Local";
					},
					errorCode: "local_parameter_name_invalid",
				},
			];
			for (const scenario of cases) {
				const definition = createDefinition();
				scenario.mutate(definition);
				let calls = 0;
				const result = await runConfigureParameterDependencyChain(
					{ ...definition, mode: "plan" },
					{
						cwd: fixture.cwd,
						planStore: fixture.store,
						executeCli: async (request) => {
							calls += 1;
							return successExecution(request, 1);
						},
					},
					{},
				);
				assert.equal(result.status, "error", scenario.name);
				if (result.status !== "error") continue;
				assert.equal(result.error.code, scenario.errorCode, scenario.name);
				assert.equal(calls, 0, scenario.name);
			}
		} finally {
			fixture.cleanup();
		}
	});
	test("rejects persisted plans whose names violate the current chain contract", async () => {
		const fixture = createFixture();
		try {
			const definition = createDefinition();
			definition.consumer.element.name = "P_Other";
			const persisted = fixture.store.create({
				operation: "configure_parameter_dependency_chain",
				params: JSON.parse(JSON.stringify(definition)) as AscetPlanJsonValue,
				backendPreflight: {},
				binding: createAscetPlanBinding({ cwd: fixture.cwd }),
			});
			let calls = 0;
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", persisted.planId),
				{
					cwd: fixture.cwd,
					planStore: fixture.store,
					executeCli: async (request) => {
						calls += 1;
						return successExecution(request, 1);
					},
				},
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "plan_corrupt");
			assert.deepEqual(result.error.details, {
				code: "provider_imported_parameter_name_mismatch",
				message: "Provider Exported and Consumer Imported Parameter names must match exactly.",
			});
			assert.equal(calls, 0);
		} finally {
			fixture.cleanup();
		}
	});
	test("captures existing dependency mappings for compensating rollback", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => {
				if (request.args[1] !== "set_element_dependency") return successExecution(request, 1);
				return {
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							dependency: { before: "dependent", after: "dependent" },
							formula: { before: "Old", after: "P_Threshold + K" },
							beforeMappings: [
								{
									formal: "Old",
									valueName: "C_Old",
									targetKind: "constant",
									variant: "default",
								},
							],
						},
					}),
					stderr: "",
					timedOut: false,
					request,
				};
			};
			const planned = await makePlan(fixture, executeCli);
			const persisted = fixture.store.load(planned.planId);
			const evidence = (persisted.backendPreflight as { rollbackEvidence: Array<Record<string, unknown>> })
				.rollbackEvidence;
			const dependency = evidence.find((entry) => entry.kind === "dependency");
			assert.deepEqual(dependency?.beforeMappings, { Old: { kind: "constant", name: "C_Old" } });
			assert.equal(dependency?.beforeFormula, "Old");
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects a plan from a different agent/session before live preflight", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => successExecution(request, 1);
			const planned = await makePlan(fixture, executeCli, { agentId: "agent-a", sessionId: "session-a" });
			const calls: string[][] = [];
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{
					cwd: fixture.cwd,
					agentId: "agent-b",
					sessionId: "session-a",
					planStore: fixture.store,
					executeCli: async (request) => {
						calls.push(request.args);
						return executeCli(request);
					},
				},
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "plan_binding_mismatch");
			assert.deepEqual(calls, []);
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects a stale plan after commit preflight changes", async () => {
		const fixture = createFixture();
		try {
			let marker = 1;
			const executeCli = async (request: AscetCliRequest) => successExecution(request, marker);
			const planned = await makePlan(fixture, executeCli);
			marker = 2;
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "stale_plan");
		} finally {
			fixture.cleanup();
		}
	});

	test("ignores volatile live runtime metadata when verifying commit preflight", async () => {
		const fixture = createFixture();
		try {
			let invocation = 0;
			const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
				if (request.args[1] === "read_element_catalog") {
					return successExecution(request, 1);
				}
				invocation += 1;
				return {
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							readbackVerified: true,
							beforeDependency: "independent",
							beforeFormula: "",
							marker: 1,
							snapshot: {
								mode: "capture",
								path: `C:\\Temp\\dependency-${invocation}.xml`,
								hash: "stable-snapshot-hash",
							},
							identity: {
								componentOID: `component-${invocation}`,
								elementOID: `element-${invocation}`,
							},
							mappings: [
								{
									formal: "P_Threshold",
									valueName: "P_Threshold",
									targetKind: "parameter",
									formalOID: `formal-${invocation}`,
									valueOID: `value-${invocation}`,
								},
							],
						},
						meta: {
							bridgePid: 10_000 + invocation,
							bridgeGeneration: `generation-${invocation}`,
							durationMs: invocation,
						},
					}),
					stderr: "",
					timedOut: false,
					request,
				};
			};
			const planned = await makePlan(fixture, executeCli);
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "committed");
		} finally {
			fixture.cleanup();
		}
	});

	test("does not depend on model-created spec files after plan", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => successExecution(request, 1);
			const planned = await makePlan(fixture, executeCli);
			writeFileSync(join(fixture.cwd, "consumer.json"), JSON.stringify({ elements: [{ name: "changed" }] }), "utf8");
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "committed");
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects expired plans before any commit preflight or write", async () => {
		const fixture = createFixture();
		try {
			let now = new Date("2026-08-08T00:00:00.000Z");
			const store = new AscetPlanStore({ artifactRoot: fixture.cwd, now: () => now, defaultTtlMs: 1_000 });
			const executeCli = async (request: AscetCliRequest) => successExecution(request, 1);
			const planned = await makePlan({ ...fixture, store }, executeCli);
			now = new Date("2026-08-08T00:00:02.000Z");
			const calls: string[][] = [];
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{
					cwd: fixture.cwd,
					planStore: store,
					executeCli: async (request) => {
						calls.push(request.args);
						return executeCli(request);
					},
				},
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "plan_expired");
			assert.deepEqual(calls, []);
		} finally {
			fixture.cleanup();
		}
	});

	test("consumes a successful plan and rejects replay", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => successExecution(request, 1);
			const planned = await makePlan(fixture, executeCli);
			const options = { cwd: fixture.cwd, planStore: fixture.store, executeCli };
			const context = { hasUI: true, ui: { confirm: async () => true } };
			const first = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				options,
				context,
			);
			assert.equal(first.status, "committed");
			const second = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				options,
				context,
			);
			assert.equal(second.status, "error");
			if (second.status !== "error") return;
			assert.equal(second.error.code, "plan_consumed");
		} finally {
			fixture.cleanup();
		}
	});

	test("rolls back completed stages in reverse order after a partial write failure", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => {
				if (appliedElementName(request) === "C_Threshold") return errorExecution(request, "local_write_failed");
				return successExecution(request, 1);
			};
			const planned = await makePlan(fixture, (request) => Promise.resolve(successExecution(request, 1)));
			const rollbackOrder: string[] = [];
			const rollbackOrchestrator = createCompensatingRollbackOrchestrator(async (stage) => {
				rollbackOrder.push(stage.stage);
			});
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli, rollbackOrchestrator },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "configure_parameter_dependency_chain_local_spec_commit_failed");
			assert.deepEqual(rollbackOrder, ["consumer_spec", "provider_spec"]);
			assert.equal(result.rollback.result.status, "succeeded");
		} finally {
			fixture.cleanup();
		}
	});

	test("executes the default element restore rollback in reverse order", async () => {
		const fixture = createFixture();
		try {
			const planned = await makePlan(fixture, (request) => Promise.resolve(successExecution(request, 1)));
			const calls: string[][] = [];
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{
					cwd: fixture.cwd,
					planStore: fixture.store,
					executeCli: async (request) => {
						calls.push(request.args);
						if (appliedElementName(request) === "C_Threshold") {
							return errorExecution(request, "local_write_failed");
						}
						return successExecution(request, 1);
					},
				},
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.rollback.result.status, "succeeded");
			const restoreTargets = calls
				.filter((args) => args[1] === "apply_element_spec" && args.includes("--mode"))
				.map((args) => args[2]);
			assert.deepEqual(restoreTargets, ["DEMO\\Consumer", "DEMO\\Provider"]);
		} finally {
			fixture.cleanup();
		}
	});

	test("restores an existing dependent mapping with the default rollback", async () => {
		const fixture = createFixture();
		try {
			let dependencyWrites = 0;
			const dependencyRequests: string[][] = [];
			const executeCli = async (request: AscetCliRequest) => {
				if (request.args[1] !== "set_element_dependency") return successExecution(request, 1);
				if (request.args.includes("--dry-run")) {
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								dependency: { before: "dependent", after: "dependent" },
								formula: { before: "Old", after: "P_Threshold + K" },
								beforeMappings: [
									{
										formal: "Old",
										valueName: "C_Old",
										targetKind: "constant",
										variant: "default",
									},
								],
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				}
				dependencyWrites += 1;
				dependencyRequests.push(request.args);
				if (dependencyWrites === 1) {
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { readbackVerified: false } }),
						stderr: "",
						timedOut: false,
						request,
					};
				}
				return successExecution(request, 1);
			};
			const planned = await makePlan(fixture, executeCli);
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "configure_parameter_dependency_chain_dependency_commit_failed");
			assert.equal(result.rollback.result.status, "succeeded");
			assert.equal(dependencyRequests.length, 2);
			const restore = dependencyRequests[1] ?? [];
			assert.ok(restore.includes("--formula"));
			assert.ok(restore.includes("Old"));
			assert.ok(restore.includes("--mapping"));
			assert.ok(restore.includes("Old=constant:C_Old"));
			assert.ok(restore.includes("--variant-policy"));
			assert.ok(restore.includes("default"));
		} finally {
			fixture.cleanup();
		}
	});

	test("reports rollback failure while preserving the original write failure", async () => {
		const fixture = createFixture();
		try {
			const executeCli = async (request: AscetCliRequest) => {
				if (appliedElementName(request) === "C_Threshold") return errorExecution(request, "local_write_failed");
				return successExecution(request, 1);
			};
			const planned = await makePlan(fixture, (request) => Promise.resolve(successExecution(request, 1)));
			const rollbackOrder: string[] = [];
			const rollbackOrchestrator = createCompensatingRollbackOrchestrator(async (stage) => {
				rollbackOrder.push(stage.stage);
				if (stage.stage === "consumer_spec") throw new Error("consumer restore failed");
			});
			const result = await runConfigureParameterDependencyChain(
				createParams("commit", planned.planId),
				{ cwd: fixture.cwd, planStore: fixture.store, executeCli, rollbackOrchestrator },
				{ hasUI: true, ui: { confirm: async () => true } },
			);
			assert.equal(result.status, "error");
			if (result.status !== "error") return;
			assert.equal(result.error.code, "write_rollback_failed");
			assert.deepEqual(rollbackOrder, ["consumer_spec", "provider_spec"]);
			assert.equal(result.rollback.result.status, "failed");
			assert.equal(result.rollback.result.stages[0]?.status, "failed");
			assert.equal(result.rollback.result.stages[1]?.status, "succeeded");
		} finally {
			fixture.cleanup();
		}
	});
});

import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	type ConfigureParameterDependencyDefinition,
	configureParameterDependencyChainParameters,
	runConfigureParameterDependencyChain,
} from "./configure-parameter-dependency-chain.ts";

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

function createFixture(): { cwd: string; cliPath: string; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "ascet-chain-execute-"));
	const cliPath = join(cwd, "AscetBridge.exe");
	writeFileSync(cliPath, "test");
	return { cwd, cliPath, cleanup: () => rmSync(cwd, { recursive: true, force: true }) };
}

function bridgeExecution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			type: "response",
			protocolVersion: 1,
			ok: true,
			result,
			error: null,
			meta: {
				bridgePid: 1,
				bridgeGeneration: "test",
				durationMs: 1,
				sessionPolicy: "fresh_session",
				mutationStarted: result.mutationStarted === true,
				mode: "exec",
				operation: "configure_parameter_dependency_chain_execute",
			},
		}),
		stderr: "",
		timedOut: false,
		request,
		spawnAttempted: true,
		spawnSucceeded: true,
		requestDispatched: true,
		processClosed: true,
		validResponseReceived: true,
	};
}

function approvedContext(onConfirm?: (message: string) => void) {
	return {
		hasUI: true,
		ui: {
			confirm: async (_title: string, message: string) => {
				onConfirm?.(message);
				return true;
			},
		},
	};
}

describe("configure_parameter_dependency_chain execute", () => {
	test("exposes one strict schema without mode or planId", () => {
		const definition = createDefinition();
		assert.equal(Value.Check(configureParameterDependencyChainParameters, definition), true);
		assert.equal(Value.Check(configureParameterDependencyChainParameters, { ...definition, mode: "execute" }), false);
		assert.equal(Value.Check(configureParameterDependencyChainParameters, { ...definition, mode: "plan" }), false);
		assert.equal(Value.Check(configureParameterDependencyChainParameters, { mode: "commit", planId: "x" }), false);
	});

	test("rejects invalid naming and mapping before confirmation or Bridge execution", async () => {
		const fixture = createFixture();
		let confirmed = false;
		let calls = 0;
		try {
			const definition = createDefinition();
			definition.local.element.name = "P_Threshold";
			const result = await runConfigureParameterDependencyChain(
				definition,
				{
					cwd: fixture.cwd,
					cliPath: fixture.cliPath,
					executeCli: async (request) => {
						calls += 1;
						return bridgeExecution(request, { status: "committed", mutationStarted: true });
					},
				},
				approvedContext(() => {
					confirmed = true;
				}),
			);
			assert.equal(result.status, "rejected");
			assert.equal(result.mutationStarted, false);
			assert.equal(confirmed, false);
			assert.equal(calls, 0);
		} finally {
			fixture.cleanup();
		}
	});

	test("confirms once then dispatches one Bridge execute request with normalized inline specs", async () => {
		const fixture = createFixture();
		let confirmations = 0;
		const calls: AscetCliRequest[] = [];
		let requestPath = "";
		let requestDocument: Record<string, unknown> | undefined;
		try {
			const result = await runConfigureParameterDependencyChain(
				createDefinition(),
				{
					cwd: fixture.cwd,
					cliPath: fixture.cliPath,
					executeCli: async (request) => {
						calls.push(request);
						requestPath = request.args[2] ?? "";
						requestDocument = JSON.parse(readFileSync(requestPath, "utf8")) as Record<string, unknown>;
						return bridgeExecution(request, {
							status: "committed",
							writesPerformed: true,
							mutationStarted: true,
							consistency: "compensating",
							beforeStateHash: "before",
							afterStateHash: "after",
							verification: { status: "passed", verified: true },
							rollback: { required: false, status: "not_required" },
						});
					},
				},
				approvedContext((message) => {
					confirmations += 1;
					assert.match(message, /P_Threshold \+ K/u);
					assert.match(message, /compensating rollback/u);
				}),
			);
			assert.equal(result.status, "committed");
			assert.equal(confirmations, 1);
			assert.equal(calls.length, 1);
			assert.deepEqual(calls[0]?.args.slice(0, 2), ["exec", "configure_parameter_dependency_chain_execute"]);
			assert.ok(requestDocument);
			assert.equal((requestDocument?.dependency as { elementName?: string }).elementName, "C_Threshold");
			assert.equal(
				((requestDocument?.provider as { spec?: { elements?: Array<{ name?: string }> } }).spec?.elements ?? [])[0]
					?.name,
				"P_Threshold",
			);
			assert.equal(existsSync(requestPath), false);
		} finally {
			fixture.cleanup();
		}
	});

	test("passes through no_change, rejected, rolled_back, and rollback_failed results", async () => {
		for (const status of ["no_change", "rejected", "rolled_back", "rollback_failed"] as const) {
			const fixture = createFixture();
			try {
				const result = await runConfigureParameterDependencyChain(
					createDefinition(),
					{
						cwd: fixture.cwd,
						cliPath: fixture.cliPath,
						executeCli: async (request) =>
							bridgeExecution(request, {
								status,
								writesPerformed: status === "rolled_back" || status === "rollback_failed",
								mutationStarted: status === "rolled_back" || status === "rollback_failed",
								rollback: { required: status === "rolled_back" || status === "rollback_failed" },
							}),
					},
					approvedContext(),
				);
				assert.equal(result.status, status);
				assert.equal(result.consistency, "compensating");
			} finally {
				fixture.cleanup();
			}
		}
	});

	test("does not dispatch when confirmation is declined", async () => {
		const fixture = createFixture();
		let calls = 0;
		try {
			const result = await runConfigureParameterDependencyChain(
				createDefinition(),
				{
					cwd: fixture.cwd,
					cliPath: fixture.cliPath,
					executeCli: async (request) => {
						calls += 1;
						return bridgeExecution(request, { status: "committed" });
					},
				},
				{ hasUI: true, ui: { confirm: async () => false } },
			);
			assert.equal(result.status, "blocked");
			assert.equal(result.mutationStarted, false);
			assert.equal(calls, 0);
		} finally {
			fixture.cleanup();
		}
	});
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	buildReadDependentChainArgs,
	formatReadDependentChainResult,
	parseAscetElementSearchHint,
	runAscetReadDependentChain,
} from "./read-dependent-chain.ts";
import { ascetReadDependentChainActionContract } from "./tools/actions/contracts/dependency.ts";

function execution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

function searchExecution(request: AscetCliRequest, items: string[]): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			mode: "element",
			q: "P_Threshold",
			ui: true,
			count: items.length,
			items,
			ms: 10,
			waitMs: 2,
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

function metadataResult(request: AscetCliRequest): AscetCliExecutionResult {
	return execution(request, {
		component: "FeatureA\\Consumer",
		dependent: { name: "C_Threshold", kind: "parameter", scope: "local", dependency: "dependent" },
		dependencyFormula: {
			exists: true,
			code: "P_Threshold",
			references: ["P_Threshold"],
			mappings: [{ formal: "P_Threshold", imported: "P_Threshold", importedScope: "imported" }],
		},
		inputs: [
			{
				formal: { name: "P_Threshold" },
				value: { name: "P_Threshold", scope: "imported", kind: "parameter", type: "ScalarElement" },
				export: { exists: false, discovery: "deferred" },
				issue: "provider_resolution_deferred",
			},
		],
		complete: false,
		issues: ["provider_resolution_deferred:P_Threshold"],
	});
}

function resolvedResult(request: AscetCliRequest, provider = "FeatureA\\Provider"): AscetCliExecutionResult {
	return execution(request, {
		component: "FeatureA\\Consumer",
		exporter: provider,
		dependent: {
			name: "C_Threshold",
			kind: "parameter",
			scope: "local",
			dependency: "dependent",
			modelType: "cont",
		},
		dependencyFormula: {
			exists: true,
			code: "P_Threshold",
			expression: "P_Threshold",
			references: ["P_Threshold"],
			mappings: [{ formal: "P_Threshold", imported: "P_Threshold", importedScope: "imported" }],
		},
		binding: { formal: "P_Threshold", formula: "P_Threshold", variantPolicy: "default" },
		inputs: [
			{
				formal: { name: "P_Threshold" },
				value: { name: "P_Threshold", scope: "imported", kind: "parameter", type: "ScalarElement" },
				export: {
					exists: true,
					discovery: "explicit",
					name: "P_Threshold",
					scope: "exported",
					owner: provider,
				},
			},
		],
		complete: true,
		issues: [],
	});
}

function resolvedResultWithoutBackendBinding(request: AscetCliRequest, variants: string[]): AscetCliExecutionResult {
	const result = resolvedResult(request);
	const response = JSON.parse(result.stdout) as { result: Record<string, unknown> };
	const inputs = Array.isArray(response.result.inputs) ? response.result.inputs : [];
	const firstInput = inputs[0];
	if (!firstInput || typeof firstInput !== "object" || Array.isArray(firstInput)) {
		throw new Error("Test fixture must contain one input object.");
	}
	response.result = {
		...response.result,
		inputs: variants.map((variant) => ({ ...(firstInput as Record<string, unknown>), variant })),
	};
	delete response.result.binding;
	return { ...result, stdout: JSON.stringify(response) };
}

function identityResult(request: AscetCliRequest): AscetCliExecutionResult {
	return execution(request, {
		items: [],
		database: { name: "DB", path: "C:\\Repo\\DB" },
	});
}

describe("ASCET read dependent chain", () => {
	test("builds an exact explicit-provider read", () => {
		assert.deepEqual(
			buildReadDependentChainArgs({
				componentPath: "DEMO\\Consumer",
				dependentElement: "K_Effective",
				exporterComponentPath: "DEMO\\Provider",
			}),
			["exec", "read_dependent_chain", "DEMO\\Consumer", "K_Effective", "--exporter", "DEMO\\Provider", "--json"],
		);
	});

	test("parses native Element Search labels into exact Component path hints", () => {
		assert.equal(
			parseAscetElementSearchHint("P_Threshold::1D[cont->cont] - Provider (FeatureA\\Parameters)", "P_Threshold"),
			"FeatureA\\Parameters\\Provider",
		);
		assert.equal(parseAscetElementSearchHint("unrelated", "P_Threshold"), undefined);
		assert.equal(
			parseAscetElementSearchHint("Other::1D[cont->cont] - Provider (FeatureA\\Parameters)", "P_Threshold"),
			undefined,
		);
	});

	test("formats complete Provider/Imported/Local metadata and binding data", () => {
		const request: AscetCliRequest = { cwd: ".", cliPath: "AscetBridge.exe", args: [] };
		const result = resolvedResult(request);
		const cliResult = {
			ok: true,
			data: JSON.parse(result.stdout),
			request,
			stdout: result.stdout,
			stderr: "",
			exitCode: 0,
			timedOut: false,
		};
		const output = JSON.parse(formatReadDependentChainResult(cliResult));
		assert.deepEqual(output, {
			found: true,
			chain: {
				local: { componentPath: "FeatureA\\Consumer", element: "C_Threshold" },
				imported: { componentPath: "FeatureA\\Consumer", element: "P_Threshold" },
				exported: { componentPath: "FeatureA\\Provider", element: "P_Threshold" },
			},
			provider: {
				componentPath: "FeatureA\\Provider",
				element: {
					exists: true,
					discovery: "explicit",
					name: "P_Threshold",
					scope: "exported",
					owner: "FeatureA\\Provider",
				},
			},
			consumer: {
				componentPath: "FeatureA\\Consumer",
				imported: { name: "P_Threshold", scope: "imported", kind: "parameter", type: "ScalarElement" },
				local: {
					name: "C_Threshold",
					kind: "parameter",
					scope: "local",
					dependency: "dependent",
					modelType: "cont",
				},
			},
			dependencyFormula: {
				exists: true,
				code: "P_Threshold",
				expression: "P_Threshold",
				references: ["P_Threshold"],
				mappings: [{ formal: "P_Threshold", imported: "P_Threshold", importedScope: "imported" }],
			},
			binding: { formal: "P_Threshold", formula: "P_Threshold", variantPolicy: "default" },
			complete: true,
		});
		assert.equal(Value.Check(ascetReadDependentChainActionContract.result, output), true);
		const { binding: _binding, ...withoutBinding } = output;
		assert.equal(Value.Check(ascetReadDependentChainActionContract.result, withoutBinding), false);
	});

	test("formats non-chain targets as the public error shape", () => {
		const request: AscetCliRequest = { cwd: ".", cliPath: "AscetBridge.exe", args: [] };
		const output = JSON.parse(
			formatReadDependentChainResult({
				ok: false,
				data: null,
				request,
				stdout: "",
				stderr: "",
				exitCode: 1,
				timedOut: false,
				error: {
					code: "not_dependent_chain",
					message: "Element is not a dependent chain target.",
					details: { componentPath: "FeatureA\\Consumer", dependentElement: "P_Regular" },
				},
			}),
		);
		assert.deepEqual(output, {
			error: {
				code: "not_dependent_chain",
				message: "Element is not a dependent chain target.",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "P_Regular",
			},
		});
		assert.equal(Value.Check(ascetReadDependentChainActionContract.result, output), true);
		assert.equal("found" in output, false);
	});

	test("derives binding when the backend exposes only formula mappings and input variants", () => {
		const request: AscetCliRequest = { cwd: ".", cliPath: "AscetBridge.exe", args: [] };
		const defaultResult = resolvedResultWithoutBackendBinding(request, ["default"]);
		const defaultOutput = JSON.parse(
			formatReadDependentChainResult({
				ok: true,
				data: JSON.parse(defaultResult.stdout),
				request,
				stdout: defaultResult.stdout,
				stderr: defaultResult.stderr,
				exitCode: 0,
				timedOut: false,
			}),
		);
		assert.deepEqual(defaultOutput.binding, {
			importedElement: "P_Threshold",
			formula: "P_Threshold",
			formal: "P_Threshold",
			variantPolicy: "default",
		});

		const selectedResult = resolvedResultWithoutBackendBinding(request, ["default", "Sport"]);
		const selectedOutput = JSON.parse(
			formatReadDependentChainResult({
				ok: true,
				data: JSON.parse(selectedResult.stdout),
				request,
				stdout: selectedResult.stdout,
				stderr: selectedResult.stderr,
				exitCode: 0,
				timedOut: false,
			}),
		);
		assert.deepEqual(selectedOutput.binding, {
			importedElement: "P_Threshold",
			formula: "P_Threshold",
			formal: "P_Threshold",
			variantPolicy: "selected",
			variants: ["Sport"],
		});
		assert.equal(Value.Check(ascetReadDependentChainActionContract.result, defaultOutput), true);
		assert.equal(Value.Check(ascetReadDependentChainActionContract.result, selectedOutput), true);
	});

	test("uses one exact backend call when Provider is explicit", async () => {
		const calls: AscetCliRequest[] = [];
		const result = await runAscetReadDependentChain(
			{
				componentPath: "FeatureA\\Consumer",
				dependentElement: "C_Threshold",
				exporterComponentPath: "FeatureA\\Provider",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls.push(request);
					return resolvedResult(request);
				},
			},
		);
		assert.equal(result.ok, true);
		assert.equal(calls.length, 1);
	});

	test("resolves one live Search candidate and validates exact metadata", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-dependent-chain-"));
		const searchPath = join(root, "AscetSearch.exe");
		writeFileSync(searchPath, "", "utf8");
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "FeatureA\\Consumer", dependentElement: "C_Threshold" },
				{
					cwd: root,
					env: {
						ASCET_SEARCH_PATH: searchPath,
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
						PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
					},
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[0] === "element") {
							return searchExecution(request, ["P_Threshold::1D[cont->cont] - Provider (FeatureA)"]);
						}
						if (request.args[1] === "get_database_identity") return identityResult(request);
						if (request.args[1] === "read_dependent_chain") {
							return request.args.includes("--exporter") ? resolvedResult(request) : metadataResult(request);
						}
						if (request.args[1] === "read_element_catalog") {
							const scope = request.args[2] === "FeatureA\\Consumer" ? "imported" : "exported";
							return execution(request, {
								elements: [{ name: "P_Threshold", kind: "parameter", scope, modelType: "cont" }],
							});
						}
						throw new Error(`Unexpected call: ${request.args.join(" ")}`);
					},
				},
			);
			assert.equal(result.ok, true);
			assert.deepEqual(
				calls.map((args) => (args[0] === "element" ? "native_element_search" : args[1])),
				[
					"get_database_identity",
					"read_dependent_chain",
					"read_element_catalog",
					"native_element_search",
					"read_element_catalog",
					"read_dependent_chain",
					"get_database_identity",
				],
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("fails closed when multiple exact compatible Providers validate", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-dependent-ambiguous-"));
		const searchPath = join(root, "AscetSearch.exe");
		writeFileSync(searchPath, "", "utf8");
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "FeatureA\\Consumer", dependentElement: "C_Threshold" },
				{
					cwd: root,
					env: {
						ASCET_SEARCH_PATH: searchPath,
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
						PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
					},
					executeCli: async (request) => {
						if (request.args[0] === "element") {
							return searchExecution(request, [
								"P_Threshold::1D[cont->cont] - ProviderA (FeatureA)",
								"P_Threshold::1D[cont->cont] - ProviderB (FeatureA)",
							]);
						}
						if (request.args[1] === "get_database_identity") return identityResult(request);
						if (request.args[1] === "read_dependent_chain") return metadataResult(request);
						if (request.args[1] === "read_element_catalog") {
							const scope = request.args[2] === "FeatureA\\Consumer" ? "imported" : "exported";
							return execution(request, {
								elements: [{ name: "P_Threshold", kind: "parameter", scope, modelType: "cont" }],
							});
						}
						throw new Error(`Unexpected call: ${request.args.join(" ")}`);
					},
				},
			);
			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "provider_ambiguous");
			assert.deepEqual((result.error?.details as { candidates?: string[] }).candidates, [
				"FeatureA\\ProviderA\\P_Threshold",
				"FeatureA\\ProviderB\\P_Threshold",
			]);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("does not infer Imported Parameter from Formula references", async () => {
		let searchCalled = false;
		const result = await runAscetReadDependentChain(
			{ componentPath: "FeatureA\\Consumer", dependentElement: "C_Threshold" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[0] === "element") searchCalled = true;
					if (request.args[1] === "get_database_identity") return identityResult(request);
					return execution(request, {
						component: "FeatureA\\Consumer",
						dependencyFormula: { references: ["P_Threshold"], mappings: [] },
						inputs: [],
						complete: false,
					});
				},
			},
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "incomplete_chain");
		assert.equal(searchCalled, false);
	});

	test("classifies an ordinary imported parameter before provider resolution", async () => {
		let searchCalled = false;
		const result = await runAscetReadDependentChain(
			{ componentPath: "FeatureA\\Consumer", dependentElement: "P_Regular" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					if (request.args[0] === "element") searchCalled = true;
					if (request.args[1] === "get_database_identity") return identityResult(request);
					return execution(request, {
						component: "FeatureA\\Consumer",
						dependent: { name: "P_Regular", kind: "parameter", scope: "imported", dependency: "independent" },
						dependencyFormula: { exists: false, mappings: [] },
						inputs: [],
						complete: false,
					});
				},
			},
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "not_dependent_chain");
		assert.deepEqual(result.error?.details, {
			componentPath: "FeatureA\\Consumer",
			dependentElement: "P_Regular",
		});
		assert.deepEqual(JSON.parse(formatReadDependentChainResult(result)), {
			error: {
				code: "not_dependent_chain",
				message: "Element is not a dependent chain target.",
				componentPath: "FeatureA\\Consumer",
				dependentElement: "P_Regular",
			},
		});
		assert.equal(searchCalled, false);
	});
});

import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	buildReadDependentChainArgs,
	formatReadDependentChainResult,
	parseAscetElementSearchHint,
	runAscetReadDependentChain,
} from "./read-dependent-chain.ts";

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
		dependent: { name: "C_Threshold", kind: "parameter", scope: "local", dependency: "dependent" },
		inputs: [
			{
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

	test("formats one concise resolved chain", () => {
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
		assert.deepEqual(JSON.parse(formatReadDependentChainResult(cliResult)), {
			found: true,
			chain: {
				local: { componentPath: "FeatureA\\Consumer", element: "C_Threshold" },
				imported: { componentPath: "FeatureA\\Consumer", element: "P_Threshold" },
				exported: { componentPath: "FeatureA\\Provider", element: "P_Threshold" },
			},
		});
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
});

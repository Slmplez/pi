import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetReadDependentChain } from "./read-dependent-chain.ts";
import { type AscetSearchIndexEntry, resetAscetSearchIndexForTest, upsertAscetFullElements } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-read-chain-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function element(
	params: Partial<AscetSearchIndexEntry> & { componentPath: string; elementName: string },
): AscetSearchIndexEntry {
	return {
		group: "primitive",
		componentKind: "class",
		componentLanguageKind: "ESDL",
		elementKind: "parameter",
		displayType: "cont",
		displayScope: "Local",
		referencedComponentPath: "",
		path: `${params.componentPath}/${params.elementName}`,
		...params,
	};
}

function seedIndex(entries: AscetSearchIndexEntry[]): void {
	resetAscetSearchIndexForTest({
		databaseName: "DemoDb",
		databasePath: "C:\\ASCET\\DemoDb",
		entries,
		generatedAtMs: Date.now(),
		elapsedMs: 1,
		scanComplete: true,
	});
}

function makeExecution(request: AscetCliRequest, payload: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: payload, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ASCET read dependent chain live-mapping-first resolver", () => {
	test("uses ready element index and full cache without legacy live chain", async () => {
		seedIndex([
			element({ componentPath: "A/Consumer", elementName: "K", displayScope: "Local" }),
			element({ componentPath: "A/Provider", elementName: "K", displayScope: "Exported" }),
		]);
		upsertAscetFullElements([
			{
				componentPath: "A/Provider",
				name: "K",
				kind: "parameter",
				type: "cont",
				scope: "Exported",
				path: "A/Provider/K",
				source: "live_readback",
				updatedAtMs: Date.now(),
				data: { name: "K", kind: "parameter", modelType: "cont", scope: "Exported" },
			},
		]);
		let calls = 0;

		const result = await runAscetReadDependentChain(
			{ componentPath: "A/Consumer", dependentElement: "K", fallback: "none" },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls += 1;
					return makeExecution(request, {});
				},
			},
		);

		assert.equal(result.ok, true);
		assert.equal(calls, 0);
		const payload = result.data as {
			provider?: { component?: string };
			element?: { source?: string };
			providerLookupSource?: string;
		};
		assert.equal(payload.provider?.component, "A/Provider");
		assert.equal(payload.element?.source, "full_element_cache");
		assert.equal(payload.providerLookupSource, "index");
	});

	test("reads provider catalog when full cache misses", async () => {
		seedIndex([
			element({ componentPath: "A/Consumer", elementName: "K", displayScope: "Local" }),
			element({ componentPath: "A/Provider", elementName: "K", displayScope: "Exported" }),
		]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "A/Consumer", dependentElement: "K", fallback: "none" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						return makeExecution(request, {
							elements: [{ name: "K", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as { element?: { source?: string; data?: { scope?: string } } };
			assert.equal(result.ok, true);
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_element_catalog"],
			);
			assert.equal(payload.element?.source, "live");
			assert.equal(payload.element?.data?.scope, "Exported");
		} finally {
			fixture.cleanup();
		}
	});

	test("follows referenced provider catalogs when index points at a wrapper component", async () => {
		seedIndex([
			element({ componentPath: "A/Consumer", elementName: "K", displayScope: "Local" }),
			element({ componentPath: "A/Wrapper", elementName: "K", displayScope: "Exported" }),
		]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "A/Consumer", dependentElement: "K", fallback: "none" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args.includes("A\\Wrapper")) {
							return makeExecution(request, {
								elements: [{ name: "Child", kind: "component", referencedComponentPath: "A\\Child" }],
							});
						}
						return makeExecution(request, {
							elements: [{ name: "K", kind: "table", modelType: "cont", scope: "exported", values: [1, 2] }],
						});
					},
				},
			);

			const payload = result.data as {
				provider?: { component?: string; path?: string };
				element?: { source?: string; component?: string; data?: { kind?: string; values?: number[] } };
			};
			assert.deepEqual(
				calls.map((args) => args[2]),
				["A\\Wrapper", "A\\Child"],
			);
			assert.equal(payload.provider?.component, "A/Child");
			assert.equal(payload.provider?.path, "A/Child::K");
			assert.equal(payload.element?.component, "A/Child");
			assert.equal(payload.element?.data?.kind, "table");
			assert.deepEqual(payload.element?.data?.values, [1, 2]);
		} finally {
			fixture.cleanup();
		}
	});

	test("reports ambiguity for multiple exported provider candidates", async () => {
		seedIndex([
			element({ componentPath: "A/Provider1", elementName: "K", displayScope: "Exported" }),
			element({ componentPath: "A/Provider2", elementName: "K", displayScope: "Exported" }),
		]);

		const result = await runAscetReadDependentChain(
			{ componentPath: "A/Consumer", dependentElement: "K", fallback: "none" },
			{ cwd: process.cwd() },
		);

		const payload = result.data as { total?: number; items?: unknown[]; issues?: Array<{ code?: string }> };
		assert.equal(result.ok, true);
		assert.equal(payload.total, 2);
		assert.equal(payload.items?.length, 2);
		assert.equal(payload.issues?.[0]?.code, "exportedProviderAmbiguous");
	});

	test("uses legacy chain only to recover non-identical imported provider names", async () => {
		seedIndex([
			element({ componentPath: "A/Consumer", elementName: "P_K", displayScope: "Local" }),
			element({ componentPath: "A/Consumer", elementName: "C_K", displayScope: "Imported" }),
			element({ componentPath: "A/Provider", elementName: "C_K", displayScope: "Exported" }),
		]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "A/Consumer", dependentElement: "P_K" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_dependent_chain") {
							return makeExecution(request, {
								component: "A/Consumer",
								dependent: { name: "P_K", scope: "Local", dependency: "dependent", formula: "C_K" },
								dependencyFormula: {
									code: "C_K",
									references: ["C_K"],
									mappings: [{ formal: "C_K", imported: "C_K" }],
								},
								inputs: [
									{
										formal: { name: "C_K" },
										value: { name: "C_K", scope: "Imported" },
										export: { exists: true, name: "C_K", scope: "Exported", owner: "A/Provider" },
									},
								],
								complete: true,
							});
						}
						return makeExecution(request, {
							elements: [{ name: "C_K", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as {
				provider?: { component?: string; name?: string };
				consumer?: { formula?: { code?: string } };
			};
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_dependent_chain", "read_element_catalog"],
			);
			assert.equal(payload.provider?.component, "A/Provider");
			assert.equal(payload.provider?.name, "C_K");
			assert.equal(payload.consumer?.formula?.code, "C_K");
		} finally {
			fixture.cleanup();
		}
	});

	test("live owner mapping wins over an unrelated same-name index provider", async () => {
		seedIndex([element({ componentPath: "A/IndexedProvider", elementName: "K_Shared", displayScope: "Exported" })]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "A/Consumer", dependentElement: "K_Effective" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_dependent_chain") {
							return makeExecution(request, {
								component: "A/Consumer",
								dependent: {
									name: "K_Effective",
									scope: "Local",
									dependency: "dependent",
									formula: "K_Shared",
								},
								dependencyFormula: {
									code: "K_Shared",
									references: ["K_Shared"],
									mappings: [{ formal: "K_Shared", imported: "K_Shared" }],
								},
								inputs: [
									{
										formal: { name: "K_Shared" },
										value: { name: "K_Shared", scope: "Imported" },
										export: { exists: true, name: "K_Shared", scope: "Exported", owner: "A/LiveProvider" },
									},
								],
								complete: true,
								issues: [],
							});
						}
						return makeExecution(request, {
							elements: [{ name: "K_Shared", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as {
				provider?: { component?: string };
				providerLookupSource?: string;
				complete?: boolean;
				issues?: unknown[];
			};
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_dependent_chain", "read_element_catalog"],
			);
			assert.equal(payload.provider?.component, "A/LiveProvider");
			assert.equal(payload.providerLookupSource, "live");
			assert.equal(payload.complete, true);
			assert.deepEqual(payload.issues, []);
		} finally {
			fixture.cleanup();
		}
	});

	test("promotes an indexed provider when legacy resolution reports export_not_found", async () => {
		seedIndex([element({ componentPath: "A/Provider", elementName: "K_Shared", displayScope: "Exported" })]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{ componentPath: "A/Consumer", dependentElement: "K_Effective" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_dependent_chain") {
							return makeExecution(request, {
								component: "A/Consumer",
								dependent: {
									name: "K_Effective",
									scope: "local",
									dependency: "dependent",
									formula: "K_Shared",
								},
								dependencyFormula: {
									code: "K_Shared",
									references: ["K_Shared"],
									mappings: [{ formal: "K_Shared", imported: "K_Shared" }],
								},
								inputs: [
									{
										formal: { name: "K_Shared" },
										value: { name: "K_Shared", scope: "Imported" },
										export: { exists: false, discovery: "auto" },
										issue: "export_not_found",
									},
								],
								complete: false,
								issues: ["export_not_found:K_Shared"],
							});
						}
						return makeExecution(request, {
							elements: [{ name: "K_Shared", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as { complete?: boolean; issues?: unknown[] };
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_dependent_chain", "read_element_catalog"],
			);
			assert.equal(payload.complete, true);
			assert.deepEqual(payload.issues, []);
		} finally {
			fixture.cleanup();
		}
	});

	test("recovers the dependency formula when the legacy chain export has no mapping", async () => {
		seedIndex([element({ componentPath: "A/Provider", elementName: "K_Shared", displayScope: "Exported" })]);
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{
					componentPath: "A/Consumer",
					dependentElement: "K_Effective",
					exporterComponentPath: "A/Provider",
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_dependent_chain") {
							return makeExecution(request, {
								component: "A/Consumer",
								dependent: { name: "K_Effective", scope: "local", dependency: "dependent" },
								dependencyFormula: { exists: false, references: [], mappings: [] },
								inputs: [],
								complete: false,
								issues: ["dependency_mapping_not_found"],
							});
						}
						if (request.args[1] === "read_element_dependency") {
							return makeExecution(request, {
								target: "A/Consumer",
								element: "K_Effective",
								count: 1,
								matches: [
									{
										component: "A/Consumer",
										element: "K_Effective",
										dependency: "dependent",
										formula: "K_Shared",
										supported: true,
									},
								],
								issues: [],
							});
						}
						return makeExecution(request, {
							elements: [{ name: "K_Shared", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as {
				provider?: { component?: string; name?: string };
				consumer?: { formula?: { code?: string } };
				complete?: boolean;
				issues?: unknown[];
			};
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_dependent_chain", "read_element_dependency", "read_element_catalog"],
			);
			assert.equal(payload.provider?.component, "A/Provider");
			assert.equal(payload.provider?.name, "K_Shared");
			assert.equal(payload.consumer?.formula?.code, "K_Shared");
			assert.equal(payload.complete, true);
			assert.deepEqual(payload.issues, []);
		} finally {
			fixture.cleanup();
		}
	});

	test("uses the explicit exporter as a live fallback when the declaration index has no provider", async () => {
		const fixture = createReadyEnv();
		const calls: string[][] = [];
		try {
			const result = await runAscetReadDependentChain(
				{
					componentPath: "A/Consumer",
					dependentElement: "K_Effective",
					exporterComponentPath: "A/Provider",
				},
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => {
						calls.push(request.args);
						if (request.args[1] === "read_dependent_chain") {
							return makeExecution(request, {
								component: "A/Consumer",
								dependent: { name: "K_Effective", scope: "local", dependency: "dependent" },
								inputs: [],
								complete: false,
								issues: ["dependency_mapping_not_found"],
							});
						}
						if (request.args[1] === "read_element_dependency") {
							return makeExecution(request, {
								target: "A/Consumer",
								element: "K_Effective",
								matches: [
									{ component: "A/Consumer", element: "K_Effective", formula: "K_Shared", supported: true },
								],
								issues: [],
							});
						}
						return makeExecution(request, {
							elements: [{ name: "K_Shared", kind: "parameter", modelType: "cont", scope: "Exported" }],
						});
					},
				},
			);

			const payload = result.data as {
				provider?: { component?: string; name?: string };
				providerLookupSource?: string;
				complete?: boolean;
			};
			assert.deepEqual(
				calls.map((args) => args[1]),
				["read_dependent_chain", "read_element_dependency", "read_element_catalog"],
			);
			assert.equal(payload.provider?.component, "A/Provider");
			assert.equal(payload.provider?.name, "K_Shared");
			assert.equal(payload.providerLookupSource, "live");
			assert.equal(payload.complete, true);
		} finally {
			fixture.cleanup();
		}
	});
});

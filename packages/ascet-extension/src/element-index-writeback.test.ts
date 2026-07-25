import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { refreshElementsFromLiveCatalog } from "./element-index-writeback.ts";
import { getAscetFullElement, queryAscetSearchIndex, resetAscetSearchIndexForTest } from "./search-index.ts";

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-element-writeback-"));
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

function makeExecution(request: AscetCliRequest, payload: unknown, exitCode = 0): AscetCliExecutionResult {
	return {
		exitCode,
		stdout: exitCode === 0 ? JSON.stringify({ ok: true, result: payload, error: null }) : "",
		stderr: exitCode === 0 ? "" : "catalog failed",
		timedOut: false,
		request,
	};
}

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ASCET element index writeback", () => {
	test("upserts declaration and full cache from live catalog", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			components: [
				{
					path: "A\\Provider",
					name: "Provider",
					kind: "class",
					languageKind: "ESDL",
					displayName: "Provider",
					parentPath: "A",
					ownerKind: "folder",
					targetKind: "component",
					objectKind: "class",
				},
			],
			entries: [],
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
		});
		const fixture = createReadyEnv();
		try {
			const result = await refreshElementsFromLiveCatalog(
				{ componentPath: "A/Provider", names: ["K"], reason: "test", stale: ["text_code"] },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) =>
						makeExecution(request, {
							elements: [{ name: "K", kind: "parameter", modelType: "cont", scope: "Exported" }],
						}),
				},
			);

			assert.deepEqual(result.updated, ["element_decls", "full_element_cache"]);
			assert.deepEqual(result.stale, ["text_code"]);
			assert.deepEqual(result.elements, [
				{
					component: "A/Provider",
					name: "K",
					kind: "parameter",
					type: "cont",
					scope: "Exported",
					path: "A/Provider/K",
				},
			]);
			assert.equal(getAscetFullElement({ componentPath: "A/Provider", name: "K", scope: "Exported" })?.type, "cont");
			assert.equal(
				queryAscetSearchIndex({ query: "K", componentPath: "A/Provider", match: "exact" }, { cwd: fixture.cwd })
					?.ok,
				true,
			);
		} finally {
			fixture.cleanup();
		}
	});

	test("filters by names and scopes", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: [],
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
		});
		const fixture = createReadyEnv();
		try {
			const result = await refreshElementsFromLiveCatalog(
				{ componentPath: "A/Provider", names: ["K"], scopes: ["Exported"], reason: "test" },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) =>
						makeExecution(request, {
							elements: [
								{ name: "K", kind: "parameter", modelType: "cont", scope: "Local" },
								{ name: "K", kind: "parameter", modelType: "cont", scope: "Exported" },
								{ name: "Other", kind: "parameter", modelType: "cont", scope: "Exported" },
							],
						}),
				},
			);

			assert.equal(result.elements.length, 1);
			assert.equal(result.elements[0]?.scope, "Exported");
		} finally {
			fixture.cleanup();
		}
	});

	test("follows referenced component catalogs when direct catalog is only a wrapper", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: [],
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
		});
		const fixture = createReadyEnv();
		try {
			const calls: string[][] = [];
			const result = await refreshElementsFromLiveCatalog(
				{
					componentPath: "A/Wrapper",
					names: ["K"],
					scopes: ["Exported"],
					followReferences: true,
					reason: "test",
				},
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
							elements: [{ name: "K", kind: "parameter", modelType: "cont", scope: "exported" }],
						});
					},
				},
			);

			assert.deepEqual(
				calls.map((args) => args[2]),
				["A\\Wrapper", "A\\Child"],
			);
			assert.deepEqual(result.updated, ["element_decls", "full_element_cache"]);
			assert.equal(result.elements[0]?.component, "A/Child");
			assert.equal(getAscetFullElement({ componentPath: "A/Child", name: "K", scope: "exported" })?.type, "cont");
		} finally {
			fixture.cleanup();
		}
	});

	test("returns indexReadbackFailed without throwing on catalog failure", async () => {
		const fixture = createReadyEnv();
		try {
			const result = await refreshElementsFromLiveCatalog(
				{ componentPath: "A/Provider", names: ["K"], reason: "test", stale: ["element_decls", "text_code"] },
				{
					cwd: fixture.cwd,
					env: fixture.env,
					executeCli: async (request) => makeExecution(request, null, 1),
				},
			);

			assert.deepEqual(result.updated, []);
			assert.deepEqual(result.stale, ["element_decls", "text_code"]);
			assert.equal(result.issues?.[0]?.code, "indexReadbackFailed");
		} finally {
			fixture.cleanup();
		}
	});
});

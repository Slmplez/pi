import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import type { AscetCliJsonResult } from "./cli.ts";
import { buildAscetGetArgs, formatAscetGetResult, runAscetGet } from "./get.ts";
import { AscetObservationStore } from "./observation-store.ts";

function successfulResult(items: unknown[]): AscetCliJsonResult {
	return {
		ok: true,
		data: {
			ok: true,
			result: {
				items,
				coverage: { status: "complete_for_scope" },
				truncated: false,
				source: "live",
			},
		},
		request: { cwd: process.cwd(), cliPath: "AscetBridge.exe", args: [], timeoutMs: 1 },
		stdout: "",
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

test("buildAscetGetArgs maps every action to one get operation", () => {
	const cases = [
		["tree", { action: "tree", target: { targetPathPrefix: "PlatformLibrary\\Package" } }],
		["elements", { action: "elements", target: { path: "DEMO\\Component" } }],
		["formulas", { action: "formulas", target: { path: "DEMO\\Project" } }],
		["component_refs", { action: "component_refs", target: { oid: "component-oid" } }],
		["bde_edges", { action: "bde_edges", target: { path: "DEMO\\Bde" }, diagramName: "Main" }],
		[
			"import_binding",
			{
				action: "import_binding",
				target: { path: "DEMO\\Consumer" },
				elementName: "P_Request",
				provider: { oid: "provider-oid" },
			},
		],
		["dbitem_refs", { action: "dbitem_refs", target: { path: "DEMO\\Item" } }],
	] as const;

	for (const [action, params] of cases) {
		const args = buildAscetGetArgs(params);
		assert.equal(args[0], "exec");
		assert.equal(args[1], `get_${action}`);
		assert.equal(args[2], "--request-json");
		assert.equal(args.at(-1), "--json");
		assert.equal(args[3].includes("maxItems"), false);
	}
});

test("buildAscetGetArgs forwards component reference name and scope filters", () => {
	const args = buildAscetGetArgs({
		action: "component_refs",
		target: { path: "DEMO\\Project" },
		filters: { name: "CM_SCM", scope: ["exported"] },
	});
	const payload = JSON.parse(args[3] ?? "{}") as { name?: string; scopes?: string[] };
	assert.equal(payload.name, "CM_SCM");
	assert.deepEqual(payload.scopes, ["exported"]);
});

test("formats complete formula data inline without index output", () => {
	const output = JSON.parse(
		formatAscetGetResult(
			{ action: "formulas", target: { path: "DEMO\\Project" }, delivery: "inline" },
			successfulResult([
				{
					path: "DEMO\\Project::Formula",
					ownerProjectOid: "project-oid",
					name: "Formula",
					type: "cont",
					unit: "V",
					comment: "formula",
					contents: "A + B",
					parameters: [{ name: "A" }],
				},
			]),
		),
	) as { delivery: string; items: Array<{ contents?: string; parameters?: unknown[] }> };
	assert.equal(output.delivery, "inline");
	assert.equal(output.items[0]?.contents, "A + B");
	assert.deepEqual(output.items[0]?.parameters, [{ name: "A" }]);
	assert.equal(JSON.stringify(output).includes("index"), false);
});

test("preserves componentOid rather than mislabeling it as an Element OID", () => {
	const output = JSON.parse(
		formatAscetGetResult(
			{ action: "elements", target: { path: "DEMO\\Component" }, delivery: "inline" },
			successfulResult([{ path: "DEMO\\Component::P", componentOid: "component-oid", scope: "local" }]),
		),
	) as { items: Array<{ componentOid?: string; oid?: string }> };
	assert.equal(output.items[0]?.componentOid, "component-oid");
	assert.equal(output.items[0]?.oid, undefined);
});

test("stores large observations as NDJSON metadata", () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-test-"));
	const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
	const previousThreshold = process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
	process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = root;
	process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = "1";
	try {
		const output = JSON.parse(
			formatAscetGetResult(
				{ action: "elements", target: { path: "DEMO\\Component" } },
				successfulResult([{ path: "DEMO\\Component::P", componentOid: "component-oid", scope: "local" }]),
			),
		) as { delivery: string; observation?: { format?: string; dataPath?: string; metaPath?: string } };
		assert.equal(output.delivery, "stored");
		assert.equal(output.observation?.format, "ndjson");
		assert.equal(typeof output.observation?.dataPath, "string");
		assert.equal(typeof output.observation?.metaPath, "string");
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		if (previousThreshold === undefined) delete process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
		else process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = previousThreshold;
		rmSync(root, { recursive: true, force: true });
	}
});

test("builds local Enumeration and Module catalogs without invoking ASCET CLI", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-catalog-test-"));
	const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
	process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = root;
	try {
		new AscetObservationStore({ root, thresholdBytes: 1 }).create({
			domain: "tree",
			resultId: "obs-tree-local-catalog",
			target: {},
			items: [
				{ path: "DB\\Module", oid: "module-1", kind: "module" },
				{ path: "DB\\Mode", oid: "enum-1", kind: "enumeration" },
			],
			coverage: { status: "complete_for_scope" },
			truncated: false,
			delivery: "stored",
		});
		let cliCalls = 0;
		const result = await runAscetGet(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-local-catalog",
				include: ["module", "enumeration"],
				delivery: "stored",
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					cliCalls++;
					return { exitCode: 1, stdout: "", stderr: "unexpected", timedOut: false, request };
				},
			},
		);
		assert.equal(result.ok, true);
		assert.equal(cliCalls, 0);
		const output = JSON.parse(
			formatAscetGetResult(
				{
					action: "database_catalog",
					sourceTreeResultId: "obs-tree-local-catalog",
					include: ["module", "enumeration"],
				},
				result,
			),
		) as { delivery: string; catalog: { artifacts: { modules: { itemCount: number } } } };
		assert.equal(output.delivery, "stored");
		assert.equal(output.catalog.artifacts.modules.itemCount, 1);
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		rmSync(root, { recursive: true, force: true });
	}
});

test("sends one stdin request for a live Message catalog scan", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-catalog-test-"));
	const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
	process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = root;
	try {
		new AscetObservationStore({ root, thresholdBytes: 1 }).create({
			domain: "tree",
			resultId: "obs-tree-live-catalog",
			target: {},
			items: [
				{ path: "DB\\Project", oid: "project-1", kind: "project" },
				{ path: "DB\\Module", oid: "module-1", kind: "module" },
			],
			coverage: { status: "complete_for_scope" },
			truncated: false,
			delivery: "stored",
		});
		let cliCalls = 0;
		const result = await runAscetGet(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-live-catalog",
				include: ["message"],
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					cliCalls++;
					assert.deepEqual(request.args, ["exec", "get_database_catalog", "--request-stdin", "--json"]);
					const payload = JSON.parse(request.stdin ?? "") as {
						scanMessages: boolean;
						modules: Array<{ oid: string }>;
					};
					assert.equal(payload.scanMessages, true);
					assert.deepEqual(
						payload.modules.map(({ oid }) => oid),
						["module-1"],
					);
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								messages: [],
								moduleMessageEdges: [],
								coverage: { status: "complete_for_scope" },
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		assert.equal(result.ok, true);
		assert.equal(cliCalls, 1);
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		rmSync(root, { recursive: true, force: true });
	}
});

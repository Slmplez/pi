import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliJsonResult } from "./cli.ts";
import {
	ascetGetParameters,
	buildAscetGetArgs,
	formatAscetGetResult,
	getAscetDatabaseIdentity,
	runAscetGet,
} from "./get.ts";
import { AscetObservationStore } from "./observation-store.ts";

const completeDatabaseCollectors = {
	projects: { completed: true },
	folders: { completed: true },
	components: { completed: true },
	enumerations: { completed: true },
};

function databaseIdentity(name = "DB", path = "C:/Repo/DB") {
	const identity = getAscetDatabaseIdentity({ database: { name, path } });
	assert.ok(identity);
	return identity;
}

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
		["database_identity", { action: "database_identity" }],
		["tree", { action: "tree", target: { targetPathPrefix: "PlatformLibrary\\Package" } }],
		["tree", { action: "tree", scope: "database", delivery: "stored" }],
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
			sourceIdentity: { database: databaseIdentity() },
			items: [
				{ path: "DB\\Module", oid: "module-1", kind: "module" },
				{ path: "DB\\Mode", oid: "enum-1", kind: "enumeration" },
			],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
				truncated: false,
				collectors: completeDatabaseCollectors,
			},
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
			sourceIdentity: { database: databaseIdentity() },
			items: [
				{ path: "DB\\Project", oid: "project-1", kind: "project" },
				{ path: "DB\\Module", oid: "module-1", kind: "module" },
			],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:DB",
				completeness: "complete",
				truncated: false,
				collectors: completeDatabaseCollectors,
			},
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
					if (cliCalls === 1) {
						assert.deepEqual(request.args, ["exec", "get_database_identity", "--request-json", "{}", "--json"]);
						return {
							exitCode: 0,
							stdout: JSON.stringify({ ok: true, result: { database: { name: "DB", path: "C:/Repo/DB" } } }),
							stderr: "",
							timedOut: false,
							request,
						};
					}
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
								database: { name: "DB", path: "C:/Repo/DB" },
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
		assert.equal(cliCalls, 2);
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		rmSync(root, { recursive: true, force: true });
	}
});

test("rejects a live Database Catalog scan before scanning when database identity differs", async () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-catalog-identity-test-"));
	const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
	process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = root;
	try {
		const sourceDatabaseIdentity = getAscetDatabaseIdentity({
			database: { name: "Expected", path: "C:/Repo/Expected" },
		});
		assert.ok(sourceDatabaseIdentity);
		new AscetObservationStore({ root, thresholdBytes: 1 }).create({
			domain: "tree",
			resultId: "obs-tree-live-catalog-identity-mismatch",
			target: {},
			sourceIdentity: { database: sourceDatabaseIdentity },
			items: [
				{ path: "Expected\\Project", oid: "project-1", kind: "project" },
				{ path: "Expected\\Module", oid: "module-1", kind: "module" },
			],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:Expected",
				completeness: "complete",
				truncated: false,
				collectors: completeDatabaseCollectors,
			},
			truncated: false,
			delivery: "stored",
		});
		let cliCalls = 0;
		const result = await runAscetGet(
			{
				action: "database_catalog",
				sourceTreeResultId: "obs-tree-live-catalog-identity-mismatch",
				include: ["message"],
			},
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					cliCalls++;
					assert.deepEqual(request.args, ["exec", "get_database_identity", "--request-json", "{}", "--json"]);
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: { database: { name: "Other", path: "C:/Repo/Other" } },
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);
		assert.equal(result.ok, false);
		assert.equal(result.error?.code, "database_identity_mismatch");
		assert.equal(cliCalls, 1);
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		rmSync(root, { recursive: true, force: true });
	}
});

test("database tree scope emits an explicit unbounded identity request", () => {
	const args = buildAscetGetArgs({ action: "tree", scope: "database", delivery: "stored" });
	assert.equal(args[0], "exec");
	assert.equal(args[1], "get_tree");
	const payload = JSON.parse(args[3] ?? "{}") as Record<string, unknown>;
	assert.deepEqual(payload, { scope: "database" });
});

test("database tree scope requires stored delivery and rejects bounded fields", () => {
	assert.equal(Value.Check(ascetGetParameters, { action: "tree", scope: "database", delivery: "stored" }), true);
	assert.equal(Value.Check(ascetGetParameters, { action: "tree", scope: "database" }), false);
	assert.equal(Value.Check(ascetGetParameters, { action: "tree", scope: "database", delivery: "auto" }), false);
	assert.equal(
		Value.Check(ascetGetParameters, {
			action: "tree",
			scope: "database",
			delivery: "stored",
			target: { path: "DEMO" },
		}),
		false,
	);
});

test("stores backend database identity in observation metadata", () => {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-database-identity-"));
	const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
	process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = root;
	try {
		const result = successfulResult([{ path: "DEMO", oid: "project-1", kind: "project" }]);
		result.data = {
			ok: true,
			result: {
				items: [{ path: "DEMO", oid: "project-1", kind: "project" }],
				coverage: {
					status: "complete_for_scope",
					scopeKind: "database",
					scopeId: "database:C:/Repo/DB",
					completeness: "complete",
				},
				truncated: false,
				source: "live",
				database: { name: "DB", path: "C:\\Repo\\DB" },
			},
		};
		const output = JSON.parse(
			formatAscetGetResult({ action: "tree", scope: "database", delivery: "stored" }, result),
		) as { observation: { resultId: string }; sourceIdentity?: { database?: { fingerprint?: string } } };
		assert.equal(typeof output.sourceIdentity?.database?.fingerprint, "string");
		const metadata = new AscetObservationStore({ root }).readStoredMetadata(output.observation.resultId).metadata;
		assert.deepEqual(metadata.sourceIdentity?.database?.name, "DB");
		assert.deepEqual(metadata.sourceIdentity?.database?.path, "C:\\Repo\\DB");
		assert.equal(metadata.sourceIdentity?.database?.fingerprint, output.sourceIdentity?.database?.fingerprint);
	} finally {
		if (previousRoot === undefined) delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		else process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
		rmSync(root, { recursive: true, force: true });
	}
});

test("database identity action is strict, lightweight, and returns a stable fingerprint", () => {
	assert.equal(Value.Check(ascetGetParameters, { action: "database_identity" }), true);
	assert.equal(Value.Check(ascetGetParameters, { action: "database_identity", delivery: "inline" }), false);
	assert.deepEqual(buildAscetGetArgs({ action: "database_identity" }), [
		"exec",
		"get_database_identity",
		"--request-json",
		"{}",
		"--json",
	]);

	const result = successfulResult([]);
	result.data = {
		ok: true,
		result: {
			items: [],
			coverage: {
				status: "complete_for_scope",
				scopeKind: "database",
				scopeId: "database:C:/Repo/DB",
				completeness: "complete",
				truncated: false,
			},
			truncated: false,
			source: "live",
			database: { name: "DB", path: "C:\\Repo\\DB\\" },
		},
	};
	const output = JSON.parse(formatAscetGetResult({ action: "database_identity" }, result)) as {
		databaseIdentity: { name?: string; path: string; status: string; issues: string[]; fingerprint: string };
	};
	assert.equal(output.databaseIdentity.name, "DB");
	assert.equal(output.databaseIdentity.path, "C:\\Repo\\DB");
	assert.equal(output.databaseIdentity.status, "consistent");
	assert.deepEqual(output.databaseIdentity.issues, []);
	assert.equal(output.databaseIdentity.fingerprint.length, 64);
	assert.deepEqual(getAscetDatabaseIdentity({ database: { name: "DB", path: "c:/repo/db" } }), {
		name: "DB",
		path: "c:\\repo\\db",
		status: "consistent",
		issues: [],
		fingerprint: output.databaseIdentity.fingerprint,
	});
});

test("database identity detects an absolute name outside the reported path", () => {
	const identity = getAscetDatabaseIdentity({
		database: {
			name: "C:\\Repo\\PackageA\\ASW\\Db\\AscetDb_1",
			path: "C:\\Repo\\PackageB\\ASW\\Db\\",
		},
	});
	assert.equal(identity?.status, "inconsistent");
	assert.equal(identity?.path, "C:\\Repo\\PackageA\\ASW\\Db\\AscetDb_1");
	assert.equal(identity?.reportedPath, "C:\\Repo\\PackageB\\ASW\\Db");
	assert.deepEqual(identity?.issues, ["database_name_path_mismatch"]);
});

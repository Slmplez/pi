import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { type AscetCliJsonResult, formatAscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import {
	getAscetSearchIndexPartitionState,
	queryAscetSearchIndex,
	queryAscetTextCodeIndex,
	resetAscetSearchIndexForTest,
} from "./search-index.ts";

function makeResult(data: unknown): AscetCliJsonResult {
	return {
		ok: true,
		data,
		request: {
			cwd: process.cwd(),
			cliPath: "AscetCli.exe",
			args: ["exec", "read_block_diagram", "DEMO\\Controller", "Main", "--json"],
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function createReadyEnv(): { cwd: string; env: Record<string, string | undefined>; cleanup: () => void } {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-cli-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetCli.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_CLI_PATH: join(root, "AscetCli.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
			PI_ASCET_OPERATION_HEALTH_PATH: join(root, "operation-health.json"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

describe("formatAscetCliJsonResult", () => {
	test("keeps small success output as agent-friendly JSON", () => {
		const result = makeResult({
			ok: true,
			result: {
				summary: "Small summary.",
				counts: { elements: 1 },
				componentPath: "DEMO\\Controller",
				matches: [
					{
						elementName: "limit",
						displayType: "cont",
						displayScope: "exported",
						componentPath: "DEMO\\Controller",
						displayName: "limit",
					},
				],
			},
			error: null,
			meta: { mode: "exec", operation: "read_block_diagram" },
		});

		assert.equal(
			formatAscetCliJsonResult("read_block_diagram", result),
			JSON.stringify(
				{
					summary: "Small summary.",
					counts: { elements: 1 },
					component: "DEMO/Controller",
					items: [
						{
							name: "limit",
							type: "cont",
							scope: "exported",
							component: "DEMO/Controller",
						},
					],
				},
				null,
				2,
			),
		);
	});

	test("formats failures as structured error JSON", () => {
		const result: AscetCliJsonResult = {
			ok: false,
			data: null,
			request: {
				cwd: process.cwd(),
				cliPath: "AscetCli.exe",
				args: ["exec", "read_block_diagram", "DEMO\\Controller", "Main", "--json"],
			},
			stdout: "",
			stderr: "Exception[0]: ToolAPI runtime failed",
			exitCode: 1,
			timedOut: false,
			error: {
				code: "ascet_cli_failed",
				message: "ToolAPI runtime failed",
			},
		};

		assert.equal(
			formatAscetCliJsonResult("read_block_diagram", result),
			JSON.stringify(
				{
					error: {
						code: "ascet_cli_failed",
						message: "ToolAPI runtime failed",
						details: {
							hint: "hint: ASCET runtime (ToolAPI) is not connected. Start ASCET GUI with ToolAPI enabled, then rerun ascet_status or the ASCET command.",
							stderr: "ToolAPI runtime failed",
							exitCode: 1,
						},
					},
				},
				null,
				2,
			),
		);
	});

	test("stores large success output and returns grep-friendly artifact guidance", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		try {
			const result = makeResult({
				summary: "Full graph for Main contains 120 elements.",
				counts: {
					elements: 120,
					pins: 320,
					connections: 180,
				},
				detail: {
					graph: {
						nodes: Array.from({ length: 120 }, (_, index) => ({
							id: `N${index}`,
							pins: Array.from({ length: 8 }, (_, pinIndex) => `p${pinIndex}`),
						})),
					},
				},
			});

			const text = formatAscetCliJsonResult("read_block_diagram", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.match(text, /Full graph for Main contains 120 elements\./);
			assert.match(text, /Stored full ASCET output for read_block_diagram at /);
			assert.match(text, /rg -n '<pattern>'/);
			assert.match(text, /Get-Content -Path /);
			assert.doesNotMatch(text, /"nodes"/);
			assert.doesNotMatch(text, /N119/);

			const artifactText = readFileSync(join(artifactRoot, files[0] ?? ""), "utf8");
			assert.match(artifactText, /"nodes"/);
			assert.match(artifactText, /N119/);
			assert.equal(result.formattedOutputArtifact?.operation, "read_block_diagram");
			assert.ok(result.formattedOutputArtifact?.path);
			assert.ok(existsSync(result.formattedOutputArtifact.path));
			assert.equal(result.formattedOutputArtifact.thresholdBytes, 4096);
			assert.equal(result.formattedOutputArtifact.summary, "Full graph for Main contains 120 elements.");
			assert.deepEqual(result.formattedOutputArtifact.counts, {
				elements: 120,
				pins: 320,
				connections: 180,
			});
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});

	test("uses PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES to decide when to persist output", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-threshold-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		const previousThreshold = process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = "64";
		try {
			const result = makeResult({
				summary: "Threshold-controlled output.",
				values: Array.from({ length: 12 }, (_, index) => `value-${index}`),
			});

			const text = formatAscetCliJsonResult("list_components", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.match(text, /Threshold-controlled output\./);
			assert.equal(result.formattedOutputArtifact?.thresholdBytes, 64);
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			if (previousThreshold === undefined) {
				delete process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
			} else {
				process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = previousThreshold;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});

	test("does not create a second artifact when formatting the same large result twice", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-idempotent-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		try {
			const result = makeResult({
				summary: "Large result to format twice.",
				detail: Array.from({ length: 200 }, (_, index) => ({ id: index, name: `Element ${index}` })),
			});

			const first = formatAscetCliJsonResult("read_state_machine_flow", result);
			const firstArtifactPath = result.formattedOutputArtifact?.path;
			const second = formatAscetCliJsonResult("read_state_machine_flow", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.equal(result.formattedOutputArtifact?.path, firstArtifactPath);
			assert.equal(second, first);
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});
});

describe("runAscetCliJson write semantics", () => {
	test("does not mutate search-index partitions; ascet_write owns WriteImpact invalidation", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			generatedAtMs: Date.now(),
			elapsedMs: 5,
			scanComplete: true,
			entries: [
				{
					group: "primitive",
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					elementName: "P_AEB_IB_MaxVelocityDrop_Curve",
					elementKind: "cont",
					displayType: "cont",
					displayScope: "exported",
					referencedComponentPath: "",
					path: "AEB\\Controller::P_AEB_IB_MaxVelocityDrop_Curve",
				},
			],
			textCodeEntries: [
				{
					componentPath: "AEB\\Controller",
					componentKind: "module",
					componentLanguageKind: "ESDL",
					section: "body",
					methodName: "calc",
					methodKind: "Process",
					text: "P_AEB_IB_MaxVelocityDrop_Curve = speed - drop;",
					path: "AEB\\Controller::calc#body",
				},
			],
			textCodeIncluded: true,
			textCodeScanComplete: true,
		});
		const fixture = createReadyEnv();
		try {
			const result = await runAscetCliJson(["exec", "set_method_code", "AEB\\Controller", "calc", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 1000,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: { writeSucceeded: true },
						error: null,
						meta: { mode: "exec", operation: "set_method_code" },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			});

			assert.equal(result.ok, true);
			const textCodePartition = getAscetSearchIndexPartitionState("text_code");
			const declarationPartition = getAscetSearchIndexPartitionState("element_decls");
			assert.equal(textCodePartition?.status, "ready");
			assert.equal(declarationPartition?.status, "ready");
			assert.equal(
				queryAscetSearchIndex(
					{ query: "P_AEB_IB_MaxVelocityDrop_Curve", componentPath: "AEB\\Controller", match: "exact", limit: 20 },
					{ cwd: fixture.cwd },
				)?.ok,
				true,
			);
			assert.equal(
				queryAscetTextCodeIndex({ query: "speed - drop", match: "contains", limit: 20 }, { cwd: fixture.cwd })?.ok,
				true,
			);
		} finally {
			resetAscetSearchIndexForTest();
			fixture.cleanup();
		}
	});
});

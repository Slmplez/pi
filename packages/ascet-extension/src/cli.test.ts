import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { type AscetCliJsonResult, formatAscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { getAscetCliLockSnapshot } from "./scheduler/cli-lock.ts";
import { createAscetScheduler } from "./scheduler/scheduler.ts";

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

			const text = formatAscetCliJsonResult("get_tree", result);
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

describe("runAscetCliJson scheduler failure semantics", () => {
	test("records a non-zero CLI exit as a failed scheduler job", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-cli-failure" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_failure", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: 1,
					stdout: "",
					stderr: "synthetic failure",
					timedOut: false,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_failed");
			assert.equal(result.operationId, "synthetic_failure");
			assert.equal(result.stage, "cli_process");
			assert.equal(result.diagnostics?.retryable, false);
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.errorCode, "ascet_cli_failed");
			assert.equal((await getAscetCliLockSnapshot({ env: fixture.env })).locked, false);
		} finally {
			fixture.cleanup();
		}
	});

	test("records invalid JSON as a failed scheduler job", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-invalid-json" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_invalid_json", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: "not-json",
					stderr: "",
					timedOut: false,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_invalid_json");
			assert.equal(result.stage, "json_parse");
			assert.equal(result.diagnostics?.operationId, "synthetic_invalid_json");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
		} finally {
			fixture.cleanup();
		}
	});

	test("records an ok=false JSON envelope as a failed scheduler job", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-json-failure" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_json_failure", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: false,
						result: null,
						error: { code: "component_not_found", message: "missing" },
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_failed");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.errorCode, "ascet_cli_failed");
			assert.equal((await getAscetCliLockSnapshot({ env: fixture.env })).locked, false);
		} finally {
			fixture.cleanup();
		}
	});

	test("records a child timeout as a failed scheduler job", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-child-timeout" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_timeout", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: null,
					stdout: "",
					stderr: "child timeout",
					timedOut: true,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_timeout");
			assert.equal(result.timedOut, true);
			assert.equal(result.diagnostics?.retryable, true);
			assert.equal(result.diagnostics?.timedOut, true);
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
			assert.equal((await getAscetCliLockSnapshot({ env: fixture.env })).locked, false);
		} finally {
			fixture.cleanup();
		}
	});

	test("records an aborted child as a failed scheduler job", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-child-aborted" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_aborted", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: null,
					stdout: "",
					stderr: "aborted",
					timedOut: false,
					aborted: true,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_aborted");
			assert.equal(result.diagnostics?.aborted, true);
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
			assert.equal((await getAscetCliLockSnapshot({ env: fixture.env })).locked, false);
		} finally {
			fixture.cleanup();
		}
	});
});

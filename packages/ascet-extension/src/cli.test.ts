import assert from "node:assert/strict";
import { existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { type AscetCliJsonResult, executeAscetCli, formatAscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { classifyAscetEditExecution } from "./edit/verification.ts";
import { getAscetCliLockSnapshot } from "./scheduler/cli-lock.ts";
import { createAscetScheduler } from "./scheduler/scheduler.ts";

function makeResult(data: unknown): AscetCliJsonResult {
	return {
		ok: true,
		data,
		request: {
			cwd: process.cwd(),
			cliPath: "AscetBridge.exe",
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
	writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
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

	test("includes backend error stage and details in formatted failures", () => {
		const result: AscetCliJsonResult = {
			ok: false,
			data: null,
			request: { cwd: process.cwd(), cliPath: "AscetBridge.exe", args: [] },
			stdout: "",
			stderr: "",
			exitCode: 1,
			timedOut: false,
			error: {
				code: "invalid_dependency_mapping",
				message: "Dependency mapping is invalid.",
				stage: "validate_mapping",
				details: { formal: "Gain" },
			},
		};

		assert.deepEqual(JSON.parse(formatAscetCliJsonResult("set_element_dependency", result)), {
			error: {
				code: "invalid_dependency_mapping",
				message: "Dependency mapping is invalid.",
				details: {
					exitCode: 1,
					backend: { stage: "validate_mapping", details: { formal: "Gain" } },
				},
			},
		});
	});

	test("formats failures as structured error JSON", () => {
		const result: AscetCliJsonResult = {
			ok: false,
			data: null,
			request: {
				cwd: process.cwd(),
				cliPath: "AscetBridge.exe",
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
	test("does not spawn a CLI process for a pre-aborted request", async () => {
		const controller = new AbortController();
		controller.abort(new Error("cancel before spawn"));
		const result = await executeAscetCli({
			cwd: process.cwd(),
			cliPath: "missing-ascet-cli.exe",
			args: [],
			signal: controller.signal,
		});

		assert.equal(result.exitCode, null);
		assert.equal(result.aborted, true);
		assert.equal(result.timedOut, false);
		assert.doesNotThrow(() => structuredClone(result));
		assert.equal("signal" in result.request, false);
	});

	test("keeps runtime callbacks out of public scheduler results", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-cloneable-result" });
		let spawnedPid: number | undefined;
		try {
			const result = await runAscetCliJson(["exec", "synthetic_success", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => {
					await request.onSpawn?.(4321);
					spawnedPid = 4321;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: { summary: "ok" } }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			});

			assert.equal(result.ok, true);
			assert.equal(spawnedPid, 4321);
			assert.doesNotThrow(() => structuredClone(result));
			assert.equal("onSpawn" in result.request, false);
			assert.equal("signal" in result.request, false);
		} finally {
			fixture.cleanup();
		}
	});
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
			assert.doesNotThrow(() => structuredClone(result));
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

	test("preserves a structured backend error from a non-zero CLI exit", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "scheduler-structured-exit" });
		try {
			const result = await runAscetCliJson(["exec", "synthetic_structured_failure", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				scheduler,
				executeCli: async (request) => ({
					exitCode: 1,
					stdout: JSON.stringify({
						ok: false,
						result: null,
						error: {
							code: "imported_parameter_not_found",
							message: "Imported parameter is missing.",
							stage: "validate_mapping",
							details: { formal: "P_Input", target: "P_Input" },
						},
					}),
					stderr: "backend failure",
					timedOut: false,
					request,
				}),
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "imported_parameter_not_found");
			assert.equal(result.error?.message, "Imported parameter is missing.");
			assert.equal(result.error?.stage, "validate_mapping");
			assert.deepEqual(result.error?.details, { formal: "P_Input", target: "P_Input" });
			assert.equal(result.stage, "cli_process");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.errorCode, "imported_parameter_not_found");
		} finally {
			fixture.cleanup();
		}
	});

	test("preserves a structured backend error from an ok=false envelope", async () => {
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
			assert.equal(result.error?.code, "component_not_found");
			assert.equal(result.error?.message, "missing");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.state, "failed");
			assert.equal(scheduler.getSnapshot().recentJobs.at(-1)?.errorCode, "component_not_found");
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

describe("ASCET Bridge Milestone A transport semantics", () => {
	test("waits for a timed-out Bridge process to close before resolving", async () => {
		const result = await executeAscetCli({
			cwd: process.cwd(),
			cliPath: process.execPath,
			args: ["-e", "setInterval(() => {}, 1000)"],
			timeoutMs: 75,
		});

		assert.equal(result.timedOut, true);
		assert.equal(result.aborted, false);
		assert.equal(result.spawnAttempted, true);
		assert.equal(result.spawnSucceeded, true);
		assert.equal(result.requestDispatched, true);
		assert.equal(result.processClosed, true);
	});

	test("terminates the full Bridge process tree on Windows", { skip: process.platform !== "win32" }, async () => {
		const childScript = [
			"const { spawn } = require('node:child_process');",
			"const child = spawn(process.execPath, ['-e', 'setInterval(() => {}, 1000)'], { stdio: 'ignore' });",
			"process.stdout.write(String(child.pid));",
			"setInterval(() => {}, 1000);",
		].join(" ");
		const result = await executeAscetCli({
			cwd: process.cwd(),
			cliPath: process.execPath,
			args: ["-e", childScript],
			timeoutMs: 250,
		});

		const childPid = Number.parseInt(result.stdout.trim(), 10);
		assert.equal(Number.isInteger(childPid) && childPid > 0, true);
		assert.throws(() => process.kill(childPid, 0));
		assert.equal(result.timedOut, true);
		assert.equal(result.processClosed, true);
	});
	test("waits for an aborted Bridge process to close before resolving", async () => {
		const controller = new AbortController();
		const abortTimer = setTimeout(() => controller.abort(new Error("synthetic abort")), 75);
		try {
			const result = await executeAscetCli({
				cwd: process.cwd(),
				cliPath: process.execPath,
				args: ["-e", "setInterval(() => {}, 1000)"],
				signal: controller.signal,
			});

			assert.equal(result.timedOut, false);
			assert.equal(result.aborted, true);
			assert.equal(result.spawnSucceeded, true);
			assert.equal(result.processClosed, true);
		} finally {
			clearTimeout(abortTimer);
		}
	});

	test("supports a bounded per-request stdout limit for large read payloads", async () => {
		const result = await executeAscetCli({
			cwd: process.cwd(),
			cliPath: process.execPath,
			args: ["-e", "process.stdout.write('x'.repeat(2048)); setInterval(() => {}, 1000)"],
			stdoutLimitBytes: 1024,
			timeoutMs: 10_000,
		});

		assert.equal(result.outputLimitExceeded, "stdout");
		assert.equal(result.processClosed, true);
		assert.equal(result.stdout.length <= 1024, true);
	});

	test("terminates a Bridge process whose stderr exceeds the transport limit", async () => {
		const result = await executeAscetCli({
			cwd: process.cwd(),
			cliPath: process.execPath,
			args: ["-e", "process.stderr.write('x'.repeat(2 * 1024 * 1024 + 1024)); setInterval(() => {}, 1000)"],
			timeoutMs: 10_000,
		});

		assert.equal(result.outputLimitExceeded, "stderr");
		assert.equal(result.processClosed, true);
		assert.equal(result.stderr.length <= 2 * 1024 * 1024, true);
	});

	test("rejects JSON that is not a Bridge response envelope from a real process", async () => {
		const fixture = createReadyEnv();
		try {
			const result = await runAscetCliJson(["-e", "process.stdout.write('{}')"], {
				cwd: fixture.cwd,
				env: fixture.env,
				cliPath: process.execPath,
				timeoutMs: 5_000,
			});

			assert.equal(result.ok, false);
			assert.equal(result.error?.code, "ascet_cli_invalid_json");
			assert.equal(result.stage, "json_parse");
			assert.match(result.error?.message ?? "", /protocolVersion=1 response envelope/);
		} finally {
			fixture.cleanup();
		}
	});
	test("bypasses the live scheduler and ToolAPI lock for control-plane requests", async () => {
		const fixture = createReadyEnv();
		const scheduler = createAscetScheduler({ generateJobId: () => "unexpected-control-plane-job" });
		try {
			for (const args of [
				["capabilities", "--json"],
				["selftest", "offline", "--json"],
			]) {
				const result = await runAscetCliJson(args, {
					cwd: fixture.cwd,
					env: fixture.env,
					scheduler,
					executeCli: async (request) => ({
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: {} }),
						stderr: "",
						timedOut: false,
						request,
					}),
				});
				assert.equal(result.ok, true);
			}
			assert.equal(scheduler.getSnapshot().recentJobs.length, 0);
			assert.equal((await getAscetCliLockSnapshot({ env: fixture.env })).locked, false);
		} finally {
			fixture.cleanup();
		}
	});

	test("rejects oversized write requests before Bridge spawn", async () => {
		const fixture = createReadyEnv();
		try {
			let executed = false;
			const result = await runAscetCliJson(["exec", "set_method_code", "x".repeat(16 * 1024 * 1024 + 1)], {
				cwd: fixture.cwd,
				env: fixture.env,
				jobKind: "write",
				executeCli: async (request) => {
					executed = true;
					return { exitCode: 0, stdout: "{}", stderr: "", timedOut: false, request };
				},
			});
			assert.equal(executed, false);
			assert.equal(result.error?.code, "write_not_started");
			assert.deepEqual(result.error?.details, {
				originalCode: "ascet_bridge_request_too_large",
				retryable: true,
				requiresReadback: false,
			});
		} finally {
			fixture.cleanup();
		}
	});
	test("records the spawned Bridge PID in the held ToolAPI lock", async () => {
		const fixture = createReadyEnv();
		try {
			let observedBridgePid: number | null = null;
			const result = await runAscetCliJson(["exec", "synthetic_read", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				executeCli: async (request) => {
					await request.onSpawn?.(4321);
					const snapshot = await getAscetCliLockSnapshot({ env: fixture.env });
					if (snapshot.locked && !("corrupt" in snapshot)) observedBridgePid = snapshot.owner.bridgePid;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: {} }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			});
			assert.equal(result.ok, true);
			assert.equal(observedBridgePid, 4321);
		} finally {
			fixture.cleanup();
		}
	});
	test("distinguishes writes that never spawned from writes dispatched to Bridge", async () => {
		const fixture = createReadyEnv();
		try {
			const notStarted = await runAscetCliJson(["exec", "create_folder", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				cliPath: join(fixture.cwd, "missing-bridge.exe"),
				jobKind: "write",
			});
			assert.equal(notStarted.error?.code, "write_not_started");
			assert.deepEqual(notStarted.error?.details, {
				originalCode: "ascet_bridge_missing",
				retryable: true,
				requiresReadback: false,
			});
			const outcomeUnknown = await runAscetCliJson(["exec", "create_folder", "\\Safe", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				jobKind: "write",
				executeCli: async (request) => ({
					exitCode: null,
					stdout: "",
					stderr: "Bridge timed out",
					timedOut: true,
					spawnAttempted: true,
					spawnSucceeded: true,
					requestDispatched: true,
					processClosed: true,
					request,
				}),
			});
			assert.equal(outcomeUnknown.error?.code, "write_outcome_unknown");
			assert.deepEqual(outcomeUnknown.error?.details, {
				originalCode: "ascet_cli_timeout",
				retryable: false,
				requiresReadback: true,
			});
			assert.equal(outcomeUnknown.diagnostics?.retryable, false);

			const structuredUnknown = await runAscetCliJson(["exec", "create_folder", "\\Safe", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				jobKind: "write",
				executeCli: async (request) => ({
					exitCode: 2,
					stdout: JSON.stringify({
						type: "response",
						protocolVersion: 1,
						ok: false,
						result: null,
						error: { code: "write_failed", message: "write may have started" },
						meta: {
							bridgePid: 4321,
							bridgeGeneration: "test-generation",
							durationMs: 1,
							sessionPolicy: "fresh_session",
							mutationStarted: null,
						},
					}),
					stderr: "",
					timedOut: false,
					spawnAttempted: true,
					spawnSucceeded: true,
					requestDispatched: true,
					processClosed: true,
					request,
				}),
			});
			assert.equal(structuredUnknown.error?.code, "write_outcome_unknown");
			assert.deepEqual(structuredUnknown.error?.details, {
				originalCode: "write_failed",
				retryable: false,
				requiresReadback: true,
				backend: { code: "write_failed", stage: undefined, details: undefined, operation: undefined },
			});
			assert.equal(classifyAscetEditExecution(structuredUnknown).mutationStatus, "unknown");

			const structuredUndefined = await runAscetCliJson(["exec", "create_folder", "\\\\Safe", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				jobKind: "write",
				executeCli: async (request) => ({
					exitCode: 2,
					stdout: JSON.stringify({
						ok: false,
						error: { code: "target_not_found", message: "target missing" },
					}),
					stderr: "",
					timedOut: false,
					spawnAttempted: true,
					spawnSucceeded: true,
					requestDispatched: true,
					processClosed: true,
					request,
				}),
			});
			assert.equal(structuredUndefined.error?.code, "write_outcome_unknown");
			assert.equal(classifyAscetEditExecution(structuredUndefined).mutationStatus, "unknown");

			const editableGateBlocked = await runAscetCliJson(
				["exec", "set_method_code", "Demo\\ReadOnly", "Main", "return;", "--json"],
				{
					cwd: fixture.cwd,
					env: fixture.env,
					jobKind: "write",
					executeCli: async (request) => ({
						exitCode: 2,
						stdout: JSON.stringify({
							type: "response",
							protocolVersion: 1,
							ok: false,
							result: null,
							error: { code: "editable_write_gate_blocked", message: "not editable" },
							meta: {
								bridgePid: 4321,
								bridgeGeneration: "test-generation",
								durationMs: 1,
								sessionPolicy: "fresh_session",
								mutationStarted: false,
							},
						}),
						stderr: "",
						timedOut: false,
						spawnAttempted: true,
						spawnSucceeded: true,
						requestDispatched: true,
						processClosed: true,
						request,
					}),
				},
			);
			assert.equal(editableGateBlocked.error?.code, "editable_write_gate_blocked");
			assert.equal(editableGateBlocked.error?.message, "not editable");
			assert.deepEqual(editableGateBlocked.error?.details, {
				retryable: true,
				requiresReadback: false,
			});
			assert.equal(classifyAscetEditExecution(editableGateBlocked).mutationStatus, "not_started");
			assert.equal(classifyAscetEditExecution(editableGateBlocked).shouldInvalidateObservations, false);

			const structuredNotStarted = await runAscetCliJson(["exec", "create_folder", "\\Safe", "--json"], {
				cwd: fixture.cwd,
				env: fixture.env,
				jobKind: "write",
				executeCli: async (request) => ({
					exitCode: 2,
					stdout: JSON.stringify({
						type: "response",
						protocolVersion: 1,
						ok: false,
						result: null,
						error: { code: "target_not_found", message: "target missing" },
						meta: {
							bridgePid: 4321,
							bridgeGeneration: "test-generation",
							durationMs: 1,
							sessionPolicy: "fresh_session",
							mutationStarted: false,
						},
					}),
					stderr: "",
					timedOut: false,
					spawnAttempted: true,
					spawnSucceeded: true,
					requestDispatched: true,
					processClosed: true,
					request,
				}),
			});
			assert.equal(structuredNotStarted.error?.code, "target_not_found");
			assert.equal(structuredNotStarted.error?.message, "target missing");
			assert.deepEqual(structuredNotStarted.error?.details, {
				retryable: true,
				requiresReadback: false,
			});
			const notStartedClassification = classifyAscetEditExecution(structuredNotStarted);
			assert.equal(notStartedClassification.mutationStatus, "not_started");
			assert.equal(notStartedClassification.shouldInvalidateObservations, false);

			const invalidEnvelope = await runAscetCliJson(["-e", "process.stdout.write('{}')"], {
				cwd: fixture.cwd,
				env: fixture.env,
				cliPath: process.execPath,
				jobKind: "write",
				timeoutMs: 5_000,
			});
			assert.equal(invalidEnvelope.error?.code, "write_outcome_unknown");
			assert.deepEqual(invalidEnvelope.error?.details, {
				originalCode: "ascet_cli_invalid_json",
				retryable: false,
				requiresReadback: true,
			});
		} finally {
			fixture.cleanup();
		}
	});
});

describe("runAscetCliJson raw JSON protocol", () => {
	test("accepts a non-Bridge JSON payload for standalone ASCET executables", async () => {
		const fixture = createReadyEnv();
		try {
			const result = await runAscetCliJson(
				["-e", 'process.stdout.write(JSON.stringify({ok:true,count:1,items:["hit"]}))'],
				{
					cwd: fixture.cwd,
					env: fixture.env,
					cliPath: process.execPath,
					processName: "AscetSearch.exe",
					responseProtocol: "raw-json",
					commandId: "native_search_element",
					jobKind: "read",
					timeoutMs: 5_000,
				},
			);
			assert.equal(result.ok, true);
			assert.deepEqual(result.data, { ok: true, count: 1, items: ["hit"] });
		} finally {
			fixture.cleanup();
		}
	});
});

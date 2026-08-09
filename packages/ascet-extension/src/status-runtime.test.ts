import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliJsonResult } from "./cli.ts";
import { createAscetRuntimeStatusReport } from "./status-runtime.ts";

function createReadyEnv(includeDll = true): {
	cwd: string;
	env: Record<string, string | undefined>;
	cleanup: () => void;
} {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-status-runtime-"));
	const contractsRoot = join(root, "contracts");
	mkdirSync(contractsRoot, { recursive: true });
	writeFileSync(join(root, "AscetBridge.exe"), "", "utf8");
	if (includeDll) {
		writeFileSync(join(root, "Etas.AscetNET.dll"), "", "utf8");
	}
	writeFileSync(join(contractsRoot, "cli-catalog.json"), "{}", "utf8");
	return {
		cwd: root,
		env: {
			ASCET_BRIDGE_PATH: join(root, "AscetBridge.exe"),
			ASCET_CONTRACTS_PATH: contractsRoot,
			PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
		},
		cleanup: () => rmSync(root, { recursive: true, force: true }),
	};
}

function liveProbeResult(cwd: string, ok: boolean): AscetCliJsonResult {
	return {
		ok,
		data: ok ? { profile: "quick" } : null,
		request: {
			cwd,
			cliPath: join(cwd, "AscetBridge.exe"),
			args: ["selftest", "quick", "--json"],
		},
		stdout: ok ? '{"ok":true}' : "",
		stderr: ok ? "" : "ToolAPI unavailable",
		exitCode: ok ? 0 : 1,
		timedOut: false,
		error: ok ? undefined : { code: "ascet_cli_failed", message: "ToolAPI unavailable" },
	};
}

describe("createAscetRuntimeStatusReport", () => {
	test("reports installation, DLL, live ToolAPI, and scheduler diagnostics", async () => {
		const fixture = createReadyEnv();
		let observedTimeout = 0;
		try {
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: fixture.env,
				timeoutMs: 12_000,
				liveToolApiProbe: async (options) => {
					observedTimeout = options.timeoutMs;
					return liveProbeResult(options.cwd, true);
				},
			});

			assert.equal(report.ok, true);
			assert.equal(report.installationOk, true);
			assert.equal(report.dllOk, true);
			assert.equal(report.runtimeOk, true);
			assert.equal(report.schedulerOk, true);
			assert.equal(report.runtime.commandId, "selftest");
			assert.match(report.runtime.description, /live ToolAPI/);
			assert.equal(observedTimeout, 12_000);
			assert.match(report.summary, /ASCET DLL: ready/);
			assert.match(report.summary, /ASCET ToolAPI: ready/);
			assert.match(report.summary, /ASCET scheduler: ready/);
			assert.doesNotMatch(report.summary, /quick-search|SQLite|P0|warm_search_index|ASCET Index/);
		} finally {
			fixture.cleanup();
		}
	});

	test("skips live ToolAPI probing when the ASCET DLL is missing", async () => {
		const fixture = createReadyEnv(false);
		let probeCalled = false;
		try {
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: fixture.env,
				liveToolApiProbe: async () => {
					probeCalled = true;
					return liveProbeResult(fixture.cwd, true);
				},
			});

			assert.equal(report.ok, false);
			assert.equal(report.installationOk, true);
			assert.equal(report.dllOk, false);
			assert.equal(report.runtimeOk, false);
			assert.equal(probeCalled, false);
			assert.equal(report.runtime.error?.code, "ascet_installation_not_ready");
			assert.match(report.summary, /Etas\.AscetNET\.dll is missing/);
		} finally {
			fixture.cleanup();
		}
	});

	test("reports live ToolAPI failure without index terminology", async () => {
		const fixture = createReadyEnv();
		try {
			const report = await createAscetRuntimeStatusReport({
				cwd: fixture.cwd,
				env: fixture.env,
				liveToolApiProbe: async (options) => liveProbeResult(options.cwd, false),
			});

			assert.equal(report.ok, false);
			assert.equal(report.installationOk, true);
			assert.equal(report.dllOk, true);
			assert.equal(report.runtimeOk, false);
			assert.equal(report.runtime.error?.code, "ascet_cli_failed");
			assert.match(report.summary, /ASCET ToolAPI: FAILED/);
			assert.match(report.summary, /ToolAPI unavailable/);
			assert.doesNotMatch(report.summary, /index|SQLite|P0|warm_search_index/i);
		} finally {
			fixture.cleanup();
		}
	});
});

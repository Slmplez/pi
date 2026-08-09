import { existsSync, mkdirSync, mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { runAscetContractCatalog } from "../../ascet-extension/src/contract-catalog.ts";
import { createAscetStatusReport, resolveAscetStatusPaths } from "../../ascet-extension/src/status.ts";
import { createAscetRuntimeStatusReport } from "../../ascet-extension/src/status-runtime.ts";
import { loadAscetExtension, repoRoot } from "./ascet-extension-test-helpers.ts";

interface StatusDetails {
	installationOk: boolean;
	runtimeOk: boolean;
	runtime: { commandId: string };
	paths: { mode: string; cliPath: string; catalogPath: string };
}

interface CapabilitiesDetails {
	ok: boolean;
	result: CapabilitiesPayload;
	data?: { result?: CapabilitiesPayload };
}

interface CapabilitiesPayload {
	total: number;
	items: Array<{ tool?: string; action?: string }>;
}

describe("ASCET extension status diagnostics", () => {
	it("resolves bundled ASCET CLI and contracts when package assets exist", () => {
		const paths = resolveAscetStatusPaths({ cwd: repoRoot, env: {} });

		expect(paths.mode).toBe("bundle");
		expect(paths.extensionRoot).toBe(resolve(repoRoot, "packages/ascet-extension"));
		expect(paths.contractsRoot).toBe(resolve(repoRoot, "packages/ascet-extension/ascet-cli/contracts"));
		expect(paths.cliPath).toBe(resolve(repoRoot, "packages/ascet-extension/ascet-cli/bin/AscetBridge.exe"));
		expect(paths.catalogPath).toBe(
			resolve(repoRoot, "packages/ascet-extension/ascet-cli/contracts/cli-catalog.json"),
		);
	});

	it("prefers explicit ASCET_BRIDGE_PATH and ASCET_CONTRACTS_PATH overrides", () => {
		const paths = resolveAscetStatusPaths({
			cwd: repoRoot,
			env: {
				ASCET_BRIDGE_PATH: "C:/custom/AscetBridge.exe",
				ASCET_CONTRACTS_PATH: "D:/contracts",
			},
		});

		expect(paths.mode).toBe("env");
		expect(paths.cliPath).toBe(resolve("C:/custom/AscetBridge.exe"));
		expect(paths.contractsRoot).toBe(resolve("D:/contracts"));
		expect(paths.catalogPath).toBe(resolve("D:/contracts/cli-catalog.json"));
	});

	it("does not fall back to source mode when package bundle assets are incomplete", () => {
		const tempExtensionRoot = resolve(tmpdir(), `ascet-extension-partial-${process.pid}-${Date.now()}`);
		const tempContractsRoot = resolve(tempExtensionRoot, "ascet-cli/contracts");
		mkdirSync(tempContractsRoot, { recursive: true });
		writeFileSync(resolve(tempContractsRoot, "cli-catalog.json"), "{}", "utf8");

		const report = createAscetStatusReport({ cwd: repoRoot, env: {}, extensionRoot: tempExtensionRoot });

		expect(report.paths.mode).toBe("bundle");
		expect(report.paths.extensionRoot).toBe(tempExtensionRoot);
		expect(report.paths.cliPath).toBe(resolve(tempExtensionRoot, "ascet-cli/bin/AscetBridge.exe"));
		expect(report.checks.catalogExists).toBe(true);
		expect(report.checks.cliExists).toBe(false);
		expect(report.ok).toBe(false);
	});

	it("reports existence checks and a readable summary", () => {
		const report = createAscetStatusReport({ cwd: repoRoot, env: {} });

		expect(report.ok).toBe(existsSync(report.paths.cliPath) && existsSync(report.paths.catalogPath));
		expect(report.checks).toEqual({
			cliExists: existsSync(report.paths.cliPath),
			contractsRootExists: existsSync(report.paths.contractsRoot),
			catalogExists: existsSync(report.paths.catalogPath),
		});
		expect(report.summary).toContain("ASCET Bridge:");
		expect(report.summary).toContain("ASCET mode:");
		expect(report.summary).toContain("ASCET contracts:");
		expect(report.summary).toContain("cli-catalog.json:");
	});

	it("keeps installation status separate from live runtime status", async () => {
		const report = await createAscetRuntimeStatusReport({
			cwd: repoRoot,
			env: {},
			liveToolApiProbe: async () => ({
				ok: false,
				commandId: "selftest",
				databaseName: "",
				databasePath: "",
				entryCount: 0,
				elapsedMs: 0,
				scanComplete: false,
				fromCache: false,
				stdout: "",
				stderr: "ASCET ToolAPI unavailable",
				exitCode: 1,
				timedOut: false,
				error: {
					code: "ascet_cli_failed",
					message: "ASCET ToolAPI unavailable",
				},
			}),
		} as never);

		expect(report.installationOk).toBe(true);
		expect(report.runtimeOk).toBe(false);
		expect(report.ok).toBe(false);
		expect(report.summary).toContain("ASCET installation: ready");
		expect(report.summary).toContain("ASCET ToolAPI: FAILED (ascet_cli_failed)");
		expect(report.summary).toContain("ASCET ToolAPI: FAILED (ascet_cli_failed)");
		expect(report.summary).toContain("Next step: start ASCET GUI with ToolAPI enabled");
	});

	it("reports ready only when installation and live runtime probe both pass", async () => {
		const report = await createAscetRuntimeStatusReport({
			cwd: repoRoot,
			env: {},
			liveToolApiProbe: async () => ({
				ok: true,
				commandId: "selftest",
				databaseName: "DemoDb",
				databasePath: "C:\\ASCET\\DemoDb",
				entryCount: 2,
				elapsedMs: 7,
				scanComplete: true,
				fromCache: false,
				stdout: '{"entries":[]}',
				stderr: "",
				exitCode: 0,
				timedOut: false,
			}),
		} as never);

		expect(report.installationOk).toBe(true);
		expect(report.runtimeOk).toBe(true);
		expect(report.ok).toBe(true);
		expect(report.summary).toContain("ASCET ToolAPI: ready");
	});

	it("loads the project-local ASCET extension and registers the status command plus tool", async () => {
		const ascetExtension = await loadAscetExtension();

		expect(ascetExtension?.tools.has("ascet_status")).toBe(true);
		expect(ascetExtension?.tools.has("ascet_capabilities")).toBe(true);
		expect(ascetExtension?.tools.has("ascet_contract_catalog")).toBe(false);
		expect(ascetExtension?.commands.has("ascet-status")).toBe(true);
		expect(ascetExtension?.commands.has("ascet-scheduler-status")).toBe(true);
	});

	it("loads and summarizes the bundled ASCET contract catalog", () => {
		const result = runAscetContractCatalog({}, { cwd: repoRoot, env: {} });

		expect(result.ok).toBe(true);
		expect(result.data.mode).toBe("bundle");
		expect(result.data.counts.commands).toBeGreaterThan(40);
		expect(result.data.counts.families).toBeGreaterThanOrEqual(6);
		expect(result.data.families).not.toContain("ops");
		expect(result.data.counts.playbooks).toBeGreaterThanOrEqual(4);
		expect(result.data.families).toContain("read");
		expect(result.data.families).toContain("write");
	});

	it("reports missing contract catalog when an env override points at an empty contracts root", () => {
		const tempContractsRoot = mkdtempSync(join(tmpdir(), "ascet-missing-contracts-"));
		const result = runAscetContractCatalog(
			{},
			{
				cwd: repoRoot,
				env: {
					ASCET_CONTRACTS_PATH: tempContractsRoot,
				},
			},
		);

		expect(result.ok).toBe(false);
		expect(result.data.mode).toBe("env");
		expect(result.data.catalogPath).toBe(resolve(tempContractsRoot, "cli-catalog.json"));
		expect(result.error?.code).toBe("ascet_contract_catalog_missing");
	});

	it("reports malformed contract catalog JSON without collapsing it to a missing-file error", () => {
		const tempContractsRoot = mkdtempSync(join(tmpdir(), "ascet-invalid-contracts-"));
		writeFileSync(resolve(tempContractsRoot, "cli-catalog.json"), "{ invalid json", "utf8");

		const result = runAscetContractCatalog(
			{},
			{
				cwd: repoRoot,
				env: {
					ASCET_CONTRACTS_PATH: tempContractsRoot,
				},
			},
		);

		expect(result.ok).toBe(false);
		expect(result.data.mode).toBe("env");
		expect(result.error?.code).toBe("ascet_contract_catalog_invalid");
		expect(result.error?.message).not.toContain("not found");
	});

	it("executes the ascet_status tool with path diagnostics", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_status")?.definition;

		expect(tool).toBeDefined();
		const response = await tool?.execute("test-call", {}, new AbortController().signal, undefined, {
			cwd: repoRoot,
			ascetStatusLiveToolApiProbe: async () => ({
				ok: true,
				commandId: "selftest",
				databaseName: "DemoDb",
				databasePath: "C:\\ASCET\\DemoDb",
				entryCount: 2,
				elapsedMs: 7,
				scanComplete: true,
				fromCache: false,
				stdout: '{"entries":[]}',
				stderr: "",
				exitCode: 0,
				timedOut: false,
			}),
		} as never);

		expect(response?.content[0]).toMatchObject({
			type: "text",
			text: expect.stringContaining("ASCET status:"),
		});
		const details = response?.details as StatusDetails | undefined;
		expect(details?.installationOk).toBe(true);
		expect(details?.runtimeOk).toBe(true);
		expect(details?.runtime).toMatchObject({
			commandId: "selftest",
		});
		expect(details?.paths.mode).toBe("bundle");
		expect(details?.paths.cliPath).toBe(resolve(repoRoot, "packages/ascet-extension/ascet-cli/bin/AscetBridge.exe"));
		expect(details?.paths.catalogPath).toBe(
			resolve(repoRoot, "packages/ascet-extension/ascet-cli/contracts/cli-catalog.json"),
		);
	});

	it("executes the ascet_capabilities tool with parsed catalog matches", async () => {
		const ascetExtension = await loadAscetExtension();
		const tool = ascetExtension?.tools.get("ascet_capabilities")?.definition;

		expect(tool).toBeDefined();
		expect(tool?.executionMode).toBe("sequential");
		const response = await tool?.execute(
			"test-capabilities",
			{ action: "search_actions", query: "complete code", limit: 5 },
			new AbortController().signal,
			undefined,
			{ cwd: repoRoot } as never,
		);

		const content = response?.content[0];
		expect(content).toMatchObject({ type: "text" });
		if (content?.type !== "text") {
			throw new Error("Expected ASCET capabilities content to be text.");
		}
		const payload = JSON.parse(content.text) as CapabilitiesPayload;
		expect(payload.total).toBeGreaterThan(0);
		expect(payload.items.some((item) => item.tool === "ascet_read" && item.action === "read_code")).toBe(true);
		const details = response?.details as CapabilitiesDetails | undefined;
		expect(details?.ok).toBe(true);
		expect(details?.result.total).toBeGreaterThan(0);
		expect(details?.data?.result).toEqual(details?.result);
	});
});

import { existsSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export interface AscetStatusPathOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	extensionRoot?: string;
}

export interface AscetStatusPaths {
	mode: "env" | "bundle" | "source";
	ascetAgentRoot?: string;
	extensionRoot: string;
	cliPath: string;
	contractsRoot: string;
	catalogPath: string;
}

export interface AscetStatusReport {
	ok: boolean;
	paths: AscetStatusPaths;
	checks: {
		cliExists: boolean;
		contractsRootExists: boolean;
		catalogExists: boolean;
	};
	summary: string;
}

const ASCET_CLI_PATH_ENV_VAR = "ASCET_CLI_PATH";
const ASCET_CONTRACTS_PATH_ENV_VAR = "ASCET_CONTRACTS_PATH";
const defaultExtensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeOverridePath(value: string | undefined, cwd: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? resolve(cwd, trimmed) : undefined;
}

function resolveSourceAscetAgentRoot(cwd: string): string | undefined {
	const resolvedCwd = resolve(cwd);
	if (existsSync(resolve(resolvedCwd, "src/ascetcli/contracts/cli-catalog.json"))) {
		return resolvedCwd;
	}
	const parentRoot = resolve(resolvedCwd, "..");
	if (existsSync(resolve(parentRoot, "src/ascetcli/contracts/cli-catalog.json"))) {
		return parentRoot;
	}
	return undefined;
}

export function resolveAscetStatusPaths(options: AscetStatusPathOptions): AscetStatusPaths {
	const cwd = resolve(options.cwd);
	const env = options.env ?? process.env;
	const extensionRoot = resolve(options.extensionRoot ?? defaultExtensionRoot);
	const envContractsRoot = normalizeOverridePath(env[ASCET_CONTRACTS_PATH_ENV_VAR], cwd);
	const envCliPath = normalizeOverridePath(env[ASCET_CLI_PATH_ENV_VAR], cwd);
	const bundledContractsRoot = resolve(extensionRoot, "ascet-cli/contracts");
	const bundledCliPath = resolve(extensionRoot, "ascet-cli/bin/AscetCli.exe");
	const bundleCatalogExists = existsSync(resolve(bundledContractsRoot, "cli-catalog.json"));
	const bundleCliExists = existsSync(bundledCliPath);
	const bundlePresent = bundleCatalogExists || bundleCliExists;
	const bundleReady = bundleCatalogExists && bundleCliExists;
	const ascetAgentRoot = resolveSourceAscetAgentRoot(cwd);

	if (envContractsRoot || envCliPath) {
		const fallbackContractsRoot =
			envContractsRoot ??
			(bundleReady ? bundledContractsRoot : resolve(ascetAgentRoot ?? cwd, "src/ascetcli/contracts"));
		const fallbackCliPath =
			envCliPath ??
			(bundleReady
				? bundledCliPath
				: resolve(ascetAgentRoot ?? cwd, "src/ascetcli/output/ascet-csharp/bin/AscetCli.exe"));
		return {
			mode: "env",
			ascetAgentRoot,
			extensionRoot,
			cliPath: fallbackCliPath,
			contractsRoot: fallbackContractsRoot,
			catalogPath: resolve(fallbackContractsRoot, "cli-catalog.json"),
		};
	}

	if (bundleReady) {
		return {
			mode: "bundle",
			ascetAgentRoot,
			extensionRoot,
			cliPath: bundledCliPath,
			contractsRoot: bundledContractsRoot,
			catalogPath: resolve(bundledContractsRoot, "cli-catalog.json"),
		};
	}

	if (bundlePresent) {
		return {
			mode: "bundle",
			ascetAgentRoot,
			extensionRoot,
			cliPath: bundledCliPath,
			contractsRoot: bundledContractsRoot,
			catalogPath: resolve(bundledContractsRoot, "cli-catalog.json"),
		};
	}

	const sourceRoot = ascetAgentRoot ?? resolve(cwd, "..");
	const contractsRoot = resolve(sourceRoot, "src/ascetcli/contracts");
	const cliPath = resolve(sourceRoot, "src/ascetcli/output/ascet-csharp/bin/AscetCli.exe");

	return {
		mode: "source",
		ascetAgentRoot,
		extensionRoot,
		cliPath,
		contractsRoot,
		catalogPath: resolve(contractsRoot, "cli-catalog.json"),
	};
}

function formatCheck(label: string, value: boolean, path: string): string {
	return `${label}: ${value ? "OK" : "MISSING"}\n  ${path}`;
}

export function createAscetStatusReport(options: AscetStatusPathOptions): AscetStatusReport {
	const paths = resolveAscetStatusPaths(options);
	const checks = {
		cliExists: existsSync(paths.cliPath),
		contractsRootExists: existsSync(paths.contractsRoot),
		catalogExists: existsSync(paths.catalogPath),
	};
	const ok = checks.cliExists && checks.contractsRootExists && checks.catalogExists;
	const summary = [
		`ASCET status: ${ok ? "ready" : "not ready"}`,
		`ASCET mode: ${paths.mode}`,
		`ASCET extension: ${paths.extensionRoot}`,
		paths.ascetAgentRoot ? `ASCET source: ${paths.ascetAgentRoot}` : "ASCET source: unresolved",
		formatCheck("ASCET CLI", checks.cliExists, paths.cliPath),
		formatCheck("ASCET contracts", checks.contractsRootExists, paths.contractsRoot),
		formatCheck("cli-catalog.json", checks.catalogExists, paths.catalogPath),
	].join("\n");

	return {
		ok,
		paths,
		checks,
		summary,
	};
}

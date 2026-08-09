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

const ASCET_BRIDGE_PATH_ENV_VAR = "ASCET_BRIDGE_PATH";
const ASCET_CONTRACTS_PATH_ENV_VAR = "ASCET_CONTRACTS_PATH";
const defaultExtensionRoot = resolve(dirname(fileURLToPath(import.meta.url)), "..");

function normalizeOverridePath(value: string | undefined, cwd: string): string | undefined {
	const trimmed = value?.trim();
	return trimmed ? resolve(cwd, trimmed) : undefined;
}

function resolveSourceAscetCliRoot(root: string): string | undefined {
	for (const relativePath of ["ascetcli", "src/ascetcli"]) {
		const candidate = resolve(root, relativePath);
		if (existsSync(resolve(candidate, "contracts/cli-catalog.json"))) {
			return candidate;
		}
	}
	return undefined;
}

function resolveSourceAscetAgentRoot(cwd: string): string | undefined {
	const resolvedCwd = resolve(cwd);
	if (resolveSourceAscetCliRoot(resolvedCwd)) {
		return resolvedCwd;
	}
	const parentRoot = resolve(resolvedCwd, "..");
	return resolveSourceAscetCliRoot(parentRoot) ? parentRoot : undefined;
}

export function resolveAscetStatusPaths(options: AscetStatusPathOptions): AscetStatusPaths {
	const cwd = resolve(options.cwd);
	const env = options.env ?? process.env;
	const extensionRoot = resolve(options.extensionRoot ?? defaultExtensionRoot);
	const envContractsRoot = normalizeOverridePath(env[ASCET_CONTRACTS_PATH_ENV_VAR], cwd);
	const envBridgePath = normalizeOverridePath(env[ASCET_BRIDGE_PATH_ENV_VAR], cwd);
	const bundledContractsRoot = resolve(extensionRoot, "ascet-cli/contracts");
	const bundledBridgePath = resolve(extensionRoot, "ascet-cli/bin/AscetBridge.exe");
	const bundleCatalogExists = existsSync(resolve(bundledContractsRoot, "cli-catalog.json"));
	const bundleBridgeExists = existsSync(bundledBridgePath);
	const bundlePresent = bundleCatalogExists || bundleBridgeExists;
	const bundleReady = bundleCatalogExists && bundleBridgeExists;
	const ascetAgentRoot = resolveSourceAscetAgentRoot(cwd);
	const sourceAscetCliRoot = resolveSourceAscetCliRoot(ascetAgentRoot ?? cwd);

	if (envContractsRoot || envBridgePath) {
		const fallbackContractsRoot =
			envContractsRoot ?? (bundleReady ? bundledContractsRoot : resolve(sourceAscetCliRoot ?? cwd, "contracts"));
		const fallbackBridgePath =
			envBridgePath ??
			(bundleReady
				? bundledBridgePath
				: resolve(sourceAscetCliRoot ?? cwd, "output/ascet-csharp/bin/AscetBridge.exe"));
		return {
			mode: "env",
			ascetAgentRoot,
			extensionRoot,
			cliPath: fallbackBridgePath,
			contractsRoot: fallbackContractsRoot,
			catalogPath: resolve(fallbackContractsRoot, "cli-catalog.json"),
		};
	}

	if (bundleReady) {
		return {
			mode: "bundle",
			ascetAgentRoot,
			extensionRoot,
			cliPath: bundledBridgePath,
			contractsRoot: bundledContractsRoot,
			catalogPath: resolve(bundledContractsRoot, "cli-catalog.json"),
		};
	}

	if (bundlePresent) {
		return {
			mode: "bundle",
			ascetAgentRoot,
			extensionRoot,
			cliPath: bundledBridgePath,
			contractsRoot: bundledContractsRoot,
			catalogPath: resolve(bundledContractsRoot, "cli-catalog.json"),
		};
	}

	const sourceRoot = sourceAscetCliRoot ?? resolve(cwd, "ascetcli");
	const contractsRoot = resolve(sourceRoot, "contracts");
	const cliPath = resolve(sourceRoot, "output/ascet-csharp/bin/AscetBridge.exe");

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
		formatCheck("ASCET Bridge", checks.cliExists, paths.cliPath),
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

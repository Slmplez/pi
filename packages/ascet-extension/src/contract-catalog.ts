import { existsSync, readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { createAscetStatusReport } from "./status.ts";

interface AscetCatalogCommand {
	id?: string;
	family?: string;
	risk?: string;
	operation?: string;
	supportsJson?: boolean;
	hiddenFromModel?: boolean;
}

interface AscetCliCatalog {
	version?: number;
	generatedAt?: string;
	commands?: AscetCatalogCommand[];
}

export interface AscetContractCatalogParams {
	includeHidden?: boolean;
}

export interface RunAscetContractCatalogOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
}

export interface AscetContractCatalogResult {
	ok: boolean;
	data: {
		mode: string;
		contractsRoot: string;
		catalogPath: string;
		version?: number;
		generatedAt?: string;
		counts: {
			commands: number;
			visibleCommands: number;
			hiddenCommands: number;
			families: number;
			playbooks: number;
			jsonCommands: number;
			writeCommands: number;
			readCommands: number;
		};
		families: string[];
	};
	error?: {
		code: string;
		message: string;
	};
}

export const ascetContractCatalogParameters = Type.Object({
	includeHidden: Type.Optional(Type.Boolean({ description: "Include hidden commands in returned counts." })),
});

function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

function listJsonBasenames(path: string): string[] {
	if (!existsSync(path)) {
		return [];
	}
	return readdirSync(path)
		.filter((entry) => entry.endsWith(".json"))
		.map((entry) => entry.slice(0, -".json".length))
		.sort();
}

export function runAscetContractCatalog(
	params: AscetContractCatalogParams,
	options: RunAscetContractCatalogOptions,
): AscetContractCatalogResult {
	const status = createAscetStatusReport(options);
	if (!status.checks.catalogExists) {
		return {
			ok: false,
			data: {
				mode: status.paths.mode,
				contractsRoot: status.paths.contractsRoot,
				catalogPath: status.paths.catalogPath,
				counts: {
					commands: 0,
					visibleCommands: 0,
					hiddenCommands: 0,
					families: 0,
					playbooks: 0,
					jsonCommands: 0,
					writeCommands: 0,
					readCommands: 0,
				},
				families: [],
			},
			error: {
				code: "ascet_contract_catalog_missing",
				message: `cli-catalog.json not found: ${status.paths.catalogPath}`,
			},
		};
	}

	try {
		const catalog = JSON.parse(stripBom(readFileSync(status.paths.catalogPath, "utf8"))) as AscetCliCatalog;
		const allCommands = Array.isArray(catalog.commands) ? catalog.commands : [];
		const commands = params.includeHidden
			? allCommands
			: allCommands.filter((command) => command.hiddenFromModel !== true);
		const hiddenCommands = allCommands.filter((command) => command.hiddenFromModel === true);
		const families = listJsonBasenames(resolve(status.paths.contractsRoot, "families"));
		const playbooks = listJsonBasenames(resolve(status.paths.contractsRoot, "playbooks"));

		return {
			ok: true,
			data: {
				mode: status.paths.mode,
				contractsRoot: status.paths.contractsRoot,
				catalogPath: status.paths.catalogPath,
				version: catalog.version,
				generatedAt: catalog.generatedAt,
				counts: {
					commands: commands.length,
					visibleCommands: allCommands.length - hiddenCommands.length,
					hiddenCommands: hiddenCommands.length,
					families: families.length,
					playbooks: playbooks.length,
					jsonCommands: commands.filter((command) => command.supportsJson === true).length,
					writeCommands: commands.filter((command) => command.risk === "write").length,
					readCommands: commands.filter((command) => command.risk === "read").length,
				},
				families,
			},
		};
	} catch (error) {
		return {
			ok: false,
			data: {
				mode: status.paths.mode,
				contractsRoot: status.paths.contractsRoot,
				catalogPath: status.paths.catalogPath,
				counts: {
					commands: 0,
					visibleCommands: 0,
					hiddenCommands: 0,
					families: 0,
					playbooks: 0,
					jsonCommands: 0,
					writeCommands: 0,
					readCommands: 0,
				},
				families: [],
			},
			error: {
				code: "ascet_contract_catalog_invalid",
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}
}

export function formatContractCatalogResult(result: AscetContractCatalogResult): string {
	if (!result.ok) {
		return `ASCET contract catalog failed: ${result.error?.code ?? "unknown"}\n${result.error?.message ?? ""}`;
	}
	return [
		`ASCET contract catalog: ${result.data.counts.commands} commands`,
		`mode: ${result.data.mode}`,
		`families: ${result.data.families.join(", ")}`,
		`playbooks: ${result.data.counts.playbooks}`,
		`jsonCommands: ${result.data.counts.jsonCommands}`,
	].join("\n");
}

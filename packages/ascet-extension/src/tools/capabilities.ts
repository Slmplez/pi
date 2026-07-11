import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { type AscetCliCoverageCategory, classifyAscetCliCommand } from "../routing/coverage.ts";
import { createAscetStatusReport } from "../status.ts";

interface AscetCapabilityCommand {
	id?: string;
	family?: string;
	summary?: string;
	risk?: string;
	objectKinds?: string[];
	supportsJson?: boolean;
	hiddenFromModel?: boolean;
	operation?: string;
	lane?: string;
	hostEligible?: boolean;
	supportsBatch?: boolean;
	args?: Array<{
		name?: string;
		type?: string;
		enumValues?: string[];
	}>;
}

interface AscetCliCatalog {
	commands?: AscetCapabilityCommand[];
}

export interface AscetCapabilitiesParams {
	family?: "explore" | "search" | "read" | "refs" | "diff" | "write" | "verify" | "ops";
	risk?: "read" | "diff" | "write";
	objectKind?: string;
	operationQuery?: string;
	limit?: number;
	includeHidden?: boolean;
}

export interface RunAscetCapabilitiesOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
}

export interface AscetCapabilityMatch {
	id?: string;
	operation?: string;
	family?: string;
	risk?: string;
	summary?: string;
	objectKinds?: string[];
	lane?: string;
	hostEligible?: boolean;
	supportsBatch?: boolean;
	supportsJson?: boolean;
	coverageCategory?: AscetCliCoverageCategory;
	canonicalTool?: string;
	canonicalAction?: string;
	logicalCommandId?: string;
	argumentEnums?: Record<string, string[]>;
}

export interface AscetCapabilitiesResult {
	ok: boolean;
	data: {
		mode: string;
		catalogPath: string;
		matches: AscetCapabilityMatch[];
		totalMatches: number;
	};
	error?: {
		code: string;
		message: string;
	};
}

export const ascetCapabilitiesParameters = Type.Object({
	family: Type.Optional(
		Type.Union([
			Type.Literal("explore"),
			Type.Literal("search"),
			Type.Literal("read"),
			Type.Literal("refs"),
			Type.Literal("diff"),
			Type.Literal("write"),
			Type.Literal("verify"),
			Type.Literal("ops"),
		]),
	),
	risk: Type.Optional(Type.Union([Type.Literal("read"), Type.Literal("diff"), Type.Literal("write")])),
	objectKind: Type.Optional(Type.String()),
	operationQuery: Type.Optional(Type.String()),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 200 })),
	includeHidden: Type.Optional(Type.Boolean()),
});

function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function runAscetCapabilities(
	params: AscetCapabilitiesParams,
	options: RunAscetCapabilitiesOptions,
): AscetCapabilitiesResult {
	const status = createAscetStatusReport(options);
	if (!existsSync(status.paths.catalogPath)) {
		return {
			ok: false,
			data: {
				mode: status.paths.mode,
				catalogPath: status.paths.catalogPath,
				matches: [],
				totalMatches: 0,
			},
			error: {
				code: "ascet_capabilities_catalog_missing",
				message: `cli-catalog.json not found: ${status.paths.catalogPath}`,
			},
		};
	}

	try {
		const catalog = JSON.parse(stripBom(readFileSync(status.paths.catalogPath, "utf8"))) as AscetCliCatalog;
		const query = params.operationQuery?.toLowerCase();
		const matches = (catalog.commands ?? [])
			.filter((command) => params.includeHidden || command.hiddenFromModel !== true)
			.filter((command) => !params.family || command.family === params.family)
			.filter((command) => !params.risk || command.risk === params.risk)
			.filter((command) => !params.objectKind || command.objectKinds?.includes(params.objectKind))
			.filter((command) => {
				if (!query) {
					return true;
				}
				return [command.id, command.operation, command.summary].some((value) =>
					value?.toLowerCase().includes(query),
				);
			})
			.map((command) => {
				const coverage = command.id ? classifyAscetCliCommand(command.id) : undefined;
				const detailedCommand = loadCommandDetails(status.paths.contractsRoot, command);
				return {
					id: command.id,
					operation: command.operation,
					family: command.family,
					risk: command.risk,
					summary: command.summary,
					objectKinds: command.objectKinds,
					lane: command.lane,
					hostEligible: command.hostEligible,
					supportsBatch: command.supportsBatch,
					supportsJson: command.supportsJson,
					coverageCategory: coverage?.category,
					canonicalTool: coverage?.toolName,
					canonicalAction: coverage?.action,
					logicalCommandId: coverage?.logicalCommandId,
					argumentEnums: extractArgumentEnums(detailedCommand),
				};
			});
		const limit = params.limit ?? 50;

		return {
			ok: true,
			data: {
				mode: status.paths.mode,
				catalogPath: status.paths.catalogPath,
				matches: matches.slice(0, limit),
				totalMatches: matches.length,
			},
		};
	} catch (error) {
		return {
			ok: false,
			data: {
				mode: status.paths.mode,
				catalogPath: status.paths.catalogPath,
				matches: [],
				totalMatches: 0,
			},
			error: {
				code: "ascet_capabilities_catalog_invalid",
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}
}

function loadCommandDetails(contractsRoot: string, command: AscetCapabilityCommand): AscetCapabilityCommand {
	if (command.args || !command.id) {
		return command;
	}
	const commandPath = resolve(contractsRoot, "commands", `${command.id}.json`);
	if (!existsSync(commandPath)) {
		return command;
	}
	try {
		return { ...command, ...(JSON.parse(stripBom(readFileSync(commandPath, "utf8"))) as AscetCapabilityCommand) };
	} catch {
		return command;
	}
}

function extractArgumentEnums(command: AscetCapabilityCommand): Record<string, string[]> | undefined {
	const argumentEnums = Object.fromEntries(
		(command.args ?? [])
			.filter((arg) => Array.isArray(arg.enumValues) && arg.enumValues.length > 0)
			.map((arg) => [arg.name ?? "argument", arg.enumValues ?? []]),
	);
	return Object.keys(argumentEnums).length > 0 ? argumentEnums : undefined;
}

export function formatAscetCapabilitiesResult(result: AscetCapabilitiesResult): string {
	if (!result.ok) {
		return `ASCET capabilities failed: ${result.error?.code ?? "unknown"}\n${result.error?.message ?? ""}`;
	}
	return [
		`ASCET capabilities: ${result.data.matches.length}/${result.data.totalMatches} matches`,
		...result.data.matches.map((match) => {
			const route = match.canonicalTool
				? ` via ${match.canonicalTool}.${match.canonicalAction ?? "unknown"}`
				: ` (${match.coverageCategory ?? "unclassified"})`;
			const enumText = match.argumentEnums
				? `; valid values: ${Object.entries(match.argumentEnums)
						.map(([name, values]) => `${name}=${values.join("|")}`)
						.join(", ")}`
				: "";
			return `- ${match.operation ?? match.id}: ${match.summary ?? ""}${route}${enumText}`;
		}),
	].join("\n");
}

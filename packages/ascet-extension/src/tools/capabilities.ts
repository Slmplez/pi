import { existsSync, readFileSync } from "node:fs";
import { Type } from "typebox";
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
			.map((command) => ({
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
			}));
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

export function formatAscetCapabilitiesResult(result: AscetCapabilitiesResult): string {
	if (!result.ok) {
		return `ASCET capabilities failed: ${result.error?.code ?? "unknown"}\n${result.error?.message ?? ""}`;
	}
	return [
		`ASCET capabilities: ${result.data.matches.length}/${result.data.totalMatches} matches`,
		...result.data.matches.map((match) => `- ${match.operation ?? match.id}: ${match.summary ?? ""}`),
	].join("\n");
}

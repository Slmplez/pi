import { existsSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { Type } from "typebox";
import { ASCET_CREATE_METHOD_KIND_COMPATIBILITY } from "../method-kind-compatibility.ts";
import { type AscetCliCoverageCategory, classifyAscetCliCommand } from "../routing/coverage.ts";
import { createAscetStatusReport } from "../status.ts";
import { toToolFailurePayload, toToolSuccessPayload } from "../tool-response-contract.ts";
import { compactExamplesForAction } from "./_shared/action-examples.ts";
import { type AscetActionVisibility, listActionDescriptors } from "./actions/descriptors.ts";
import { resolveActionActivation } from "./actions/gates.ts";
import { type AscetProfile, isAscetProfile } from "./exposure/profiles.ts";
import { activateAscetExposureProfile, getAscetExposureMetadata } from "./exposure/state.ts";

interface AscetCapabilityCommand {
	id?: string;
	family?: string;
	summary?: string;
	risk?: string;
	objectKinds?: string[];
	methodKindCompatibility?: Record<string, string[]>;
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
	action?: "search" | "activate_profile";
	profile?: AscetProfile;
	family?: "explore" | "search" | "read" | "refs" | "diff" | "write" | "verify" | "ops";
	risk?: "read" | "diff" | "write";
	objectKind?: string;
	operationQuery?: string;
	limit?: number;
	includeHidden?: boolean;
	detailLevel?: "summary" | "full";
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
	methodKindCompatibility?: Record<string, string[]>;
	lane?: string;
	hostEligible?: boolean;
	supportsBatch?: boolean;
	supportsJson?: boolean;
	coverageCategory?: AscetCliCoverageCategory;
	canonicalTool?: string;
	canonicalAction?: string;
	logicalCommandId?: string;
	argumentEnums?: Record<string, string[]>;
	actionInstructions?: string[];
}

export interface AscetCapabilityActionStatus {
	tool: string;
	name: string;
	state: string;
	visibility?: AscetActionVisibility;
	replacement?: string;
	featureFlag?: string;
	requiresPartitions?: string[];
	instruction?: string;
	example?: string;
}

export interface AscetCapabilitiesResult {
	ok: boolean;
	data: {
		mode: string;
		catalogPath: string;
		activeProfile: AscetProfile;
		activeTools: string[];
		batchWriteEnabled: boolean;
		actions: AscetCapabilityActionStatus[];
		matches: AscetCapabilityMatch[];
		totalMatches: number;
	};
	error?: {
		code: string;
		message: string;
	};
}

export const ascetCapabilitiesParameters = Type.Object({
	action: Type.Optional(Type.Union([Type.Literal("search"), Type.Literal("activate_profile")])),
	profile: Type.Optional(
		Type.Union([
			Type.Literal("base"),
			Type.Literal("advanced-read"),
			Type.Literal("reference"),
			Type.Literal("diff"),
			Type.Literal("verify"),
			Type.Literal("write-preflight"),
			Type.Literal("batch-write"),
			Type.Literal("component-edit"),
			Type.Literal("ops"),
		]),
	),
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
	detailLevel: Type.Optional(Type.Union([Type.Literal("summary"), Type.Literal("full")])),
});

function stripBom(text: string): string {
	return text.charCodeAt(0) === 0xfeff ? text.slice(1) : text;
}

export function runAscetCapabilities(
	params: AscetCapabilitiesParams,
	options: RunAscetCapabilitiesOptions,
): AscetCapabilitiesResult {
	const status = createAscetStatusReport(options);
	const exposure = getAscetExposureMetadata();
	if (params.action === "activate_profile") {
		if (!isAscetProfile(params.profile)) {
			return {
				ok: false,
				data: createCapabilitiesData(
					status.paths.mode,
					status.paths.catalogPath,
					exposure,
					[],
					0,
					params,
					options.env,
				),
				error: {
					code: "ascet_capabilities_invalid_profile",
					message: "action=activate_profile requires a valid profile.",
				},
			};
		}
		const updated = activateAscetExposureProfile(params.profile);
		if (!updated) {
			return {
				ok: false,
				data: createCapabilitiesData(
					status.paths.mode,
					status.paths.catalogPath,
					exposure,
					[],
					0,
					params,
					options.env,
				),
				error: {
					code: "ascet_capabilities_activation_unavailable",
					message: "ASCET profile activation is not available in this runtime.",
				},
			};
		}
		return {
			ok: true,
			data: createCapabilitiesData(status.paths.mode, status.paths.catalogPath, updated, [], 0, params, options.env),
		};
	}
	if (!existsSync(status.paths.catalogPath)) {
		return {
			ok: false,
			data: createCapabilitiesData(
				status.paths.mode,
				status.paths.catalogPath,
				exposure,
				[],
				0,
				params,
				options.env,
			),
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
					methodKindCompatibility: resolveMethodKindCompatibility(detailedCommand),
					lane: command.lane,
					hostEligible: command.hostEligible,
					supportsBatch: command.supportsBatch,
					supportsJson: command.supportsJson,
					coverageCategory: coverage?.category,
					canonicalTool: coverage?.toolName,
					canonicalAction: coverage?.action,
					logicalCommandId: coverage?.logicalCommandId,
					argumentEnums: extractArgumentEnums(detailedCommand),
					actionInstructions:
						params.detailLevel === "full"
							? compactExamplesForAction(coverage?.toolName, coverage?.action)
							: undefined,
				};
			});
		const limit = params.limit ?? 50;
		const limitedMatches = matches.slice(0, limit);

		return {
			ok: true,
			data: createCapabilitiesData(
				status.paths.mode,
				status.paths.catalogPath,
				exposure,
				limitedMatches,
				matches.length,
				params,
				options.env,
			),
		};
	} catch (error) {
		return {
			ok: false,
			data: createCapabilitiesData(
				status.paths.mode,
				status.paths.catalogPath,
				exposure,
				[],
				0,
				params,
				options.env,
			),
			error: {
				code: "ascet_capabilities_catalog_invalid",
				message: error instanceof Error ? error.message : String(error),
			},
		};
	}
}

function createCapabilitiesData(
	mode: string,
	catalogPath: string,
	exposure: ReturnType<typeof getAscetExposureMetadata>,
	matches: AscetCapabilityMatch[],
	totalMatches: number,
	params: AscetCapabilitiesParams = {},
	env: Record<string, string | undefined> = process.env,
): AscetCapabilitiesResult["data"] {
	return {
		mode,
		catalogPath,
		activeProfile: exposure.profile,
		activeTools: exposure.activeTools,
		batchWriteEnabled: exposure.batchWriteEnabled,
		actions: collectActionStatuses(params, exposure, env),
		matches,
		totalMatches,
	};
}

function resolveToolFamily(tool: string): AscetCapabilitiesParams["family"] | undefined {
	if (tool.includes("search") || tool.includes("reference")) {
		return "search";
	}
	if (tool.includes("read") || tool.includes("explore")) {
		return "read";
	}
	if (tool.includes("diff")) {
		return "diff";
	}
	if (tool.includes("write") || tool.includes("component_editable")) {
		return "write";
	}
	if (tool.includes("verify")) {
		return "verify";
	}
	if (tool.includes("status") || tool.includes("recover") || tool.includes("capabilities")) {
		return "ops";
	}
	return undefined;
}

function collectActionStatuses(
	params: AscetCapabilitiesParams,
	exposure: ReturnType<typeof getAscetExposureMetadata>,
	env: Record<string, string | undefined>,
): AscetCapabilityActionStatus[] {
	const query = params.operationQuery?.toLowerCase();
	const includeHidden = params.includeHidden === true || params.detailLevel === "full";
	const limit = params.limit ?? 50;
	return listActionDescriptors()
		.filter((descriptor) => includeHidden || descriptor.visibility === "public")
		.filter((descriptor) => !params.family || resolveToolFamily(descriptor.tool) === params.family)
		.filter((descriptor) => {
			if (!query) {
				return true;
			}
			return [descriptor.id, descriptor.tool, descriptor.action, descriptor.prompt?.summary].some((value) =>
				value?.toLowerCase().includes(query),
			);
		})
		.map((descriptor) => {
			const state = resolveActionActivation(descriptor, {
				env,
				activeProfile: exposure.profile,
				activeTools: exposure.activeTools,
			});
			return {
				tool: descriptor.tool,
				name: descriptor.action,
				state,
				visibility: includeHidden ? descriptor.visibility : undefined,
				replacement: descriptor.deprecatedBy,
				featureFlag: includeHidden ? descriptor.featureFlag : undefined,
				requiresPartitions: descriptor.requiresPartitions ? [...descriptor.requiresPartitions] : undefined,
				instruction: params.detailLevel === "full" ? descriptor.prompt?.summary : undefined,
				example:
					params.detailLevel === "full"
						? compactExamplesForAction(descriptor.tool, descriptor.action, { includeHidden: true })[0]
						: undefined,
			};
		})
		.filter((item) => includeHidden || item.state === "active")
		.slice(0, limit);
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

function resolveMethodKindCompatibility(command: AscetCapabilityCommand): Record<string, string[]> | undefined {
	if (command.methodKindCompatibility) {
		return command.methodKindCompatibility;
	}
	if (command.id === "AscetCreateMethod" || command.operation === "create_method") {
		return Object.fromEntries(
			Object.entries(ASCET_CREATE_METHOD_KIND_COMPATIBILITY).map(([componentKind, methodKinds]) => [
				componentKind,
				[...methodKinds],
			]),
		);
	}
	return undefined;
}

function extractArgumentEnums(command: AscetCapabilityCommand): Record<string, string[]> | undefined {
	const argumentEnums = Object.fromEntries(
		(command.args ?? [])
			.filter((arg) => Array.isArray(arg.enumValues) && arg.enumValues.length > 0)
			.map((arg) => [arg.name ?? "argument", arg.enumValues ?? []]),
	);
	return Object.keys(argumentEnums).length > 0 ? argumentEnums : undefined;
}

export function toAscetCapabilitiesPayload(result: AscetCapabilitiesResult): unknown {
	if (!result.ok) {
		return toToolFailurePayload({
			code: result.error?.code ?? "ascet_capabilities_failed",
			message: result.error?.message ?? "ASCET capabilities failed.",
		});
	}
	return toToolSuccessPayload({
		activeProfile: result.data.activeProfile,
		activeTools: result.data.activeTools,
		batchWriteEnabled: result.data.batchWriteEnabled,
		actions: result.data.actions,
		totalMatches: result.data.totalMatches,
		matches: result.data.matches,
	});
}

export function formatAscetCapabilitiesResult(result: AscetCapabilitiesResult): string {
	return JSON.stringify(toAscetCapabilitiesPayload(result), null, 2);
}

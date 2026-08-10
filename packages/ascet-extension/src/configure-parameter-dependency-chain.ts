import { randomUUID } from "node:crypto";
import { mkdirSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { Type } from "typebox";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import { runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "./core/tool.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import { requestAscetEditApproval } from "./edit/approval.ts";
import type { RunAscetEditOperationOptions } from "./edit/common.ts";
import { recordAscetWriteTelemetry } from "./edit/write-telemetry.ts";
import {
	type AscetConsumerImportedParameterCreateInput,
	type AscetLocalDependentParameterCreateInput,
	type AscetProviderExportedParameterCreateInput,
	ascetConsumerImportedParameterCreateSchema,
	ascetLocalDependentParameterCreateSchema,
	ascetProviderExportedParameterCreateSchema,
	normalizeAscetElementSpec,
} from "./element-spec-contract.ts";
import { getAscetArtifactRoot } from "./observation-store.ts";
import { renderAscetToolCall, renderAscetToolResult } from "./rendering.ts";
import type { AscetDependencyMappingTarget } from "./set-element-dependency.ts";
import { openAiObjectSchema } from "./tools/_shared/openai-schema.ts";
import { buildToolPromptGuidelines } from "./tools/instructions/registry.ts";

const OPERATION = "configure_parameter_dependency_chain_execute";
const TOOL_NAME = "configure_parameter_dependency_chain";

export type ConfigureParameterDependencyTarget = AscetDependencyMappingTarget;

export interface ConfigureParameterDependencyElement<TElement> {
	componentPath: string;
	element: TElement;
}

export interface ConfigureParameterDependencyDefinition {
	provider: ConfigureParameterDependencyElement<AscetProviderExportedParameterCreateInput>;
	consumer: ConfigureParameterDependencyElement<AscetConsumerImportedParameterCreateInput>;
	local: ConfigureParameterDependencyElement<AscetLocalDependentParameterCreateInput>;
	dependency: {
		formula: string;
		formals: string[];
		bindingPolicy: "explicit";
		mappings: Record<string, ConfigureParameterDependencyTarget>;
		variantPolicy: "default" | "selected" | "all";
		variants?: string[];
	};
}

export type ConfigureParameterDependencyChainParams = ConfigureParameterDependencyDefinition;

export interface ConfigureParameterDependencyChainOptions extends RunAscetEditOperationOptions {
	timeoutMs?: number;
}

export interface ConfigureParameterDependencyChainResult {
	status:
		| "committed"
		| "no_change"
		| "rejected"
		| "blocked"
		| "rolled_back"
		| "rollback_failed"
		| "unknown_outcome"
		| "error";
	writesPerformed: boolean;
	mutationStarted: boolean;
	consistency: "compensating";
	beforeStateHash?: string;
	afterStateHash?: string;
	operationId?: string;
	stages?: unknown[];
	verification?: unknown;
	rollback?: unknown;
	conflicts?: unknown[];
	error?: { code: string; message: string; details?: unknown };
	[key: string]: unknown;
}

const dependencyTargetSchema = Type.Object(
	{
		kind: Type.Union([Type.Literal("parameter"), Type.Literal("constant"), Type.Literal("systemConstant")]),
		name: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);

const configureParameterDependencyChainSchema = Type.Object(
	{
		provider: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				element: ascetProviderExportedParameterCreateSchema,
			},
			{ additionalProperties: false },
		),
		consumer: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				element: ascetConsumerImportedParameterCreateSchema,
			},
			{ additionalProperties: false },
		),
		local: Type.Object(
			{
				componentPath: Type.String({ minLength: 1 }),
				element: ascetLocalDependentParameterCreateSchema,
			},
			{ additionalProperties: false },
		),
		dependency: Type.Object(
			{
				formula: Type.String({ minLength: 1 }),
				formals: Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true }),
				bindingPolicy: Type.Literal("explicit"),
				mappings: Type.Record(Type.String({ minLength: 1 }), dependencyTargetSchema),
				variantPolicy: Type.Union([Type.Literal("default"), Type.Literal("selected"), Type.Literal("all")]),
				variants: Type.Optional(Type.Array(Type.String({ minLength: 1 }), { minItems: 1, uniqueItems: true })),
			},
			{ additionalProperties: false },
		),
	},
	{ additionalProperties: false },
);

export const configureParameterDependencyChainParameters = openAiObjectSchema<ConfigureParameterDependencyChainParams>(
	configureParameterDependencyChainSchema,
);

interface ChainValidationError {
	code: string;
	message: string;
}

function validateChainDefinition(params: ConfigureParameterDependencyDefinition): ChainValidationError | undefined {
	const providerPath = normalizeAscetPath(params.provider.componentPath);
	const consumerPath = normalizeAscetPath(params.consumer.componentPath);
	const localPath = normalizeAscetPath(params.local.componentPath);
	if (providerPath === consumerPath) {
		return {
			code: "configure_parameter_dependency_chain_invalid_scope",
			message: "provider.componentPath and consumer.componentPath must identify different components.",
		};
	}
	if (consumerPath !== localPath) {
		return {
			code: "configure_parameter_dependency_chain_invalid_scope",
			message: "local.componentPath must equal consumer.componentPath.",
		};
	}
	if (!/^P_.+/u.test(params.provider.element.name)) {
		return { code: "provider_parameter_name_invalid", message: "provider.element.name must use P_<Name>." };
	}
	if (!/^P_.+/u.test(params.consumer.element.name)) {
		return { code: "imported_parameter_name_invalid", message: "consumer.element.name must use P_<Name>." };
	}
	if (params.provider.element.name !== params.consumer.element.name) {
		return {
			code: "provider_imported_parameter_name_mismatch",
			message: "Provider Exported and Consumer Imported Parameter names must match exactly.",
		};
	}
	if (!/^C_.+/u.test(params.local.element.name)) {
		return { code: "local_parameter_name_invalid", message: "local.element.name must use C_<Name>." };
	}
	const formals = [...params.dependency.formals].sort();
	const mappingFormals = Object.keys(params.dependency.mappings).sort();
	if (
		formals.length === 0 ||
		formals.length !== mappingFormals.length ||
		formals.some((formal, index) => formal !== mappingFormals[index])
	) {
		return {
			code: "dependency_mapping_formals_mismatch",
			message: "dependency.formals and dependency.mappings keys must match exactly.",
		};
	}
	if (
		!Object.values(params.dependency.mappings).some(
			(target) => target.kind === "parameter" && target.name === params.consumer.element.name,
		)
	) {
		return {
			code: "configure_parameter_dependency_chain_provider_mapping_required",
			message: "At least one formal must map to the Consumer Imported Parameter.",
		};
	}
	if (params.dependency.variantPolicy === "selected" && !params.dependency.variants?.length) {
		return {
			code: "data_variant_selection_required",
			message: 'dependency.variantPolicy="selected" requires dependency.variants.',
		};
	}
	if (params.dependency.variantPolicy !== "selected" && params.dependency.variants !== undefined) {
		return {
			code: "configure_parameter_dependency_chain_invalid_parameter",
			message: "dependency.variants is only valid with dependency.variantPolicy=selected.",
		};
	}
	return undefined;
}

function rejected(error: ChainValidationError): ConfigureParameterDependencyChainResult {
	return {
		status: "rejected",
		writesPerformed: false,
		mutationStarted: false,
		consistency: "compensating",
		error,
		rollback: { required: false, status: "not_required" },
	};
}

function validateChainParams(
	value: unknown,
): { params: ConfigureParameterDependencyChainParams } | { error: ChainValidationError } {
	if (!Value.Check(configureParameterDependencyChainParameters, value)) {
		return {
			error: {
				code: "configure_parameter_dependency_chain_invalid_parameter",
				message: "Invalid dependency-chain parameters; unknown and incomplete properties are rejected.",
			},
		};
	}
	const params = value as ConfigureParameterDependencyChainParams;
	const error = validateChainDefinition(params);
	return error ? { error } : { params };
}

function buildConfirmationSummary(params: ConfigureParameterDependencyDefinition): string {
	const mappings = Object.entries(params.dependency.mappings)
		.map(([formal, target]) => `  ${formal} -> ${target.kind}:${target.name}`)
		.join("\n");
	return [
		"This executes one real ASCET dependency-chain write.",
		`Provider: ${normalizeAscetPath(params.provider.componentPath)}/${params.provider.element.name}`,
		`Imported: ${normalizeAscetPath(params.consumer.componentPath)}/${params.consumer.element.name}`,
		`Local: ${normalizeAscetPath(params.local.componentPath)}/${params.local.element.name}`,
		`Formula: ${params.dependency.formula}`,
		`Variant policy: ${params.dependency.variantPolicy}${params.dependency.variants ? ` (${params.dependency.variants.join(", ")})` : ""}`,
		"Mappings:",
		mappings,
		"Existing conflicting state will be rejected before mutation. Failures after mutation use verified compensating rollback.",
	].join("\n");
}

function normalizeElement(element: Record<string, unknown>): { elements: Record<string, unknown>[] } {
	return normalizeAscetElementSpec("create", [element], []).spec;
}

function buildBridgeRequest(params: ConfigureParameterDependencyDefinition): Record<string, unknown> {
	return {
		provider: {
			componentPath: normalizeAscetPath(params.provider.componentPath),
			spec: normalizeElement(params.provider.element),
		},
		consumer: {
			componentPath: normalizeAscetPath(params.consumer.componentPath),
			spec: normalizeElement(params.consumer.element),
		},
		local: {
			componentPath: normalizeAscetPath(params.local.componentPath),
			spec: normalizeElement(params.local.element),
		},
		dependency: {
			targetPath: normalizeAscetPath(params.consumer.componentPath),
			elementName: params.local.element.name,
			formula: params.dependency.formula,
			formals: params.dependency.formals,
			bindingPolicy: params.dependency.bindingPolicy,
			mappings: params.dependency.mappings,
			variantPolicy: params.dependency.variantPolicy,
			...(params.dependency.variants ? { variants: params.dependency.variants } : {}),
		},
	};
}

function writeBridgeRequest(request: Record<string, unknown>): string {
	const directory = join(getAscetArtifactRoot(), "dependency-chain-requests");
	mkdirSync(directory, { recursive: true });
	const path = join(directory, `execute-${process.pid}-${Date.now()}-${randomUUID()}.json`);
	writeFileSync(path, `${JSON.stringify(request, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
	return path;
}

function removeBridgeRequest(path: string): void {
	try {
		unlinkSync(path);
	} catch (error) {
		if (!(error instanceof Error && "code" in error && error.code === "ENOENT")) throw error;
	}
}

function normalizeBridgeResult(data: unknown): ConfigureParameterDependencyChainResult | undefined {
	if (data === null || typeof data !== "object" || Array.isArray(data)) return undefined;
	const envelope = data as Record<string, unknown>;
	const candidate = envelope.type === "response" && envelope.protocolVersion === 1 ? envelope.result : data;
	if (candidate === null || typeof candidate !== "object" || Array.isArray(candidate)) return undefined;
	const result = candidate as Record<string, unknown>;
	const status = result.status;
	if (
		status !== "committed" &&
		status !== "no_change" &&
		status !== "rejected" &&
		status !== "rolled_back" &&
		status !== "rollback_failed" &&
		status !== "unknown_outcome"
	) {
		return undefined;
	}
	return {
		...result,
		status,
		writesPerformed: result.writesPerformed === true,
		mutationStarted: result.mutationStarted === true,
		consistency: "compensating",
	};
}

async function runConfigureParameterDependencyChainInternal(
	value: unknown,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetEditApprovalContext,
): Promise<ConfigureParameterDependencyChainResult> {
	const validation = validateChainParams(value);
	if ("error" in validation) return rejected(validation.error);
	const params = validation.params;

	let bridgeRequest: Record<string, unknown>;
	try {
		bridgeRequest = buildBridgeRequest(params);
	} catch (error) {
		return rejected({
			code: "configure_parameter_dependency_chain_invalid_element_spec",
			message: error instanceof Error ? error.message : String(error),
		});
	}

	const approval = await requestAscetEditApproval(
		{
			executeWrite: true,
			title: "Execute ASCET parameter dependency chain",
			message: buildConfirmationSummary(params),
			signal: options.signal,
			errorPrefix: "configure_parameter_dependency_chain",
		},
		ctx,
	);
	if (!approval.approved) {
		return {
			status: "blocked",
			writesPerformed: false,
			mutationStarted: false,
			consistency: "compensating",
			error: { code: approval.code, message: approval.message },
			rollback: { required: false, status: "not_required" },
		};
	}

	let requestPath = "";
	try {
		requestPath = writeBridgeRequest(bridgeRequest);
		const cliResult = await runAscetCliJson(["exec", OPERATION, requestPath, "--json"], {
			...options,
			toolName: TOOL_NAME,
			commandId: OPERATION,
			jobKind: "write",
		});
		if (!cliResult.ok) {
			const unknown = cliResult.error?.code === "write_outcome_unknown";
			return {
				status: unknown ? "unknown_outcome" : "error",
				writesPerformed: false,
				mutationStarted: unknown,
				consistency: "compensating",
				error: cliResult.error ?? {
					code: "configure_parameter_dependency_chain_bridge_failed",
					message: "Bridge execution failed.",
				},
				rollback: { required: unknown, status: unknown ? "unknown" : "not_required" },
			};
		}
		return (
			normalizeBridgeResult(cliResult.data) ?? {
				status: "unknown_outcome",
				writesPerformed: false,
				mutationStarted: true,
				consistency: "compensating",
				error: {
					code: "configure_parameter_dependency_chain_invalid_bridge_result",
					message: "Bridge returned an invalid dependency-chain result.",
					details: cliResult.data,
				},
				rollback: { required: true, status: "unknown" },
			}
		);
	} finally {
		if (requestPath) removeBridgeRequest(requestPath);
	}
}

export async function runConfigureParameterDependencyChain(
	value: unknown,
	options: ConfigureParameterDependencyChainOptions,
	ctx: AscetEditApprovalContext,
): Promise<ConfigureParameterDependencyChainResult> {
	const startedAt = Date.now();
	const result = await runConfigureParameterDependencyChainInternal(value, options, ctx);
	recordAscetWriteTelemetry(options, {
		operation: TOOL_NAME,
		phase: "execute",
		outcome:
			result.status === "committed"
				? "committed"
				: result.status === "no_change"
					? "no_change"
					: result.status === "blocked"
						? "blocked"
						: "error",
		durationMs: Math.max(0, Date.now() - startedAt),
		...(result.error ? { errorCode: result.error.code } : {}),
	});
	return result;
}

export function formatConfigureParameterDependencyChainResult(result: ConfigureParameterDependencyChainResult): string {
	return JSON.stringify(result, null, 2);
}

export const configureParameterDependencyChainTool = defineSequentialAscetTool({
	name: TOOL_NAME,
	label: "Configure ASCET parameter dependency chain",
	description:
		"Execute one guarded ASCET Provider Exported Parameter -> Consumer Imported Parameter -> Local Dependent Parameter chain with live conflict validation, readback, and compensating rollback.",
	promptSnippet:
		"Use configure_parameter_dependency_chain once for one complete provider/imported/local dependency chain.",
	promptGuidelines: buildToolPromptGuidelines({ tool: TOOL_NAME, includeExamples: false }),
	parameters: configureParameterDependencyChainParameters,
	renderCall: renderAscetToolCall,
	renderResult: renderAscetToolResult,
	async execute(
		_toolCallId: string,
		params: ConfigureParameterDependencyChainParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext & {
			env?: Record<string, string | undefined>;
			executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
		},
	) {
		const result = await runConfigureParameterDependencyChain(
			params,
			{
				cwd: ctx.cwd,
				agentId: ctx.agentId,
				sessionId: ctx.sessionId,
				env: ctx.env,
				signal,
				timeoutMs: 180_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		return {
			content: [{ type: "text", text: formatConfigureParameterDependencyChainResult(result) }],
			details: { tool: TOOL_NAME, action: "execute", outcome: result },
		};
	},
});

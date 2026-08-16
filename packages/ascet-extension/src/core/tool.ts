import type { Api, AssistantMessageEventStream, Context, Model, SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai/oauth";
import type { TSchema } from "typebox";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import type { AscetPermissionSnapshot } from "../permissions/types.ts";
import { renderAscetToolCall, renderAscetToolResult } from "../rendering.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { createInvalidParametersToolResult } from "../tools/_shared/validation.ts";
import { getAscetActionContract } from "../tools/actions/contract-registry.ts";
import type { ActionActivationContext } from "../tools/actions/gates.ts";
import {
	AscetActionUnavailableError,
	assertActionActive,
	createActionUnavailableToolResult,
	extractToolAction,
} from "../tools/actions/guard.ts";

type AscetProviderModelConfig = {
	id: string;
	name: string;
	api?: Api;
	baseUrl?: string;
	reasoning: boolean;
	thinkingLevelMap?: Model<Api>["thinkingLevelMap"];
	input: ("text" | "image")[];
	cost: { input: number; output: number; cacheRead: number; cacheWrite: number };
	contextWindow: number;
	maxTokens: number;
	headers?: Record<string, string>;
	compat?: Model<Api>["compat"];
};

type AscetProviderConfig = {
	name?: string;
	baseUrl?: string;
	apiKey?: string;
	api?: Api;
	streamSimple?: (model: Model<Api>, context: Context, options?: SimpleStreamOptions) => AssistantMessageEventStream;
	headers?: Record<string, string>;
	authHeader?: boolean;
	retry?: {
		enabled?: boolean;
		maxRetries?: number;
		baseDelayMs?: number;
		provider?: { timeoutMs?: number; maxRetries?: number; maxRetryDelayMs?: number };
	};
	models?: AscetProviderModelConfig[];
	oauth?: {
		name: string;
		loginMethodLabel?: string;
		login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials>;
		refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials>;
		getApiKey(credentials: OAuthCredentials): string;
		modifyModels?(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[];
	};
};

type AscetSettingsDefaults = {
	providerOverrides?: Record<
		string,
		{
			retry?: {
				enabled?: boolean;
				maxRetries?: number;
				baseDelayMs?: number;
				provider?: {
					timeoutMs?: number;
					maxRetries?: number;
					maxRetryDelayMs?: number;
				};
			};
		}
	>;
};

export interface AscetExtensionAPI {
	registerTool(tool: unknown): void;
	getActiveTools?(): string[];
	getAllTools?(): Array<{ name: string; description?: string; promptGuidelines?: string[] }>;
	setActiveTools?(toolNames: string[]): void;
	sendUserMessage(
		content: string,
		options?: {
			deliverAs?: "steer" | "followUp";
		},
	): void;
	registerCommand(
		name: string,
		options: {
			description?: string;
			handler: (
				args: string,
				ctx: {
					cwd: string;
					isIdle(): boolean;
					ui: {
						notify(message: string, level?: "info" | "warning" | "error"): void;
						setStatus?(key: string, text: string | undefined): void;
					};
				},
			) => Promise<void> | void;
		},
	): void;
	appendEntry?(customType: string, data?: unknown): void;
	registerProvider?(name: string, config: AscetProviderConfig): void;
	applySettingsDefaults?(defaults: AscetSettingsDefaults): void;
	on?(
		event: "before_provider_request",
		handler: (
			event: { type: "before_provider_request"; payload: unknown },
			ctx: {
				model?: { provider: string; api?: string; baseUrl?: string };
				modelRegistry: { getApiKeyForProvider(provider: string): Promise<string | undefined> };
			},
		) => Promise<unknown | undefined> | unknown | undefined,
	): void;
	on?(
		event: "before_provider_headers",
		handler: (
			event: { type: "before_provider_headers"; headers: Record<string, string | null | undefined> },
			ctx: {
				model?: { provider: string; api?: string; baseUrl?: string };
				modelRegistry: { getApiKeyForProvider(provider: string): Promise<string | undefined> };
			},
		) => Promise<void> | void,
	): void;
	on?(
		event: "before_agent_start",
		handler: (event: {
			type: "before_agent_start";
			prompt: string;
			systemPrompt: string;
		}) => { systemPrompt?: string } | undefined | Promise<{ systemPrompt?: string } | undefined>,
	): void;
	on?(
		event: "session_start" | "session_shutdown",
		handler: (
			event: { type: "session_start" | "session_shutdown" },
			ctx: {
				cwd?: string;
				hasUI?: boolean;
				mode?: string;
				sessionManager?: {
					getCwd(): string;
					getEntries(): Array<{ type: string; customType?: string; data?: unknown }>;
				};
				ui?: {
					notify?(message: string, level?: "info" | "warning" | "error"): void;
					setStatus?(key: string, text: string | undefined): void;
					theme?: {
						fg?(color: string, text: string): string;
					};
				};
			},
		) => void | Promise<void>,
	): void;
}

export interface AscetToolContext {
	cwd: string;
	ascetPermission?: AscetPermissionSnapshot;
	agentId?: string;
	sessionId?: string;
	env?: Record<string, string | undefined>;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	actionActivationContext?: ActionActivationContext;
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

type AscetRenderableTool = {
	name: string;
	parameters?: TSchema;
	executionMode?: "sequential" | "parallel";
	renderCall?: typeof renderAscetToolCall;
	renderResult?: typeof renderAscetToolResult;
	execute?: (...args: never[]) => Promise<unknown> | unknown;
};

function getActionActivationContext(value: unknown): ActionActivationContext {
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		return {};
	}
	const context = (value as { actionActivationContext?: unknown }).actionActivationContext;
	if (context === null || typeof context !== "object" || Array.isArray(context)) {
		return {};
	}
	return context as ActionActivationContext;
}

function agentContentPayload(result: unknown): unknown {
	if (result === null || typeof result !== "object" || Array.isArray(result)) return undefined;
	const content = (result as { content?: unknown }).content;
	if (!Array.isArray(content)) return undefined;
	const textPart = content.find(
		(part): part is { type: "text"; text: string } =>
			part !== null &&
			typeof part === "object" &&
			!Array.isArray(part) &&
			(part as { type?: unknown }).type === "text" &&
			typeof (part as { text?: unknown }).text === "string",
	);
	if (!textPart) return undefined;
	try {
		return JSON.parse(textPart.text) as unknown;
	} catch {
		return textPart.text;
	}
}

export function assertAscetActionResult(tool: string, action: string, result: unknown): void {
	const contract = getAscetActionContract(tool, action);
	if (!contract) return;
	const payload = agentContentPayload(result);
	if (payload === undefined || !Value.Check(contract.result, payload)) {
		throw new Error(`ASCET action result violates Contract: ${contract.id}`);
	}
}

export function defineSequentialAscetTool<T extends AscetRenderableTool>(
	tool: T,
): Omit<T, "executionMode" | "renderCall" | "renderResult"> & {
	executionMode: "sequential";
	renderCall: typeof renderAscetToolCall;
	renderResult: typeof renderAscetToolResult;
} {
	const execute = tool.execute
		? async (...args: Parameters<NonNullable<T["execute"]>>) => {
				const invalidParameters = tool.parameters
					? createInvalidParametersToolResult(tool.name, tool.parameters, args[1])
					: undefined;
				if (invalidParameters) {
					return invalidParameters;
				}
				try {
					assertActionActive(
						tool.name,
						extractToolAction(tool.name, args[1]),
						getActionActivationContext(args[4]),
					);
				} catch (error) {
					if (error instanceof AscetActionUnavailableError) {
						return createActionUnavailableToolResult(error);
					}
					throw error;
				}
				const result = await tool.execute!(...args);
				assertAscetActionResult(tool.name, extractToolAction(tool.name, args[1]), result);
				return result;
			}
		: undefined;
	return {
		...tool,
		...(execute ? { execute } : {}),
		executionMode: "sequential",
		renderCall: tool.renderCall ?? renderAscetToolCall,
		renderResult: tool.renderResult ?? renderAscetToolResult,
	};
}

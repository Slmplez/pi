import type { Api, AssistantMessageEventStream, Context, Model, SimpleStreamOptions } from "@earendil-works/pi-ai";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai/oauth";
import { renderAscetToolCall, renderAscetToolResult } from "../rendering.ts";

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
	models?: AscetProviderModelConfig[];
	oauth?: {
		name: string;
		login(callbacks: OAuthLoginCallbacks): Promise<OAuthCredentials>;
		refreshToken(credentials: OAuthCredentials): Promise<OAuthCredentials>;
		getApiKey(credentials: OAuthCredentials): string;
		modifyModels?(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[];
	};
};

export interface AscetExtensionAPI {
	registerTool(tool: unknown): void;
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
					ui: { notify(message: string, level?: "info" | "warning" | "error"): void };
				},
			) => void;
		},
	): void;
	registerProvider?(name: string, config: AscetProviderConfig): void;
	on?(
		event: "before_provider_request",
		handler: (
			event: { type: "before_provider_request"; payload: unknown },
			ctx: {
				model?: { provider: string };
				modelRegistry: { getApiKeyForProvider(provider: string): Promise<string | undefined> };
			},
		) => Promise<unknown | undefined> | unknown | undefined,
	): void;
}

export interface AscetToolContext {
	cwd: string;
	hasUI?: boolean;
	ui?: {
		confirm(title: string, message: string, opts?: { signal?: AbortSignal; timeout?: number }): Promise<boolean>;
	};
}

type AscetRenderableTool = {
	name: string;
	executionMode?: "sequential" | "parallel";
	renderCall?: typeof renderAscetToolCall;
	renderResult?: typeof renderAscetToolResult;
};

export function defineSequentialAscetTool<T extends AscetRenderableTool>(
	tool: T,
): Omit<T, "executionMode" | "renderCall" | "renderResult"> & {
	executionMode: "sequential";
	renderCall: typeof renderAscetToolCall;
	renderResult: typeof renderAscetToolResult;
} {
	return {
		...tool,
		executionMode: "sequential",
		renderCall: tool.renderCall ?? renderAscetToolCall,
		renderResult: tool.renderResult ?? renderAscetToolResult,
	};
}

import type {
	Api,
	AssistantMessage,
	AssistantMessageEventStream,
	Context,
	ImageContent,
	Model,
	SimpleStreamOptions,
	TextContent,
	Tool,
	ToolCall,
	ToolResultMessage,
	Usage,
} from "@earendil-works/pi-ai";
import { createAssistantMessageEventStream } from "@earendil-works/pi-ai";
import type { OAuthCredentials, OAuthLoginCallbacks } from "@earendil-works/pi-ai/oauth";
import { ensureBoschSystemCa } from "./bosch-llmfarm-tls.ts";
import type { AscetExtensionAPI } from "./core/tool.ts";

export const BOSCH_LLMFARM_PROVIDER_ID = "bosch-llmfarm";
export const BOSCH_LLMFARM_API = "bosch-llmfarm-api";

const DEFAULT_BASE_URL = "https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1";
const FAR_FUTURE_EXPIRES = 4102444800000;
const INTERNAL_KEY_PLACEMENT_HEADER = "x-bosch-llmfarm-key-placement";
const INTERNAL_STREAM_HEADER = "x-bosch-llmfarm-stream";
const TLS_CERTIFICATE_ERROR_CODES = new Set([
	"UNABLE_TO_VERIFY_LEAF_SIGNATURE",
	"SELF_SIGNED_CERT_IN_CHAIN",
	"DEPTH_ZERO_SELF_SIGNED_CERT",
	"UNABLE_TO_GET_ISSUER_CERT",
	"UNABLE_TO_GET_ISSUER_CERT_LOCALLY",
]);

export type BoschGatewayKeyPlacement =
	| "authorization-gateway-header"
	| "header-query-body"
	| "header-only"
	| "header-body"
	| "header-query";

export interface BoschModelConfig {
	id: string;
	name: string;
	contextWindow: number;
	maxTokens: number;
	input: ("text" | "image")[];
	reasoning: boolean;
	streaming?: boolean;
}

export interface BoschLlmFarmCredentials extends OAuthCredentials {
	baseUrl: string;
	keyPlacement: BoschGatewayKeyPlacement;
	models: BoschModelConfig[];
}

interface BoschStreamOptions extends SimpleStreamOptions {
	fetch?: typeof fetch;
}

type BoschChatMessage =
	| { role: "system"; content: string }
	| { role: "user"; content: string | BoschContentPart[] }
	| { role: "assistant"; content?: string | null; tool_calls?: BoschToolCall[] }
	| { role: "tool"; tool_call_id: string; name?: string; content: string };

type BoschContentPart = { type: "text"; text: string } | { type: "image_url"; image_url: { url: string } };

type BoschToolCall = {
	id: string;
	type: "function";
	function: {
		name: string;
		arguments: string;
	};
};

type BoschToolDefinition = {
	type: "function";
	function: {
		name: string;
		description: string;
		parameters: unknown;
	};
};

type BoschChatPayload = {
	model: string;
	messages: BoschChatMessage[];
	stream: boolean;
	temperature?: number;
	max_tokens?: number;
	tools?: BoschToolDefinition[];
	tool_choice?: "auto";
	gatewayKey?: string;
};

type BoschNonStreamingResponse = {
	id?: string;
	model?: string;
	choices?: Array<{
		message?: {
			content?: string | null;
			tool_calls?: BoschToolCall[];
		};
		finish_reason?: string | null;
	}>;
	usage?: {
		prompt_tokens?: number;
		completion_tokens?: number;
		total_tokens?: number;
	};
};

type BoschStreamingChunk = {
	model?: string;
	choices?: Array<{
		delta?: {
			content?: string | null;
			tool_calls?: Array<{
				index?: number;
				id?: string;
				function?: {
					name?: string;
					arguments?: string;
				};
			}>;
		};
		finish_reason?: string | null;
	}>;
	usage?: BoschNonStreamingResponse["usage"];
};

type StreamingToolCall = ToolCall & {
	streamIndex: number;
	partialArguments: string;
};

export function normalizeBoschBaseUrl(input: string): { baseUrl: string; gatewayKey?: string } {
	const trimmed = input.trim();
	if (!trimmed) {
		return { baseUrl: DEFAULT_BASE_URL };
	}

	const url = new URL(trimmed);
	const gatewayKey = url.searchParams.get("gatewayKey") ?? undefined;
	url.search = "";
	url.hash = "";
	url.pathname = url.pathname.replace(/\/+$/, "");
	if (url.pathname.endsWith("/chat/completions")) {
		url.pathname = url.pathname.slice(0, -"/chat/completions".length);
	}
	url.pathname = url.pathname.replace(/\/+$/, "");
	return { baseUrl: url.toString().replace(/\/+$/, ""), gatewayKey };
}

export function buildBoschChatCompletionsUrl(
	baseUrl: string,
	gatewayKey: string,
	keyPlacement: BoschGatewayKeyPlacement,
): string {
	const url = new URL(`${baseUrl.replace(/\/+$/, "")}/chat/completions`);
	if (keyPlacement === "header-query-body" || keyPlacement === "header-query") {
		url.searchParams.set("gatewayKey", gatewayKey);
	}
	return url.toString();
}

function parsePositiveInteger(value: string, fieldName: string): number {
	const parsed = Number.parseInt(value.trim(), 10);
	if (!Number.isFinite(parsed) || parsed <= 0) {
		throw new Error(`${fieldName} must be a positive integer.`);
	}
	return parsed;
}

function parseBoolean(value: string): boolean {
	return ["true", "yes", "y", "1"].includes(value.trim().toLowerCase());
}

function parseInputModes(value: string): ("text" | "image")[] {
	const normalized = value.trim().toLowerCase();
	if (normalized === "text+image" || normalized === "image" || normalized === "vision") {
		return ["text", "image"];
	}
	return ["text"];
}

async function promptWithDefault(callbacks: OAuthLoginCallbacks, message: string, fallback: string): Promise<string> {
	const answer = await callbacks.onPrompt({ message, placeholder: fallback, allowEmpty: true });
	const trimmed = answer.trim();
	return trimmed || fallback;
}

async function selectKeyPlacement(callbacks: OAuthLoginCallbacks): Promise<BoschGatewayKeyPlacement> {
	const selected = await callbacks.onSelect({
		message: "Gateway key placement:",
		options: [
			{ id: "authorization-gateway-header", label: "authorization + gatewayKey header" },
			{ id: "header-query-body", label: "header + query + body" },
			{ id: "header-only", label: "header only" },
			{ id: "header-body", label: "header + body" },
			{ id: "header-query", label: "header + query" },
		],
	});
	if (
		selected === "authorization-gateway-header" ||
		selected === "header-only" ||
		selected === "header-body" ||
		selected === "header-query" ||
		selected === "header-query-body"
	) {
		return selected;
	}
	return "authorization-gateway-header";
}

export async function loginBoschLlmFarm(callbacks: OAuthLoginCallbacks): Promise<BoschLlmFarmCredentials> {
	const rawEndpoint = await promptWithDefault(callbacks, "Bosch LLM Farm endpoint:", DEFAULT_BASE_URL);
	const normalized = normalizeBoschBaseUrl(rawEndpoint);
	const keyFallback = normalized.gatewayKey ?? "";
	const gatewayKey = await promptWithDefault(callbacks, "Gateway key:", keyFallback);
	if (!gatewayKey) {
		throw new Error("Gateway key cannot be empty.");
	}
	const keyPlacement = await selectKeyPlacement(callbacks);
	const rawModelIds = await callbacks.onPrompt({
		message: "Model IDs, comma-separated:",
		placeholder: "model-a, model-b",
	});
	const modelIds = rawModelIds
		.split(",")
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
	if (modelIds.length === 0) {
		throw new Error("At least one model ID is required.");
	}

	const models: BoschModelConfig[] = [];
	for (const modelId of modelIds) {
		const contextWindow = parsePositiveInteger(
			await promptWithDefault(callbacks, `Context window for ${modelId}:`, "128000"),
			`Context window for ${modelId}`,
		);
		const maxTokens = parsePositiveInteger(
			await promptWithDefault(callbacks, `Max output tokens for ${modelId}:`, "8192"),
			`Max output tokens for ${modelId}`,
		);
		const input = parseInputModes(await promptWithDefault(callbacks, `Input support for ${modelId}:`, "text"));
		const reasoning = parseBoolean(await promptWithDefault(callbacks, `Reasoning support for ${modelId}:`, "false"));
		const streaming = parseBoolean(await promptWithDefault(callbacks, `Streaming support for ${modelId}:`, "false"));
		models.push({ id: modelId, name: modelId, contextWindow, maxTokens, input, reasoning, streaming });
	}

	callbacks.onProgress?.(`Configured ${models.length} Bosch LLM Farm model(s).`);
	return {
		access: gatewayKey,
		refresh: "",
		expires: FAR_FUTURE_EXPIRES,
		baseUrl: normalized.baseUrl,
		keyPlacement,
		models,
	};
}

export async function refreshBoschLlmFarmToken(credentials: OAuthCredentials): Promise<OAuthCredentials> {
	return { ...credentials, expires: FAR_FUTURE_EXPIRES };
}

function isBoschCredentials(credentials: OAuthCredentials): credentials is BoschLlmFarmCredentials {
	return (
		typeof credentials.baseUrl === "string" &&
		Array.isArray(credentials.models) &&
		typeof credentials.keyPlacement === "string"
	);
}

export function applyBoschConfiguredModels(models: Model<Api>[], credentials: OAuthCredentials): Model<Api>[] {
	const otherModels = models.filter((model) => model.provider !== BOSCH_LLMFARM_PROVIDER_ID);
	if (!isBoschCredentials(credentials)) {
		return models;
	}
	const boschModels: Model<Api>[] = credentials.models.map((model) => ({
		id: model.id,
		name: model.name || model.id,
		api: BOSCH_LLMFARM_API,
		provider: BOSCH_LLMFARM_PROVIDER_ID,
		baseUrl: credentials.baseUrl,
		reasoning: model.reasoning,
		input: model.input,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: model.contextWindow,
		maxTokens: model.maxTokens,
		headers: {
			[INTERNAL_KEY_PLACEMENT_HEADER]: credentials.keyPlacement,
			[INTERNAL_STREAM_HEADER]: String(model.streaming === true),
		},
	}));
	return [...otherModels, ...boschModels];
}

function createEmptyUsage(input = 0, output = 0, totalTokens = input + output): Usage {
	return {
		input,
		output,
		cacheRead: 0,
		cacheWrite: 0,
		totalTokens,
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0, total: 0 },
	};
}

function createAssistantMessage(model: Model<Api>): AssistantMessage {
	return {
		role: "assistant",
		content: [],
		api: model.api,
		provider: model.provider,
		model: model.id,
		usage: createEmptyUsage(),
		stopReason: "stop",
		timestamp: Date.now(),
	};
}

function imageToUrl(block: ImageContent): string {
	if (block.data.startsWith("http://") || block.data.startsWith("https://") || block.data.startsWith("data:")) {
		return block.data;
	}
	return `data:${block.mimeType};base64,${block.data}`;
}

function convertUserContent(content: string | (TextContent | ImageContent)[]): string | BoschContentPart[] {
	if (typeof content === "string") {
		return content;
	}
	return content.map((block) =>
		block.type === "text"
			? { type: "text", text: block.text }
			: { type: "image_url", image_url: { url: imageToUrl(block) } },
	);
}

function convertAssistantMessage(message: AssistantMessage): BoschChatMessage | undefined {
	const text = message.content
		.filter((block): block is TextContent => block.type === "text")
		.map((block) => block.text)
		.join("");
	const toolCalls = message.content
		.filter((block): block is ToolCall => block.type === "toolCall")
		.map((block) => ({
			id: block.id,
			type: "function" as const,
			function: {
				name: block.name,
				arguments: JSON.stringify(block.arguments),
			},
		}));
	if (!text && toolCalls.length === 0) {
		return undefined;
	}
	return {
		role: "assistant",
		content: text || null,
		tool_calls: toolCalls.length > 0 ? toolCalls : undefined,
	};
}

function convertToolResult(message: ToolResultMessage): BoschChatMessage {
	return {
		role: "tool",
		tool_call_id: message.toolCallId,
		name: message.toolName,
		content: message.content.map((block) => (block.type === "text" ? block.text : imageToUrl(block))).join("\n"),
	};
}

function convertMessages(context: Context): BoschChatMessage[] {
	const messages: BoschChatMessage[] = [];
	if (context.systemPrompt?.trim()) {
		messages.push({ role: "system", content: context.systemPrompt });
	}
	for (const message of context.messages) {
		if (message.role === "user") {
			messages.push({ role: "user", content: convertUserContent(message.content) });
		} else if (message.role === "assistant") {
			const converted = convertAssistantMessage(message);
			if (converted) {
				messages.push(converted);
			}
		} else {
			messages.push(convertToolResult(message));
		}
	}
	return messages;
}

function convertTools(tools: Tool[] | undefined): BoschToolDefinition[] | undefined {
	if (!tools || tools.length === 0) {
		return undefined;
	}
	return tools.map((tool) => ({
		type: "function",
		function: {
			name: tool.name,
			description: tool.description,
			parameters: tool.parameters,
		},
	}));
}

function shouldIncludeBodyKey(keyPlacement: BoschGatewayKeyPlacement): boolean {
	return keyPlacement === "header-query-body" || keyPlacement === "header-body";
}

function shouldIncludeGatewayKeyHeader(keyPlacement: BoschGatewayKeyPlacement): boolean {
	return keyPlacement === "authorization-gateway-header";
}

function parseKeyPlacement(value: unknown): BoschGatewayKeyPlacement | undefined {
	if (
		value === "authorization-gateway-header" ||
		value === "header-only" ||
		value === "header-body" ||
		value === "header-query" ||
		value === "header-query-body"
	) {
		return value;
	}
	return undefined;
}

function getKeyPlacement(model: Model<Api>, options?: BoschStreamOptions): BoschGatewayKeyPlacement {
	const metadata = options?.metadata?.boschLlmFarm;
	if (typeof metadata === "object" && metadata !== null) {
		const placement = (metadata as { keyPlacement?: unknown }).keyPlacement;
		const parsedPlacement = parseKeyPlacement(placement);
		if (parsedPlacement) {
			return parsedPlacement;
		}
	}
	const optionsPlacement = parseKeyPlacement(options?.headers?.[INTERNAL_KEY_PLACEMENT_HEADER]);
	if (optionsPlacement) {
		return optionsPlacement;
	}
	const modelPlacement = parseKeyPlacement(model.headers?.[INTERNAL_KEY_PLACEMENT_HEADER]);
	if (modelPlacement) {
		return modelPlacement;
	}
	return "authorization-gateway-header";
}

function getStreamingEnabled(model: Model<Api>, options?: BoschStreamOptions): boolean {
	if (options?.metadata?.boschLlmFarmStream === true) {
		return true;
	}
	const optionsStream = options?.headers?.[INTERNAL_STREAM_HEADER];
	if (optionsStream === "true") {
		return true;
	}
	const modelStream = model.headers?.[INTERNAL_STREAM_HEADER];
	return modelStream === "true";
}

function createPayload(
	model: Model<Api>,
	context: Context,
	gatewayKey: string,
	keyPlacement: BoschGatewayKeyPlacement,
	options?: BoschStreamOptions,
): BoschChatPayload {
	const payload: BoschChatPayload = {
		model: model.id,
		messages: convertMessages(context),
		stream: getStreamingEnabled(model, options),
		temperature: options?.temperature,
		max_tokens: options?.maxTokens ?? model.maxTokens,
		tools: convertTools(context.tools),
	};
	if (payload.tools && payload.tools.length > 0) {
		payload.tool_choice = "auto";
	}
	if (shouldIncludeBodyKey(keyPlacement)) {
		payload.gatewayKey = gatewayKey;
	}
	return payload;
}

function buildRequestHeaders(
	gatewayKey: string,
	keyPlacement: BoschGatewayKeyPlacement,
	options?: BoschStreamOptions,
): Record<string, string> {
	const headers: Record<string, string> = {};
	for (const [name, value] of Object.entries(options?.headers ?? {})) {
		if (value === null || value === undefined) {
			continue;
		}
		if (name.toLowerCase() === INTERNAL_KEY_PLACEMENT_HEADER) {
			continue;
		}
		if (name.toLowerCase() === INTERNAL_STREAM_HEADER) {
			continue;
		}
		if (name.toLowerCase() === "authorization" || name.toLowerCase() === "content-type") {
			continue;
		}
		headers[name] = value;
	}
	headers.Authorization = `Bearer ${gatewayKey}`;
	if (shouldIncludeGatewayKeyHeader(keyPlacement)) {
		headers.gatewayKey = gatewayKey;
	}
	headers["Content-Type"] = "application/json";
	return headers;
}

function redactSecret(text: string, secret: string): string {
	if (!secret) {
		return text;
	}
	return text.split(secret).join("[REDACTED]");
}

function getErrorCode(error: Error): string | undefined {
	if (!("code" in error) || typeof error.code !== "string") {
		return undefined;
	}
	return error.code;
}

export function formatBoschRequestError(error: unknown): string {
	if (!(error instanceof Error)) {
		return String(error);
	}

	const cause = error.cause;
	if (!(cause instanceof Error)) {
		return error.message;
	}

	const causeCode = getErrorCode(cause);
	if (causeCode && TLS_CERTIFICATE_ERROR_CODES.has(causeCode)) {
		return `Bosch LLM Farm TLS certificate verification failed (${causeCode}): ${cause.message}`;
	}

	return `${error.message}: ${cause.message}`;
}

async function responseError(response: Response, gatewayKey: string): Promise<Error> {
	const body = await response.text().catch(() => "");
	return new Error(redactSecret(`Bosch LLM Farm request failed: ${response.status} ${body}`, gatewayKey));
}

function updateUsageFromProvider(output: AssistantMessage, usage?: BoschNonStreamingResponse["usage"]): void {
	if (!usage) {
		return;
	}
	output.usage = createEmptyUsage(
		usage.prompt_tokens ?? 0,
		usage.completion_tokens ?? 0,
		usage.total_tokens ?? (usage.prompt_tokens ?? 0) + (usage.completion_tokens ?? 0),
	);
}

function mapFinishReason(reason: string | null | undefined): "stop" | "length" | "toolUse" {
	if (reason === "length") {
		return "length";
	}
	if (reason === "tool_calls" || reason === "function_call") {
		return "toolUse";
	}
	return "stop";
}

function pushText(output: AssistantMessage, stream: AssistantMessageEventStream, text: string): void {
	if (!text) {
		return;
	}
	const contentIndex = output.content.length;
	output.content.push({ type: "text", text });
	stream.push({ type: "text_start", contentIndex, partial: output });
	stream.push({ type: "text_delta", contentIndex, delta: text, partial: output });
	stream.push({ type: "text_end", contentIndex, content: text, partial: output });
}

function pushToolCall(output: AssistantMessage, stream: AssistantMessageEventStream, toolCall: BoschToolCall): void {
	const contentIndex = output.content.length;
	let parsedArguments: Record<string, unknown> = {};
	try {
		const parsed = JSON.parse(toolCall.function.arguments);
		if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
			parsedArguments = parsed as Record<string, unknown>;
		}
	} catch {}
	const block: ToolCall = {
		type: "toolCall",
		id: toolCall.id,
		name: toolCall.function.name,
		arguments: parsedArguments,
	};
	output.content.push(block);
	stream.push({ type: "toolcall_start", contentIndex, partial: output });
	stream.push({ type: "toolcall_end", contentIndex, toolCall: block, partial: output });
}

async function handleNonStreamingResponse(
	response: Response,
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
): Promise<void> {
	const data = (await response.json()) as BoschNonStreamingResponse;
	const choice = data.choices?.[0];
	output.responseId = data.id;
	output.responseModel = data.model;
	updateUsageFromProvider(output, data.usage);
	stream.push({ type: "start", partial: output });
	pushText(output, stream, choice?.message?.content ?? "");
	for (const toolCall of choice?.message?.tool_calls ?? []) {
		pushToolCall(output, stream, toolCall);
	}
	output.stopReason = mapFinishReason(choice?.finish_reason);
	stream.push({ type: "done", reason: output.stopReason, message: output });
	stream.end();
}

async function readSseLines(response: Response): Promise<string[]> {
	const text = await response.text();
	return text
		.split(/\r?\n/)
		.map((line) => line.trim())
		.filter((line) => line.startsWith("data:"))
		.map((line) => line.slice("data:".length).trim());
}

function getStreamingToolCall(
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
	toolCalls: Map<number, StreamingToolCall>,
	index: number,
	id?: string,
	name?: string,
): StreamingToolCall {
	const existing = toolCalls.get(index);
	if (existing) {
		if (id) existing.id = id;
		if (name) existing.name = name;
		return existing;
	}
	const block: StreamingToolCall = {
		type: "toolCall",
		id: id || `tool_call_${index}`,
		name: name || "",
		arguments: {},
		streamIndex: index,
		partialArguments: "",
	};
	const contentIndex = output.content.length;
	output.content.push(block);
	toolCalls.set(index, block);
	stream.push({ type: "toolcall_start", contentIndex, partial: output });
	return block;
}

async function handleStreamingResponse(
	response: Response,
	output: AssistantMessage,
	stream: AssistantMessageEventStream,
): Promise<void> {
	stream.push({ type: "start", partial: output });
	let textIndex: number | undefined;
	const toolCalls = new Map<number, StreamingToolCall>();

	for (const line of await readSseLines(response)) {
		if (line === "[DONE]") {
			break;
		}
		const chunk = JSON.parse(line) as BoschStreamingChunk;
		updateUsageFromProvider(output, chunk.usage);
		if (chunk.model) {
			output.responseModel = chunk.model;
		}
		const choice = chunk.choices?.[0];
		if (!choice) {
			continue;
		}
		if (choice.delta?.content) {
			if (textIndex === undefined) {
				textIndex = output.content.length;
				output.content.push({ type: "text", text: "" });
				stream.push({ type: "text_start", contentIndex: textIndex, partial: output });
			}
			const block = output.content[textIndex];
			if (block?.type === "text") {
				block.text += choice.delta.content;
				stream.push({ type: "text_delta", contentIndex: textIndex, delta: choice.delta.content, partial: output });
			}
		}
		for (const deltaToolCall of choice.delta?.tool_calls ?? []) {
			const index = deltaToolCall.index ?? 0;
			const block = getStreamingToolCall(
				output,
				stream,
				toolCalls,
				index,
				deltaToolCall.id,
				deltaToolCall.function?.name,
			);
			if (deltaToolCall.function?.arguments) {
				block.partialArguments += deltaToolCall.function.arguments;
				const contentIndex = output.content.indexOf(block);
				stream.push({
					type: "toolcall_delta",
					contentIndex,
					delta: deltaToolCall.function.arguments,
					partial: output,
				});
			}
		}
		if (choice.finish_reason) {
			output.stopReason = mapFinishReason(choice.finish_reason);
		}
	}

	if (textIndex !== undefined) {
		const block = output.content[textIndex];
		if (block?.type === "text") {
			stream.push({ type: "text_end", contentIndex: textIndex, content: block.text, partial: output });
		}
	}
	for (const block of toolCalls.values()) {
		try {
			const parsed = JSON.parse(block.partialArguments);
			if (typeof parsed === "object" && parsed !== null && !Array.isArray(parsed)) {
				block.arguments = parsed as Record<string, unknown>;
			}
		} catch {}
		const contentIndex = output.content.indexOf(block);
		const finalBlock: ToolCall = {
			type: "toolCall",
			id: block.id,
			name: block.name,
			arguments: block.arguments,
		};
		output.content[contentIndex] = finalBlock;
		stream.push({ type: "toolcall_end", contentIndex, toolCall: finalBlock, partial: output });
	}
	const doneReason = output.stopReason === "length" || output.stopReason === "toolUse" ? output.stopReason : "stop";
	stream.push({
		type: "done",
		reason: doneReason,
		message: output,
	});
	stream.end();
}

export function streamBoschLlmFarm(
	model: Model<Api>,
	context: Context,
	options?: BoschStreamOptions,
): AssistantMessageEventStream {
	const stream = createAssistantMessageEventStream();
	const output = createAssistantMessage(model);

	(async () => {
		try {
			const gatewayKey = options?.apiKey?.trim();
			if (!gatewayKey) {
				throw new Error("No Bosch LLM Farm gateway key. Run /login bosch-llmfarm.");
			}
			const keyPlacement = getKeyPlacement(model, options);
			const payload = createPayload(model, context, gatewayKey, keyPlacement, options);
			const nextPayload = await options?.onPayload?.(payload, model);
			const requestPayload = nextPayload ?? payload;
			const requestFetch = options?.fetch ?? fetch;
			const requestUrl = buildBoschChatCompletionsUrl(model.baseUrl, gatewayKey, keyPlacement);
			if (!options?.fetch && new URL(requestUrl).protocol === "https:") {
				ensureBoschSystemCa();
			}
			const response = await requestFetch(requestUrl, {
				method: "POST",
				headers: buildRequestHeaders(gatewayKey, keyPlacement, options),
				body: JSON.stringify(requestPayload),
				signal: options?.signal,
			});
			await options?.onResponse?.(
				{ status: response.status, headers: Object.fromEntries(response.headers.entries()) },
				model,
			);
			if (!response.ok) {
				throw await responseError(response, gatewayKey);
			}
			if ((requestPayload as BoschChatPayload).stream) {
				await handleStreamingResponse(response, output, stream);
			} else {
				await handleNonStreamingResponse(response, output, stream);
			}
		} catch (error) {
			output.stopReason = options?.signal?.aborted ? "aborted" : "error";
			output.errorMessage = redactSecret(formatBoschRequestError(error), options?.apiKey ?? "");
			stream.push({
				type: "error",
				reason: output.stopReason,
				error: output,
			});
			stream.end();
		}
	})();

	return stream;
}

const placeholderModel: BoschModelConfig = {
	id: "configure-first",
	name: "Configure Bosch LLM Farm first",
	contextWindow: 8192,
	maxTokens: 1024,
	input: ["text"],
	reasoning: false,
};

export function registerBoschLlmFarmProvider(pi: AscetExtensionAPI): void {
	if (!pi.registerProvider) {
		return;
	}

	pi.registerProvider(BOSCH_LLMFARM_PROVIDER_ID, {
		name: "Bosch LLM Farm",
		baseUrl: DEFAULT_BASE_URL,
		api: BOSCH_LLMFARM_API,
		models: [
			{
				...placeholderModel,
				cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
			},
		],
		oauth: {
			name: "Bosch LLM Farm",
			loginMethodLabel: "Use Bosch LLM Farm",
			login: loginBoschLlmFarm,
			refreshToken: refreshBoschLlmFarmToken,
			getApiKey: (credentials) => credentials.access,
			modifyModels: applyBoschConfiguredModels,
		},
		streamSimple: streamBoschLlmFarm,
	});
}

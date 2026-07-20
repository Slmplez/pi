import { Type } from "typebox";
import { streamSimple as streamSimpleCompat } from "../packages/ai/src/compat.ts";
import type { AssistantMessageEvent, Context, ImageContent, Model, Tool } from "../packages/ai/src/types.ts";
import {
	applyBoschConfiguredModels,
	type BoschGatewayKeyPlacement,
	BOSCH_LLMFARM_PROVIDER_ID,
	handleBoschBeforeProviderHeaders,
	handleBoschBeforeProviderRequest,
	streamBoschLlmFarm,
} from "../packages/ascet-extension/src/bosch-llmfarm-provider.ts";

function parseKeyPlacement(value: string): BoschGatewayKeyPlacement {
	if (
		value === "authorization-gateway-header" ||
		value === "header-query-body" ||
		value === "header-only" ||
		value === "header-body" ||
		value === "header-query"
	) {
		return value;
	}
	throw new Error(
		`Invalid BOSCH_LLMFARM_KEY_PLACEMENT: ${value}. Use header-body, authorization-gateway-header, header-query-body, header-only, or header-query.`,
	);
}

async function main(): Promise<void> {
	const baseUrl = process.env.BOSCH_LLMFARM_BASE_URL;
	const gatewayKey = process.env.BOSCH_LLMFARM_GATEWAY_KEY;
	const modelId = process.env.BOSCH_LLMFARM_MODEL;
	const prompt = process.env.BOSCH_LLMFARM_PROMPT ?? "Say exactly: pong";
	const imageBase64 = process.env.BOSCH_LLMFARM_IMAGE_BASE64;
	const imageMimeType = process.env.BOSCH_LLMFARM_IMAGE_MIME ?? "image/png";
	const toolSmoke = process.env.BOSCH_LLMFARM_TOOL_SMOKE === "1";
	const timeoutMs = Number.parseInt(process.env.BOSCH_LLMFARM_TIMEOUT_MS ?? "120000", 10);
	const rawKeyPlacement = process.env.BOSCH_LLMFARM_KEY_PLACEMENT ?? "authorization-gateway-header";

	if (!baseUrl || !gatewayKey || !modelId) {
		console.log(
			JSON.stringify(
				{
					ok: true,
					skipped: true,
					reason:
						"Set BOSCH_LLMFARM_BASE_URL, BOSCH_LLMFARM_GATEWAY_KEY, and BOSCH_LLMFARM_MODEL to run the live Bosch LLM Farm smoke.",
					requiredEnv: ["BOSCH_LLMFARM_BASE_URL", "BOSCH_LLMFARM_GATEWAY_KEY", "BOSCH_LLMFARM_MODEL"],
					optionalEnv: [
						"BOSCH_LLMFARM_PROMPT",
						"BOSCH_LLMFARM_IMAGE_BASE64",
						"BOSCH_LLMFARM_IMAGE_MIME",
						"BOSCH_LLMFARM_TOOL_SMOKE",
						"BOSCH_LLMFARM_TIMEOUT_MS",
						"BOSCH_LLMFARM_CONTEXT_WINDOW",
						"BOSCH_LLMFARM_MAX_TOKENS",
						"BOSCH_LLMFARM_KEY_PLACEMENT",
					],
				},
				null,
				2,
			),
		);
		process.exitCode = 0;
		return;
	}

	const keyPlacement = parseKeyPlacement(rawKeyPlacement);
	const model = applyBoschConfiguredModels([], {
		access: gatewayKey,
		refresh: "",
		expires: 4102444800000,
		baseUrl,
		keyPlacement,
		models: [
			{
				id: modelId,
				name: modelId,
				contextWindow: Number.parseInt(process.env.BOSCH_LLMFARM_CONTEXT_WINDOW ?? "128000", 10),
				maxTokens: Number.parseInt(process.env.BOSCH_LLMFARM_MAX_TOKENS ?? "1024", 10),
				input: ["text", "image"],
				reasoning: true,
			},
		],
	})[0] as Model<"openai-completions" | "bosch-llmfarm-api">;

	const inputContent: Context["messages"][number] extends { content: infer T } ? T : never = imageBase64
		? [
				{ type: "text", text: prompt },
				{ type: "image", data: imageBase64, mimeType: imageMimeType } satisfies ImageContent,
			]
		: prompt;

	const tools: Tool[] | undefined = toolSmoke
		? [
				{
					name: "bosch_live_smoke_echo",
					description: "Echo a short string for Bosch LLM Farm live smoke validation.",
					parameters: Type.Object({ value: Type.String() }),
				},
			]
		: undefined;

	const context: Context = {
		systemPrompt: "You are a concise live smoke test assistant.",
		messages: [{ role: "user", content: inputContent, timestamp: Date.now() }],
		tools,
	};

	const controller = new AbortController();
	const timeout = setTimeout(() => controller.abort(), timeoutMs);
	const events: AssistantMessageEvent[] = [];
	const startedAt = Date.now();

	try {
		const headers = { ...(model.headers ?? {}) };
		await handleBoschBeforeProviderHeaders(
			{ type: "before_provider_headers", headers },
			{
				model,
				modelRegistry: { getApiKeyForProvider: async () => gatewayKey },
			},
		);
		const stream =
			model.api === "openai-completions"
				? streamSimpleCompat(model, context, {
						apiKey: gatewayKey,
						signal: controller.signal,
						headers,
						onPayload: (payload) =>
							handleBoschBeforeProviderRequest(
								{ type: "before_provider_request", payload },
								{
									model,
									modelRegistry: { getApiKeyForProvider: async () => gatewayKey },
								},
							),
					})
				: streamBoschLlmFarm(model, context, {
						apiKey: gatewayKey,
						signal: controller.signal,
					});

		for await (const event of stream) {
			events.push(event);
		}
		const message = await stream.result();
		const text = message.content
			.filter((block) => block.type === "text")
			.map((block) => block.text)
			.join("");
		const toolCalls = message.content.filter((block) => block.type === "toolCall");
		const thinkingBlocks = message.content.filter((block) => block.type === "thinking");

		console.log(
			JSON.stringify(
				{
					ok: message.stopReason !== "error" && message.stopReason !== "aborted",
					provider: BOSCH_LLMFARM_PROVIDER_ID,
					api: model.api,
					model: model.id,
					baseUrl: model.baseUrl,
					keyPlacement,
					requestShape: {
						authorizationBearer: true,
						acceptTextEventStream: true,
						gatewayKeyHeader: keyPlacement === "authorization-gateway-header",
						gatewayKeyQuery: keyPlacement === "header-query-body" || keyPlacement === "header-query",
						gatewayKeyBody: keyPlacement === "header-body" || keyPlacement === "header-query-body",
					},
					stopReason: message.stopReason,
					errorMessage: message.errorMessage,
					responseId: message.responseId,
					responseModel: message.responseModel,
					usage: message.usage,
					durationMs: Date.now() - startedAt,
					events: {
						count: events.length,
						textDeltas: events.filter((event) => event.type === "text_delta").length,
						thinkingDeltas: events.filter((event) => event.type === "thinking_delta").length,
						toolCallDeltas: events.filter((event) => event.type === "toolcall_delta").length,
					},
					features: {
						text: text.length > 0,
						image: imageBase64 !== undefined,
						toolSmoke,
						toolCalls: toolCalls.length,
						thinkingBlocks: thinkingBlocks.length,
					},
					textPreview: text.slice(0, 400),
				},
				null,
				2,
			),
		);
		process.exitCode = message.stopReason === "error" || message.stopReason === "aborted" ? 1 : 0;
	} catch (error) {
		console.error(
			JSON.stringify(
				{
					ok: false,
					provider: BOSCH_LLMFARM_PROVIDER_ID,
					api: model.api,
					model: model.id,
					baseUrl: model.baseUrl,
					keyPlacement,
					durationMs: Date.now() - startedAt,
					error: error instanceof Error ? error.message : String(error),
				},
				null,
				2,
			),
		);
		process.exitCode = 1;
	} finally {
		clearTimeout(timeout);
	}
}

await main();

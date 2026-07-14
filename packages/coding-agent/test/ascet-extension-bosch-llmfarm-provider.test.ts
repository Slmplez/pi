import { existsSync, mkdirSync, rmSync } from "node:fs";
import { createServer } from "node:http";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, expect, it, vi } from "vitest";
import type { OAuthLoginCallbacks } from "../../ai/src/oauth.ts";
import { getOAuthProvider } from "../../ai/src/oauth.ts";
import type { Context, Model } from "../../ai/src/types.ts";
import type { BoschLlmFarmCredentials } from "../../ascet-extension/src/bosch-llmfarm-provider.ts";
import {
	applyBoschConfiguredModels,
	BOSCH_LLMFARM_PROVIDER_ID,
	buildBoschChatCompletionsUrl,
	loginBoschLlmFarm,
	normalizeBoschBaseUrl,
	streamBoschLlmFarm,
} from "../../ascet-extension/src/bosch-llmfarm-provider.ts";
import ascetExtension from "../../ascet-extension/src/index.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { ModelRegistry } from "../src/core/model-registry.ts";
import type { AuthSelectorProvider } from "../src/modes/interactive/components/oauth-selector.ts";
import { InteractiveMode } from "../src/modes/interactive/interactive-mode.ts";

const farFuture = 4102444800000;

function createCallbacks(answers: string[]): OAuthLoginCallbacks {
	const queue = [...answers];
	return {
		onAuth: vi.fn(),
		onDeviceCode: vi.fn(),
		onProgress: vi.fn(),
		onManualCodeInput: vi.fn(),
		onSelect: vi.fn(async (prompt) => prompt.options[0]?.id),
		onPrompt: vi.fn(async () => {
			const next = queue.shift();
			if (next === undefined) {
				throw new Error("No prompt answer queued");
			}
			return next;
		}),
	};
}

function createModel(id = "bosch-chat"): Model<"bosch-llmfarm-api"> {
	return {
		id,
		name: id,
		api: "bosch-llmfarm-api",
		provider: BOSCH_LLMFARM_PROVIDER_ID,
		baseUrl: "https://gateway.example.com/openapi/service/v1",
		reasoning: false,
		input: ["text"],
		cost: { input: 0, output: 0, cacheRead: 0, cacheWrite: 0 },
		contextWindow: 64000,
		maxTokens: 4096,
	};
}

const textContext: Context = {
	systemPrompt: "You are a helpful assistant.",
	messages: [{ role: "user", content: "Say ping", timestamp: 0 }],
};

describe("bosch-llmfarm provider", () => {
	it("normalizes Bosch endpoint variants to the v1 base URL and extracts query gatewayKey", () => {
		expect(
			normalizeBoschBaseUrl(
				"https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1/chat/completions?gatewayKey=secret",
			),
		).toEqual({
			baseUrl: "https://apiroutecccn.apac.bosch.com/openapi/aigatewayprod/bdo-llmfarm-llm/v1",
			gatewayKey: "secret",
		});

		expect(normalizeBoschBaseUrl("https://gateway.example.com/path/v1/")).toEqual({
			baseUrl: "https://gateway.example.com/path/v1",
		});
	});

	it("collects endpoint, gateway key, multiple model configs, and default key placement during login", async () => {
		const credentials = (await loginBoschLlmFarm(
			createCallbacks([
				"https://gateway.example.com/openapi/service/v1/chat/completions?gatewayKey=query-key",
				"manual-key",
				"alpha, beta",
				"128000",
				"8192",
				"text",
				"false",
				"false",
				"200000",
				"16384",
				"text+image",
				"true",
				"true",
			]),
		)) as BoschLlmFarmCredentials;

		expect(credentials).toMatchObject({
			access: "manual-key",
			refresh: "",
			expires: farFuture,
			baseUrl: "https://gateway.example.com/openapi/service/v1",
			keyPlacement: "authorization-gateway-header",
			models: [
				{
					id: "alpha",
					name: "alpha",
					contextWindow: 128000,
					maxTokens: 8192,
					input: ["text"],
					reasoning: false,
					streaming: false,
				},
				{
					id: "beta",
					name: "beta",
					contextWindow: 200000,
					maxTokens: 16384,
					input: ["text", "image"],
					reasoning: true,
					streaming: true,
				},
			],
		});
	});

	it("replaces placeholder models with configured Bosch models", () => {
		const models = applyBoschConfiguredModels([createModel("configure-first")], {
			access: "secret",
			refresh: "",
			expires: farFuture,
			baseUrl: "https://gateway.example.com/openapi/service/v1",
			keyPlacement: "header-query-body",
			models: [
				{
					id: "alpha",
					name: "Alpha",
					contextWindow: 128000,
					maxTokens: 8192,
					input: ["text"],
					reasoning: false,
				},
			],
		});

		expect(models).toHaveLength(1);
		expect(models[0]).toMatchObject({
			id: "alpha",
			name: "Alpha",
			provider: BOSCH_LLMFARM_PROVIDER_ID,
			api: "bosch-llmfarm-api",
			baseUrl: "https://gateway.example.com/openapi/service/v1",
			contextWindow: 128000,
			maxTokens: 8192,
		});
	});

	it("builds the chat completions URL with gatewayKey query only when configured", () => {
		expect(
			buildBoschChatCompletionsUrl("https://gateway.example.com/v1", "secret", "authorization-gateway-header"),
		).toBe("https://gateway.example.com/v1/chat/completions");
		expect(buildBoschChatCompletionsUrl("https://gateway.example.com/v1", "secret", "header-query-body")).toBe(
			"https://gateway.example.com/v1/chat/completions?gatewayKey=secret",
		);
		expect(buildBoschChatCompletionsUrl("https://gateway.example.com/v1", "secret", "header-only")).toBe(
			"https://gateway.example.com/v1/chat/completions",
		);
	});

	it("sends gatewayKey in query, bearer header, and body, then emits non-streaming text", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(
				JSON.stringify({
					choices: [{ message: { role: "assistant", content: "pong" }, finish_reason: "stop" }],
					usage: { prompt_tokens: 3, completion_tokens: 1, total_tokens: 4 },
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		});

		const stream = streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			metadata: {
				boschLlmFarm: {
					keyPlacement: "header-query-body",
				},
			},
			fetch: fetchMock,
		});
		const result = await stream.result();

		expect(result.stopReason).toBe("stop");
		expect(result.content).toEqual([{ type: "text", text: "pong" }]);
		expect(requests).toHaveLength(1);
		expect(requests[0]!.url).toBe(
			"https://gateway.example.com/openapi/service/v1/chat/completions?gatewayKey=secret-key",
		);
		expect(requests[0]!.init.headers).toMatchObject({
			Authorization: "Bearer secret-key",
			"Content-Type": "application/json",
		});
		expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({
			model: "alpha",
			gatewayKey: "secret-key",
			stream: false,
		});
	});

	it("defaults to the successful OpenAI SDK Bosch gateway auth shape", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(
				JSON.stringify({
					choices: [{ message: { role: "assistant", content: "pong" }, finish_reason: "stop" }],
				}),
				{ status: 200, headers: { "content-type": "application/json" } },
			);
		});

		const result = await streamBoschLlmFarm(createModel("gpt-5.5"), textContext, {
			apiKey: "secret-key",
			fetch: fetchMock,
		}).result();

		expect(result.content).toEqual([{ type: "text", text: "pong" }]);
		expect(requests).toHaveLength(1);
		expect(requests[0]!.url).toBe("https://gateway.example.com/openapi/service/v1/chat/completions");
		expect(requests[0]!.init.headers).toMatchObject({
			Authorization: "Bearer secret-key",
			gatewayKey: "secret-key",
			"Content-Type": "application/json",
		});
		expect(JSON.parse(String(requests[0]!.init.body))).not.toHaveProperty("gatewayKey");
	});

	it("round trips through a local OpenAI-compatible gateway over fetch", async () => {
		const requests: Array<{
			url: string;
			authorization?: string;
			gatewayKey?: string | string[];
			contentType: string;
			body: unknown;
		}> = [];
		const server = createServer((req, res) => {
			let body = "";
			req.setEncoding("utf8");
			req.on("data", (chunk) => {
				body += chunk;
			});
			req.on("end", () => {
				requests.push({
					url: req.url ?? "",
					authorization: req.headers.authorization,
					gatewayKey: req.headers.gatewaykey,
					contentType: String(req.headers["content-type"] ?? ""),
					body: JSON.parse(body),
				});
				res.writeHead(200, { "content-type": "application/json" });
				res.end(
					JSON.stringify({
						id: "chatcmpl-local",
						model: "alpha",
						choices: [{ message: { content: "local pong" }, finish_reason: "stop" }],
						usage: { prompt_tokens: 5, completion_tokens: 2, total_tokens: 7 },
					}),
				);
			});
		});

		await new Promise<void>((resolve, reject) => {
			server.once("error", reject);
			server.listen(0, "127.0.0.1", () => {
				server.off("error", reject);
				resolve();
			});
		});

		try {
			const address = server.address();
			if (typeof address !== "object" || !address?.port) {
				throw new Error("Local gateway smoke server did not listen on a TCP port.");
			}
			const model = { ...createModel("alpha"), baseUrl: `http://127.0.0.1:${address.port}/openapi/service/v1` };

			const result = await streamBoschLlmFarm(model, textContext, {
				apiKey: "secret-key",
			}).result();

			expect(result.content).toEqual([{ type: "text", text: "local pong" }]);
			expect(result.usage.totalTokens).toBe(7);
			expect(requests).toHaveLength(1);
			expect(requests[0]?.url).toBe("/openapi/service/v1/chat/completions");
			expect(requests[0]?.authorization).toBe("Bearer secret-key");
			expect(requests[0]?.gatewayKey).toBe("secret-key");
			expect(requests[0]?.contentType).toContain("application/json");
			expect(requests[0]?.body).toMatchObject({
				model: "alpha",
				stream: false,
			});
			expect(requests[0]?.body).not.toHaveProperty("gatewayKey");
		} finally {
			await new Promise<void>((resolve, reject) => {
				server.close((error) => (error ? reject(error) : resolve()));
			});
		}
	});

	it("uses the configured model maxTokens as the default max_tokens payload", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(JSON.stringify({ choices: [{ message: { content: "pong" }, finish_reason: "stop" }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		const model = { ...createModel("alpha"), maxTokens: 1234 };

		await streamBoschLlmFarm(model, textContext, {
			apiKey: "secret-key",
			fetch: fetchMock,
		}).result();
		await streamBoschLlmFarm(model, textContext, {
			apiKey: "secret-key",
			maxTokens: 99,
			fetch: fetchMock,
		}).result();

		expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({ max_tokens: 1234 });
		expect(JSON.parse(String(requests[1]!.init.body))).toMatchObject({ max_tokens: 99 });
	});

	it("allows onPayload to inspect and replace the Bosch request payload", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(JSON.stringify({ choices: [{ message: { content: "pong" }, finish_reason: "stop" }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});
		const seenPayloads: unknown[] = [];
		const seenModels: string[] = [];

		await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			onPayload: (payload, model) => {
				seenPayloads.push(payload);
				seenModels.push(model.id);
				return { ...(payload as Record<string, unknown>), temperature: 0.25 };
			},
			fetch: fetchMock,
		}).result();

		expect(seenModels).toEqual(["alpha"]);
		expect(seenPayloads[0]).toMatchObject({ model: "alpha", max_tokens: 4096 });
		expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({ model: "alpha", temperature: 0.25 });
	});

	it("uses key placement from registry request headers in the real streamSimple path", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(JSON.stringify({ choices: [{ message: { content: "pong" }, finish_reason: "stop" }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});

		const result = await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			headers: {
				"x-bosch-llmfarm-key-placement": "header-only",
			},
			fetch: fetchMock,
		}).result();

		expect(result.content).toEqual([{ type: "text", text: "pong" }]);
		expect(requests[0]!.url).toBe("https://gateway.example.com/openapi/service/v1/chat/completions");
		expect(JSON.parse(String(requests[0]!.init.body))).not.toHaveProperty("gatewayKey");
	});

	it("forwards custom registry request headers without leaking internal key-placement headers", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(JSON.stringify({ choices: [{ message: { content: "pong" }, finish_reason: "stop" }] }), {
				status: 200,
				headers: { "content-type": "application/json" },
			});
		});

		await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			headers: {
				"x-bosch-llmfarm-key-placement": "header-only",
				"x-bosch-llmfarm-stream": "true",
				"x-correlation-id": "trace-123",
				"Content-Type": "application/vnd.custom+json",
			},
			fetch: fetchMock,
		}).result();

		expect(requests[0]!.init.headers).toMatchObject({
			Authorization: "Bearer secret-key",
			"Content-Type": "application/json",
			"x-correlation-id": "trace-123",
		});
		expect(requests[0]!.init.headers).not.toHaveProperty("x-bosch-llmfarm-key-placement");
		expect(requests[0]!.init.headers).not.toHaveProperty("x-bosch-llmfarm-stream");
	});

	it("parses Bosch streaming SSE text when streaming is enabled", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response(
				[
					'data: {"choices":[{"delta":{"content":"pin"},"finish_reason":null}]}',
					'data: {"choices":[{"delta":{"content":"g"},"finish_reason":"stop"}],"usage":{"prompt_tokens":2,"completion_tokens":1,"total_tokens":3}}',
					"data: [DONE]",
					"",
				].join("\n"),
				{ status: 200, headers: { "content-type": "text/event-stream" } },
			);
		});

		const result = await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			metadata: {
				boschLlmFarmStream: true,
				boschLlmFarm: { keyPlacement: "header-only" },
			},
			fetch: fetchMock,
		}).result();

		expect(result.content).toEqual([{ type: "text", text: "ping" }]);
		expect(result.usage.totalTokens).toBe(3);
		expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({ stream: true });
		expect(requests[0]!.url).toBe("https://gateway.example.com/openapi/service/v1/chat/completions");
	});

	it("redacts gatewayKey from provider errors", async () => {
		const fetchMock = vi.fn(async () => {
			return new Response("bad secret-key failure", { status: 403 });
		});

		const result = await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			fetch: fetchMock,
		}).result();

		expect(result.stopReason).toBe("error");
		expect(result.errorMessage).toContain("[REDACTED]");
		expect(result.errorMessage).not.toContain("secret-key");
	});

	it("registers Bosch provider and exposes login-configured models after registry refresh", async () => {
		const tempDir = join(tmpdir(), `pi-test-bosch-llmfarm-${Date.now()}-${Math.random().toString(36).slice(2)}`);
		mkdirSync(tempDir, { recursive: true });
		try {
			const authStorage = AuthStorage.create(join(tempDir, "auth.json"));
			const registry = ModelRegistry.create(authStorage, join(tempDir, "models.json"));

			ascetExtension({
				registerTool: vi.fn(),
				sendUserMessage: vi.fn(),
				registerCommand: vi.fn(),
				registerProvider: (name, config) => registry.registerProvider(name, config),
			});

			expect(getOAuthProvider(BOSCH_LLMFARM_PROVIDER_ID)?.loginMethodLabel).toBe("Use Bosch LLM Farm");

			await authStorage.login(
				BOSCH_LLMFARM_PROVIDER_ID,
				createCallbacks([
					"https://gateway.example.com/openapi/service/v1",
					"secret-key",
					"alpha, beta",
					"64000",
					"4096",
					"text",
					"false",
					"false",
					"128000",
					"8192",
					"text+image",
					"true",
					"true",
				]),
			);
			registry.refresh();

			const boschModels = registry.getAll().filter((model) => model.provider === BOSCH_LLMFARM_PROVIDER_ID);
			expect(boschModels.map((model) => model.id)).toEqual(["alpha", "beta"]);
			expect(boschModels[0]).toMatchObject({
				api: "bosch-llmfarm-api",
				baseUrl: "https://gateway.example.com/openapi/service/v1",
				contextWindow: 64000,
				maxTokens: 4096,
			});
			expect(await registry.getApiKeyForProvider(BOSCH_LLMFARM_PROVIDER_ID)).toBe("secret-key");
		} finally {
			if (existsSync(tempDir)) {
				rmSync(tempDir, { recursive: true });
			}
		}
	});

	it("exposes Bosch LLM Farm as a real /login provider option after extension registration", () => {
		const tempDir = join(
			tmpdir(),
			`pi-test-bosch-login-options-${Date.now()}-${Math.random().toString(36).slice(2)}`,
		);
		mkdirSync(tempDir, { recursive: true });
		try {
			const authStorage = AuthStorage.create(join(tempDir, "auth.json"));
			const registry = ModelRegistry.create(authStorage, join(tempDir, "models.json"));

			ascetExtension({
				registerTool: vi.fn(),
				sendUserMessage: vi.fn(),
				registerCommand: vi.fn(),
				registerProvider: (name, config) => registry.registerProvider(name, config),
			});

			const getLoginProviderOptions = (
				InteractiveMode as unknown as {
					prototype: {
						getLoginProviderOptions(this: { session: { modelRegistry: ModelRegistry } }): AuthSelectorProvider[];
					};
				}
			).prototype.getLoginProviderOptions;
			const options = getLoginProviderOptions.call({ session: { modelRegistry: registry } });

			expect(options).toContainEqual({
				id: BOSCH_LLMFARM_PROVIDER_ID,
				name: "Bosch LLM Farm",
				authType: "oauth",
				loginMethodLabel: "Use Bosch LLM Farm",
			});
		} finally {
			if (existsSync(tempDir)) {
				rmSync(tempDir, { recursive: true });
			}
		}
	});

	it("uses per-model streaming support from registry request headers", async () => {
		const requests: Array<{ url: string; init: RequestInit }> = [];
		const fetchMock = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
			requests.push({ url: String(url), init: init ?? {} });
			return new Response("data: [DONE]\n", { status: 200, headers: { "content-type": "text/event-stream" } });
		});

		await streamBoschLlmFarm(createModel("alpha"), textContext, {
			apiKey: "secret-key",
			headers: {
				"x-bosch-llmfarm-key-placement": "header-only",
				"x-bosch-llmfarm-stream": "true",
			},
			fetch: fetchMock,
		}).result();

		expect(JSON.parse(String(requests[0]!.init.body))).toMatchObject({ stream: true });
	});
});

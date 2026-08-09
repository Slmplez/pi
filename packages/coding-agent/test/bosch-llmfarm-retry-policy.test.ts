import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
	BOSCH_LLMFARM_PROVIDER_ID,
	BOSCH_LLMFARM_PROVIDER_RETRY_DEFAULTS,
	registerBoschLlmFarmProvider,
} from "../../ascet-extension/src/bosch-llmfarm-provider.ts";
import { AuthStorage } from "../src/core/auth-storage.ts";
import { ModelRegistry } from "../src/core/model-registry.ts";

describe("Bosch LLM Farm retry policy", () => {
	let tempDir: string;

	beforeEach(() => {
		tempDir = mkdtempSync(join(tmpdir(), "pi-bosch-retry-policy-"));
	});

	afterEach(() => {
		rmSync(tempDir, { recursive: true, force: true });
	});

	it("registers effective provider-scoped retry defaults in the real model registry", () => {
		const authStorage = AuthStorage.create(join(tempDir, "auth.json"));
		const modelRegistry = ModelRegistry.create(authStorage, join(tempDir, "models.json"));

		registerBoschLlmFarmProvider({
			registerTool: vi.fn(),
			sendUserMessage: vi.fn(),
			registerCommand: vi.fn(),
			registerProvider: (name, config) => modelRegistry.registerProvider(name, config),
		});

		expect(modelRegistry.getProviderRetryDefaults(BOSCH_LLMFARM_PROVIDER_ID)).toEqual(
			BOSCH_LLMFARM_PROVIDER_RETRY_DEFAULTS,
		);
	});
});

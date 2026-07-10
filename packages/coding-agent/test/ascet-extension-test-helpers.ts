import { resolve } from "node:path";
import { expect } from "vitest";
import { loadExtensions } from "../src/core/extensions/loader.ts";

export const repoRoot = resolve(__dirname, "../../..");
export const ascetAgentRoot = resolve(repoRoot, "..");
export const ascetExtensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");

export async function loadAscetExtension() {
	const result = await loadExtensions([ascetExtensionPath], repoRoot);
	expect(result.errors).toEqual([]);

	const ascetExtension = result.extensions.find((extension) =>
		extension.path.replaceAll("\\", "/").endsWith("ascet/index.ts"),
	);
	expect(ascetExtension).toBeDefined();
	return ascetExtension;
}

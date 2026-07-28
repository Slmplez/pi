import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { ascetExploreParameters } from "./schema.ts";

describe("ascet_explore", () => {
	test("exposes only the indexed list_components action", () => {
		const variants =
			(ascetExploreParameters as { anyOf?: Array<{ properties?: Record<string, unknown> }> }).anyOf ?? [];
		assert.equal(variants.length, 1);
		const properties = variants[0]?.properties ?? {};
		const action = properties.action as { const?: string; enum?: string[] } | undefined;
		assert.equal(action?.const ?? action?.enum?.[0], "list_components");
		assert.ok(properties.folderPath);
		assert.ok(properties.kind);
		assert.ok(properties.languageKind);
		assert.equal(properties.componentPath, undefined);
	});
});

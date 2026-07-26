import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { ascetCapabilitiesTool } from "./capabilities/definition.ts";
import { ascetCapabilitiesParameters } from "./capabilities/schema.ts";
import { runAscetCapabilities } from "./capabilities.ts";

function withTempCwd<T>(run: (cwd: string) => T): T {
	const root = mkdtempSync(join(tmpdir(), "pi-ascet-capabilities-"));
	try {
		return run(root);
	} finally {
		rmSync(root, { recursive: true, force: true });
	}
}

describe("runAscetCapabilities", () => {
	test("schema exposes only the search_actions action", () => {
		const text = JSON.stringify(ascetCapabilitiesParameters);

		assert.match(text, /"search_actions"/);
		assert.doesNotMatch(text, /"activate_profile"/);
		assert.doesNotMatch(text, /"operationQuery"/);
		assert.doesNotMatch(text, /"family"/);
	});

	test("search_actions returns full action details from ActionCatalog without cli-catalog.json", () => {
		withTempCwd((cwd) => {
			const result = runAscetCapabilities(
				{ action: "search_actions", query: "complete code", limit: 1 },
				{ cwd, env: {} },
			);

			assert.equal(result.ok, true);
			assert.equal(result.actionSearch?.items.length, 1);
			assert.equal(result.actionSearch?.items[0]?.tool, "ascet_read");
			assert.equal(result.actionSearch?.items[0]?.action, "read_code");
			assert.deepEqual(result.actionSearch?.items[0]?.schema?.required, ["action", "componentPath"]);
			assert.ok((result.actionSearch?.items[0]?.rules ?? []).length > 0);
			assert.ok((result.actionSearch?.items[0]?.fewShots ?? []).length > 0);
			assert.equal(result.actionSearch?.items[0]?.result?.shape, "codeText");
		});
	});

	test("search_actions tool payload is result-only compact JSON with callable fewShot args", async () => {
		await withTempCwd(async (cwd) => {
			const result = await ascetCapabilitiesTool.execute(
				"call-1",
				{ action: "search_actions", query: "code search", limit: 1 },
				new AbortController().signal,
				undefined,
				{ cwd },
			);
			const text = result.content[0]?.text ?? "";
			const payload = JSON.parse(text) as {
				total?: number;
				items?: Array<{
					tool?: string;
					action?: string;
					schema?: unknown;
					rules?: unknown;
					fewShots?: Array<{ args?: Record<string, unknown> }>;
				}>;
				activeProfile?: string;
				ok?: boolean;
				error?: unknown;
				meta?: unknown;
			};

			assert.equal(payload.activeProfile, undefined);
			assert.equal(payload.ok, undefined);
			assert.equal(payload.error, undefined);
			assert.equal(payload.meta, undefined);
			assert.equal(payload.items?.length, 1);
			assert.equal(payload.items?.[0]?.tool, "ascet_search");
			assert.equal(payload.items?.[0]?.action, "text_in_code");
			assert.ok(payload.items?.[0]?.schema);
			assert.ok(payload.items?.[0]?.rules);
			assert.ok(payload.items?.[0]?.fewShots);
			assert.deepEqual(Object.keys(payload.items?.[0]?.fewShots?.[0]?.args ?? {}).sort(), [
				"action",
				"componentPath",
				"limit",
				"query",
			]);
			assert.doesNotMatch(text, /"ok"|error|null|"meta"|"mode"|"operation":\s*"search"/);
			assert.equal(Object.hasOwn(result.details, "ok"), false);
			assert.equal(Object.hasOwn(result.details, "error"), false);
		});
	});

	test("search_actions exact lookup works with tool and name", () => {
		withTempCwd((cwd) => {
			const result = runAscetCapabilities(
				{ action: "search_actions", tool: "ascet_read", name: "read_code", limit: 5 },
				{ cwd, env: {} },
			);

			assert.equal(result.actionSearch?.total, 1);
			assert.equal(result.actionSearch?.items[0]?.tool, "ascet_read");
			assert.equal(result.actionSearch?.items[0]?.action, "read_code");
		});
	});

	test("search_actions hides internal actions unless includeHidden is explicit", () => {
		withTempCwd((cwd) => {
			const summary = runAscetCapabilities(
				{ action: "search_actions", query: "search_occurrences" },
				{ cwd, env: {} },
			);
			assert.equal(
				summary.actionSearch?.items.some((action) => action.action === "search_occurrences"),
				false,
			);

			const full = runAscetCapabilities(
				{ action: "search_actions", query: "search_occurrences", detailLevel: "full", includeHidden: true },
				{ cwd, env: {} },
			);
			const action = full.actionSearch?.items.find((item) => item.action === "search_occurrences");
			assert.equal(action?.visibility, "internal");
			assert.equal(action?.replacement, "ascet_search.references_to_element");
		});
	});
});

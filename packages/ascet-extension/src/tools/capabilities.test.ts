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

	test("search_actions tool payload is result-only compact JSON with callable Get fewShot args", async () => {
		await withTempCwd(async (cwd) => {
			const result = await ascetCapabilitiesTool.execute(
				"call-1",
				{ action: "search_actions", tool: "ascet_get", name: "tree", limit: 1 },
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
			assert.equal(payload.items?.[0]?.tool, "ascet_get");
			assert.equal(payload.items?.[0]?.action, "tree");
			assert.ok(payload.items?.[0]?.schema);
			assert.ok(payload.items?.[0]?.rules);
			assert.ok(payload.items?.[0]?.fewShots);
			assert.ok(Object.hasOwn(payload.items?.[0]?.fewShots?.[0]?.args ?? {}, "action"));
			assert.ok(Object.hasOwn(payload.items?.[0]?.fewShots?.[0]?.args ?? {}, "target"));
			assert.doesNotMatch(text, /"ok"|error|null|"meta"|"mode"|"operation":\s*"search"/);
			assert.equal(result.details.ok, true);
			assert.equal(result.details.error, undefined);
			assert.deepEqual(result.details.data, { result: result.details.result });
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

	test("search_actions does not return the retired ascet_verify action", () => {
		withTempCwd((cwd) => {
			const result = runAscetCapabilities(
				{ action: "search_actions", tool: "ascet_verify", name: "readback", limit: 5 },
				{ cwd, env: {} },
			);

			assert.equal(result.actionSearch?.total, 0);
			assert.deepEqual(result.actionSearch?.items, []);
		});
	});

	test("search_actions returns public Get actions without a retired discovery tool", () => {
		withTempCwd((cwd) => {
			const result = runAscetCapabilities(
				{ action: "search_actions", tool: "ascet_get", name: "import_binding", detailLevel: "full" },
				{ cwd, env: {} },
			);

			assert.equal(result.actionSearch?.total, 1);
			assert.equal(result.actionSearch?.items[0]?.tool, "ascet_get");
			assert.equal(result.actionSearch?.items[0]?.action, "import_binding");
			assert.equal(result.actionSearch?.items[0]?.visibility, undefined);
		});
	});
});

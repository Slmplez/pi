import assert from "node:assert/strict";
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { writeAscetInitArtifacts } from "./ascet-init-artifacts.ts";

describe("writeAscetInitArtifacts", () => {
	test("writes slash-normalized manifest and workspace summary", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-init-artifacts-"));
		try {
			const artifacts = await writeAscetInitArtifacts({
				cwd,
				scope: { ok: true, kind: "folder", value: "AEB\\Core" },
				now: new Date("2026-07-25T00:00:00.000Z"),
				index: {
					database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
					index: {
						status: "ready",
						mode: "core",
						fromCache: false,
						elapsedMs: 10,
						partitions: [
							{ name: "components", status: "ready", count: 2, scanComplete: true, fromCache: false },
							{ name: "text_code", status: "ready", count: 3, scanComplete: true, fromCache: false },
						],
					},
				},
			});

			assert.deepEqual(artifacts, {
				manifest: ".ascet/index/manifest.json",
				summary: ".ascet/ascet-workspace-summary.json",
			});
			const manifest = JSON.parse(readFileSync(join(cwd, artifacts.manifest), "utf8")) as {
				database?: { path?: string };
				index?: { partitions?: { components?: { count?: number } } };
			};
			const summary = JSON.parse(readFileSync(join(cwd, artifacts.summary), "utf8")) as {
				scope?: { path?: string };
				counts?: { text_code?: number };
				recommendedTools?: string[];
			};
			assert.equal(manifest.database?.path, "C:/ASCET/DemoDb");
			assert.equal(manifest.index?.partitions?.components?.count, 2);
			assert.equal(summary.scope?.path, "AEB/Core");
			assert.equal(summary.counts?.text_code, 3);
			assert.ok(summary.recommendedTools?.includes("ascet_search.text_in_code"));
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});

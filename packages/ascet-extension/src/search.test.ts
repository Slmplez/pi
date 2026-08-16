import assert from "node:assert/strict";
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { Value } from "typebox/value";
import type { AscetCliExecutionResult, AscetCliRequest } from "./cli.ts";
import {
	ascetSearchModes,
	ascetSearchParameters,
	normalizeAscetSearchResult,
	resolveAscetSearchPath,
	runAscetSearch,
} from "./search.ts";

describe("ascet_search", () => {
	test("uses one compact schema for all ten native modes", () => {
		assert.equal(ascetSearchModes.length, 10);
		for (const mode of ascetSearchModes) {
			assert.equal(Value.Check(ascetSearchParameters, { mode, q: "target" }), true, mode);
		}
		assert.equal(Value.Check(ascetSearchParameters, { mode: "unknown", q: "target" }), false);
		assert.equal(Value.Check(ascetSearchParameters, { mode: "element", q: "" }), false);
		assert.equal(Value.Check(ascetSearchParameters, { mode: "element", q: "target", limit: 0 }), false);
		assert.equal(Value.Check(ascetSearchParameters, { mode: "element", q: "target", extra: true }), false);
	});

	test("prefers the explicit search executable override", () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-path-"));
		try {
			const executable = join(root, "AscetSearch.exe");
			writeFileSync(executable, "", "utf8");
			assert.equal(resolveAscetSearchPath({ cwd: root, env: { ASCET_SEARCH_PATH: "AscetSearch.exe" } }), executable);
			assert.equal(existsSync(executable), true);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("runs the native CLI with bounded output and normalizes compact results", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-run-"));
		const executable = join(root, "AscetSearch.exe");
		writeFileSync(executable, "", "utf8");
		let captured: AscetCliRequest | undefined;
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
			captured = request;
			return {
				exitCode: 0,
				stdout: JSON.stringify({
					ok: true,
					mode: "element-ref",
					q: "PCA_Ctrl_slMin_RA",
					ui: true,
					count: 2,
					items: ["first"],
					ms: 12,
					waitMs: 3,
					more: true,
				}),
				stderr: "",
				timedOut: false,
				request,
			};
		};
		try {
			const params = { mode: "element-ref" as const, q: "PCA_Ctrl_slMin_RA", limit: 1 };
			const result = await runAscetSearch(params, {
				cwd: root,
				env: {
					ASCET_SEARCH_PATH: executable,
					PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
					PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
				},
				executeCli,
			});
			assert.deepEqual(captured?.args, ["element-ref", "PCA_Ctrl_slMin_RA", "-n", "1", "-t", "300000"]);
			assert.deepEqual(normalizeAscetSearchResult(params, result), {
				ok: true,
				data: {
					count: 2,
					items: ["first"],
					more: true,
					searchMs: 12,
					queueWaitMs: 3,
				},
			});
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("preserves native structured errors", () => {
		const normalized = normalizeAscetSearchResult(
			{ mode: "element", q: "target" },
			{
				ok: false,
				data: null,
				request: { cwd: ".", cliPath: "AscetSearch.exe", args: [] },
				stdout: "",
				stderr: JSON.stringify({ ok: false, code: "TimeoutException", error: "Search queue timed out." }),
				exitCode: 1,
				timedOut: false,
				error: { code: "ascet_cli_failed", message: "failed" },
			},
		);
		assert.deepEqual(normalized, {
			ok: false,
			error: { code: "TimeoutException", message: "Search queue timed out." },
		});
	});
});

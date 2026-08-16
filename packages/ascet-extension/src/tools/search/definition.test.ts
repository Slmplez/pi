import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { ascetSearchTool } from "./definition.ts";

describe("ascet_search tool", () => {
	test("returns only count, items, and conditional more to the agent", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-search-tool-"));
		const executable = join(root, "AscetSearch.exe");
		writeFileSync(executable, "", "utf8");
		const executeCli = async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => ({
			exitCode: 0,
			stdout: JSON.stringify({
				ok: true,
				mode: "text",
				q: "VLC3IsInControl",
				ui: true,
				count: 26,
				items: [{ component: "ADC", line: 1, code: "if(VLC3IsInControl)" }],
				ms: 100,
				waitMs: 4,
				more: true,
			}),
			stderr: "",
			timedOut: false,
			request,
		});
		try {
			const result = await ascetSearchTool.execute(
				"call-1",
				{ mode: "text", q: "VLC3IsInControl", limit: 1 },
				new AbortController().signal,
				undefined,
				{
					cwd: root,
					env: {
						ASCET_SEARCH_PATH: executable,
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
						PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
					},
					executeCli,
				},
			);
			assert.deepEqual(JSON.parse(result.content[0].text), {
				count: 26,
				items: [{ component: "ADC", line: 1, code: "if(VLC3IsInControl)" }],
				more: true,
			});
			assert.equal("data" in result.details, false);
			assert.deepEqual(result.details.diagnostics, { searchMs: 100, queueWaitMs: 4, exitCode: 0 });
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

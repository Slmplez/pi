import assert from "node:assert/strict";
import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { refreshAscetIndex } from "../../index-maintainer/refresh.ts";
import { ascetIndexTool } from "./definition.ts";

function createTempCwd(): { cwd: string; cleanup: () => void } {
	const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-index-tool-"));
	return {
		cwd,
		cleanup: () => rmSync(cwd, { recursive: true, force: true }),
	};
}

describe("ascet_index tool", () => {
	let cleanup = () => {};

	afterEach(() => {
		cleanup();
		cleanup = () => {};
	});

	test("status is local and does not require an executeCli hook", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const result = await ascetIndexTool.execute(
			"tool-call-1",
			{ action: "status", detailLevel: "summary" },
			new AbortController().signal,
			undefined,
			{ cwd: temp.cwd },
		);
		const details = result as { details?: { tool?: string; action?: string; state?: string } };
		assert.equal(details.details?.tool, "ascet_index");
		assert.equal(details.details?.action, "status");
		assert.equal(details.details?.state, "missing");
	});

	test("refresh maps code area to text_code warmup with text included", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const fakeCliPath = join(temp.cwd, "AscetCli.exe");
		writeFileSync(fakeCliPath, "", "utf8");
		let observedArgs: string[] = [];

		const result = await ascetIndexTool.execute(
			"tool-call-2",
			{ action: "refresh", areas: ["code"], mode: "foreground", force: true },
			new AbortController().signal,
			undefined,
			{
				cwd: temp.cwd,
				env: { ASCET_CLI_PATH: fakeCliPath, PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
				async executeCli(request) {
					observedArgs = request.args;
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							result: {
								databaseName: "AEB",
								databasePath: "d:/db/AEB",
								generatedAtMs: Date.now(),
								elapsedMs: 12,
								scanComplete: true,
								textCodeIncluded: true,
								textCodeScanComplete: true,
								textCodeEntries: [
									{
										componentPath: "DEMO\\PID",
										componentKind: "class",
										componentLanguageKind: "ESDL",
										section: "body",
										methodName: "calc",
										methodKind: "AbstractMethod",
										text: "return;",
										path: "DEMO\\PID::calc#body",
									},
								],
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(observedArgs.slice(0, 4), ["exec", "warm_search_index", "--partition", "text_code"]);
		assert.equal(observedArgs.includes("--include-text-code"), true);
		const details = result as { details?: { effectivePartitions?: string[] } };
		assert.deepEqual(details.details?.effectivePartitions, ["text_code"]);
	});

	test("background refresh plans selected partitions instead of forcing p0", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const result = await refreshAscetIndex({
			cwd: temp.cwd,
			areas: ["code"],
			mode: "background",
			reason: "unit_test",
		});

		assert.deepEqual(result.effectivePartitions, ["text_code"]);
		assert.deepEqual(result.jobs, [
			{ toolName: "ascet_index_refresh", commandId: "warm_search_index", kind: "read", partition: "text_code" },
		]);
	});

	test("wait=true executes a requested background refresh as foreground", async () => {
		const temp = createTempCwd();
		cleanup = temp.cleanup;
		const fakeCliPath = join(temp.cwd, "AscetCli.exe");
		writeFileSync(fakeCliPath, "", "utf8");
		let observedArgs: string[] = [];

		const result = await ascetIndexTool.execute(
			"tool-call-3",
			{ action: "refresh", areas: ["components"], mode: "background", wait: true, force: true },
			new AbortController().signal,
			undefined,
			{
				cwd: temp.cwd,
				env: { ASCET_CLI_PATH: fakeCliPath, PI_ASCET_SEARCH_INDEX_STORAGE: "memory" },
				async executeCli(request) {
					observedArgs = request.args;
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							result: {
								databaseName: "AEB",
								databasePath: "d:/db/AEB",
								generatedAtMs: Date.now(),
								elapsedMs: 7,
								scanComplete: true,
								components: [
									{
										path: "DEMO\\PID",
										name: "PID",
										kind: "class",
										languageKind: "ESDL",
										displayName: "PID",
										ownerKind: "folder",
										targetKind: "component",
										objectKind: "class",
									},
								],
							},
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(observedArgs.slice(0, 4), ["exec", "warm_search_index", "--partition", "components"]);
		const details = result as { details?: { mode?: string; effectivePartitions?: string[] } };
		assert.equal(details.details?.mode, "foreground");
		assert.deepEqual(details.details?.effectivePartitions, ["components"]);
	});
});

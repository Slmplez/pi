import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { runAscetDiffMethodCode } from "./diff-method-code.ts";

describe("diff_method local fallback", () => {
	test("falls back to two successful method reads when the diff backend fails", async () => {
		const cwd = mkdtempSync(join(tmpdir(), "pi-ascet-diff-fallback-"));
		const cliPath = join(cwd, "AscetCli.exe");
		const contractsPath = join(cwd, "contracts");
		mkdirSync(contractsPath, { recursive: true });
		writeFileSync(cliPath, "", "utf8");
		try {
			const result = await runAscetDiffMethodCode(
				{
					leftComponentPath: "AEB/Left",
					rightComponentPath: "AEB/Right",
					methodName: "calc",
				},
				{
					cwd,
					env: { ASCET_CLI_PATH: cliPath, ASCET_CONTRACTS_PATH: contractsPath },
					executeCli: async (request) => {
						const operation = request.args[1];
						if (operation === "diff_method_code") {
							return { exitCode: 1, stdout: "", stderr: "backend unavailable", timedOut: false, request };
						}
						const componentPath = request.args[2];
						const code = componentPath?.endsWith("Left") ? "speed = 1;" : "speed = 2;";
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: { componentPath, methodName: "calc", methodKind: "Process", code },
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					},
				},
			);

			assert.equal(result.ok, true);
			assert.equal(
				result.data && typeof result.data === "object" && "source" in result.data ? result.data.source : undefined,
				"local_read_fallback",
			);
			assert.equal(
				result.data && typeof result.data === "object" && "changed" in result.data
					? result.data.changed
					: undefined,
				true,
			);
		} finally {
			rmSync(cwd, { recursive: true, force: true });
		}
	});
});

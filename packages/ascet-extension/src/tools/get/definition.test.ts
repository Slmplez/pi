import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { ascetGetTool } from "./definition.ts";

function execution(request: AscetCliRequest, result: Record<string, unknown>): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result, error: null }),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ascet_get tool", () => {
	test("maps tree to the legacy backend and returns compact business content", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-tool-"));
		let observedArgs: string[] | undefined;
		try {
			const result = await ascetGetTool.execute(
				"call-tree",
				{ action: "tree", path: "PlatformLibrary\\Package", depth: 2 },
				new AbortController().signal,
				undefined,
				{
					cwd: root,
					env: {
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
						PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
					},
					executeCli: async (request) => {
						observedArgs = request.args;
						return execution(request, {
							items: [{ path: "PlatformLibrary\\Package\\Child", kind: "folder" }],
							coverage: { status: "complete_for_scope", completeness: "bounded" },
							truncated: true,
							source: "live",
							database: { name: "DB", path: "C:\\Repo\\DB" },
						});
					},
				},
			);

			assert.equal(observedArgs?.[0], "exec");
			assert.equal(observedArgs?.[1], "get_tree");
			assert.deepEqual(JSON.parse(observedArgs?.[3] ?? "{}"), {
				path: "PlatformLibrary\\Package",
				depth: 2,
			});
			assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
				count: 1,
				items: [{ path: "PlatformLibrary\\Package\\Child", kind: "folder" }],
				more: true,
			});
			assert.equal("data" in result.details, false);
			assert.deepEqual(result.details.coverage, { status: "complete_for_scope", completeness: "bounded" });
			assert.equal(result.details.source, "live");
			assert.equal(
				typeof (result.details.sourceIdentity as { database?: { fingerprint?: string } }).database?.fingerprint,
				"string",
			);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});

	test("maps formulas name and omits diagnostics from Agent content", async () => {
		const root = mkdtempSync(join(tmpdir(), "pi-ascet-get-formulas-"));
		let observedArgs: string[] | undefined;
		try {
			const result = await ascetGetTool.execute(
				"call-formulas",
				{ action: "formulas", path: "DEMO\\Project", name: "VehicleMass" },
				new AbortController().signal,
				undefined,
				{
					cwd: root,
					env: {
						PI_ASCET_RUNTIME_DIR: join(root, "runtime"),
						PI_ASCET_OPERATION_HEALTH_PATH: join(root, "health.json"),
					},
					executeCli: async (request) => {
						observedArgs = request.args;
						return execution(request, {
							items: [{ name: "VehicleMass", formula: "1200" }],
							coverage: { status: "complete_for_scope" },
							truncated: false,
							source: "live",
						});
					},
				},
			);

			assert.equal(observedArgs?.[1], "get_formulas");
			assert.deepEqual(JSON.parse(observedArgs?.[3] ?? "{}"), {
				path: "DEMO\\Project",
				formulaName: "VehicleMass",
			});
			assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
				count: 1,
				items: [{ name: "VehicleMass", formula: "1200" }],
			});
			assert.equal(result.content[0]?.text.includes("coverage"), false);
			assert.equal(result.content[0]?.text.includes("source"), false);
		} finally {
			rmSync(root, { recursive: true, force: true });
		}
	});
});

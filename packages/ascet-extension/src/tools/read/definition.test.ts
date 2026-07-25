import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { resetAscetSearchIndexForTest } from "../../search-index.ts";
import { ascetReadTool } from "./definition.ts";

function makeReadExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: { operation: "read_text_code", componentPath: "DEMO\\PID", text: "out = in;" },
			error: null,
			meta: { mode: "exec", operation: "read_text_code" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ascet_read tool", () => {
	test("read_code defaults to full live text and does not serve from the text-code index", async () => {
		resetAscetSearchIndexForTest({
			databaseName: "DemoDb",
			databasePath: "C:\\ASCET\\DemoDb",
			entries: [],
			textCodeEntries: [
				{
					componentPath: "DEMO\\PID",
					componentKind: "class",
					componentLanguageKind: "ESDL",
					section: "body",
					methodName: "calc",
					methodKind: "Process",
					text: "stale indexed text",
					path: "DEMO\\PID::calc#body",
				},
			],
			generatedAtMs: Date.now(),
			elapsedMs: 1,
			scanComplete: true,
			textCodeIncluded: true,
			textCodeScanComplete: true,
		});

		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-1",
			{ action: "read_code", componentPath: "DEMO\\PID", methodName: "calc", section: "body" },
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return makeReadExecution(request);
				},
			},
		);

		assert.deepEqual(observedArgs, [
			"exec",
			"read_text_code",
			"DEMO\\PID",
			"--method-name",
			"calc",
			"--section",
			"body",
			"--json",
		]);
		const text = result.content[0]?.text ?? "";
		assert.match(text, /read_text_code/);
		assert.match(text, /out = in;/);
	});

	test("read_code summary detail omits full text from the rendered result", async () => {
		const result = await ascetReadTool.execute(
			"call-1",
			{
				action: "read_code",
				componentPath: "DEMO\\PID",
				methodName: "calc",
				section: "body",
				detailLevel: "summary",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => makeReadExecution(request),
			},
		);

		const text = result.content[0]?.text ?? "";
		assert.match(text, new RegExp(`"hash": "${createHash("sha256").update("out = in;").digest("hex")}"`));
		assert.match(text, /"lineCount": 1/);
		assert.match(text, /"byteCount": 9/);
		assert.doesNotMatch(text, /out = in;/);
	});

	test("read_code full detail returns full live text", async () => {
		const result = await ascetReadTool.execute(
			"call-1",
			{ action: "read_code", componentPath: "DEMO\\PID", methodName: "calc", section: "body", detailLevel: "full" },
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => makeReadExecution(request),
			},
		);

		assert.match(result.content[0]?.text ?? "", /out = in;/);
	});

	test("read_project_formulas reads project formulas through the live CLI", async () => {
		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-1",
			{ action: "read_project_formulas", projectPath: "DEMO\\Project" },
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								projectPath: "DEMO\\Project",
								formulas: [{ name: "K", formula: "1.0" }],
							},
							error: null,
							meta: { mode: "exec", operation: "read_project_formulas" },
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(observedArgs, ["exec", "read_project_formulas", "DEMO\\Project", "--json"]);
		const payload = JSON.parse(result.content[0]?.text ?? "");
		assert.equal(payload.project, "DEMO/Project");
		assert.equal(payload.formulas[0].name, "K");
	});
});

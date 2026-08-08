import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
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

function makeDependentChainExecution(request: AscetCliRequest): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({
			ok: true,
			result: {
				component: "DEMO\\Consumer",
				dependent: { name: "K_Effective" },
				inputs: [],
				complete: true,
			},
			error: null,
			meta: { mode: "exec", operation: "read_dependent_chain" },
		}),
		stderr: "",
		timedOut: false,
		request,
	};
}

describe("ascet_read tool", () => {
	test("read_code defaults to full live text", async () => {
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

	test("read_element returns only the exact live catalog entry", async () => {
		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-1",
			{ action: "read_element", componentPath: "DEMO\\PID", elementName: "pid_kp" },
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
								elements: [
									{ name: "pid_kp", kind: "parameter", scope: "local" },
									{ name: "pid_ki", kind: "parameter", scope: "local" },
								],
							},
							error: null,
							meta: { mode: "exec", operation: "read_element_catalog" },
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(observedArgs, ["exec", "read_element_catalog", "DEMO\\PID", "--json"]);
		const text = result.content[0]?.text ?? "";
		assert.match(text, /pid_kp/);
		assert.doesNotMatch(text, /pid_ki/);
	});

	test("read_dependent_chain returns partial direct-read evidence when XML export fails", async () => {
		const calls: string[][] = [];
		const result = await ascetReadTool.execute(
			"call-1",
			{
				action: "read_dependent_chain",
				componentPath: "DEMO\\Consumer",
				dependentElement: "C_K_Effective",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls.push(request.args);
					if (request.args[1] === "read_dependent_chain") {
						return {
							exitCode: 2,
							stdout: JSON.stringify({
								ok: false,
								result: null,
								error: { code: "tool_api_error", message: "ASCET ExportXMLToFile returned false" },
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					}
					if (request.args[1] === "read_element_catalog") {
						return {
							exitCode: 0,
							stdout: JSON.stringify({
								ok: true,
								result: { elements: [{ name: "C_K_Effective", kind: "parameter", scope: "local" }] },
								error: null,
							}),
							stderr: "",
							timedOut: false,
							request,
						};
					}
					return {
						exitCode: 0,
						stdout: JSON.stringify({
							ok: true,
							result: {
								matches: [
									{
										component: "DEMO\\Consumer",
										element: "C_K_Effective",
										kind: "parameter",
										scope: "local",
										dependency: "dependent",
										formula: "F_K_Effective",
									},
								],
							},
							error: null,
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(
			calls.map((args) => args[1]),
			["read_dependent_chain", "read_element_catalog", "read_element_dependency"],
		);
		const text = result.content[0]?.text ?? "";
		assert.match(text, /"status": "partial"/);
		assert.match(text, /xml_export_failed/);
		assert.match(text, /F_K_Effective/);
	});

	test("read_dependent_chain performs one exact live read without provider discovery", async () => {
		const calls: string[][] = [];
		const result = await ascetReadTool.execute(
			"call-1",
			{
				action: "read_dependent_chain",
				componentPath: "DEMO\\Consumer",
				dependentElement: "K_Effective",
				exporterComponentPath: "DEMO\\Provider",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					calls.push(request.args);
					return makeDependentChainExecution(request);
				},
			},
		);

		assert.deepEqual(calls, [
			["exec", "read_dependent_chain", "DEMO\\Consumer", "K_Effective", "--exporter", "DEMO\\Provider", "--json"],
		]);
		assert.match(result.content[0]?.text ?? "", /DEMO[\\/]Consumer/);
	});
});

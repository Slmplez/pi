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
				dependent: { name: "K_Effective", kind: "parameter", scope: "local", dependency: "dependent" },
				dependencyFormula: {
					exists: true,
					code: "P_K_Effective",
					references: ["P_K_Effective"],
					mappings: [{ formal: "P_K_Effective", imported: "P_K_Effective", importedScope: "imported" }],
				},
				inputs: [
					{
						formal: { name: "P_K_Effective" },
						value: { name: "P_K_Effective", scope: "imported", kind: "parameter" },
						export: {
							exists: true,
							name: "P_K_Effective",
							scope: "exported",
							owner: "DEMO\\Provider",
						},
					},
				],
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
	test("read returns a live component summary", async () => {
		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-summary",
			{ action: "read", componentPath: "DEMO\\PID" },
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
							result: { path: "DEMO\\PID", kind: "class", elementCount: 4 },
							error: null,
						}),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.deepEqual(observedArgs, ["exec", "read_component_summary", "DEMO\\PID", "--json"]);
		assert.match(result.content[0]?.text ?? "", /elementCount/);
	});

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

	test("read_code full detail remains JSON when the body exceeds the output threshold", async () => {
		const fullText = `${"x".repeat(70000)}\nlast`;
		const result = await ascetReadTool.execute(
			"call-large-read-code",
			{ action: "read_code", componentPath: "DEMO\\PID", methodName: "calc", section: "body", detailLevel: "full" },
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							componentPath: "DEMO\\PID",
							componentKind: "Class",
							languageKind: "ESDL",
							section: "body",
							methodName: "calc",
							text: fullText,
						},
						error: null,
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		const payload = JSON.parse(result.content[0]?.text ?? "null") as {
			text?: unknown;
			hash?: unknown;
			lineCount?: unknown;
			byteCount?: unknown;
		};
		assert.equal(payload.text, fullText);
		assert.equal(payload.hash, "d714be1aa5e1ef7e28640b0a7bccb0c20888417370805d2f5007adcaa996e592");
		assert.equal(payload.lineCount, 2);
		assert.equal(payload.byteCount, 70005);
	});

	test("read_code full detail preserves an empty body as valid code", async () => {
		const result = await ascetReadTool.execute(
			"call-empty-read-code",
			{ action: "read_code", componentPath: "DEMO\\PID", methodName: "empty", section: "body", detailLevel: "full" },
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: { componentPath: "DEMO\\PID", section: "body", methodName: "empty", text: "" },
						error: null,
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		const payload = JSON.parse(result.content[0]?.text ?? "null") as {
			text?: unknown;
			lineCount?: unknown;
			byteCount?: unknown;
		};
		assert.equal(payload.text, "");
		assert.equal(payload.lineCount, 0);
		assert.equal(payload.byteCount, 0);
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

	test("read_implementation is the public Enumeration enumerator readback path", async () => {
		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-enumeration",
			{ action: "read_implementation", componentPath: "DEMO\\Mode" },
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
								componentPath: "DEMO\\Mode",
								componentKind: "Enumeration",
								implementationSourceKind: "TypeDefinition",
								mode: "Default",
								resolvedImplementationName: "Mode",
								elements: [],
								typeDefinition: { name: "Mode", enumerators: ["OFF", "ON"] },
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

		assert.deepEqual(observedArgs, ["exec", "read_implementation", "DEMO\\Mode", "--json"]);
		assert.match(result.content[0]?.text ?? "", /"enumerators": \[/);
		assert.match(result.content[0]?.text ?? "", /"OFF"/);
		assert.match(result.content[0]?.text ?? "", /"ON"/);
	});

	test("read_state_machine_flow forwards topology without silently downgrading it", async () => {
		let observedArgs: string[] | undefined;
		const result = await ascetReadTool.execute(
			"call-state-topology",
			{ action: "read_state_machine_flow", componentPath: "DEMO\\SM", detailLevel: "topology", traceDepth: 0 },
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
								componentPath: "DEMO\\SM",
								detailLevel: "topology",
								states: [{ name: "Idle", isStartState: true }],
								transitions: [],
								counts: { states: 1, transitions: 0 },
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

		assert.deepEqual(observedArgs, [
			"exec",
			"read_state_machine_flow",
			"DEMO\\SM",
			"--trace-depth",
			"0",
			"--detail-level",
			"topology",
			"--json",
		]);
		const payload = JSON.parse(result.content[0]?.text ?? "{}") as { detailLevel?: unknown };
		assert.equal(payload.detailLevel, "topology");
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

	test("read_element_dependency reports unavailable project enumeration instead of an empty success", async () => {
		const result = await ascetReadTool.execute(
			"call-project-dependency",
			{
				action: "read_element_dependency",
				targetPath: "DEMO\\Project",
				elementName: "P_Threshold",
				targetKind: "project",
			},
			new AbortController().signal,
			undefined,
			{
				cwd: process.cwd(),
				executeCli: async (request) => ({
					exitCode: 0,
					stdout: JSON.stringify({
						ok: true,
						result: {
							target: "DEMO\\Project",
							kind: "project",
							element: "P_Threshold",
							count: 0,
							matches: [],
							issues: ["project_component_enumeration_unavailable"],
						},
						error: null,
					}),
					stderr: "",
					timedOut: false,
					request,
				}),
			},
		);

		const payload = JSON.parse(result.content[0]?.text ?? "{}") as {
			error?: { code?: unknown; message?: unknown; details?: { backend?: { details?: unknown } } };
		};
		assert.equal(payload.error?.code, "project_component_enumeration_unavailable");
		assert.equal(payload.error?.message, "ASCET cannot enumerate project components for dependency inspection.");
		assert.deepEqual(payload.error?.details?.backend?.details, { retryable: false });
	});

	test("read_dependent_chain returns partial direct-read evidence when XML export fails", async () => {
		const calls: string[][] = [];
		const result = await ascetReadTool.execute(
			"call-1",
			{
				action: "read_dependent_chain",
				componentPath: "DEMO\\Consumer",
				dependentElement: "C_K_Effective",
				exporterComponentPath: "DEMO\\Provider",
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
		assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
			error: {
				code: "incomplete_chain",
				message: "The existing dependency metadata is incomplete.",
				componentPath: "DEMO\\Consumer",
				dependentElement: "C_K_Effective",
			},
		});
		assert.equal("data" in result.details, false);
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
		assert.deepEqual(JSON.parse(result.content[0]?.text ?? "{}"), {
			found: true,
			chain: {
				local: { componentPath: "DEMO\\Consumer", element: "K_Effective" },
				imported: { componentPath: "DEMO\\Consumer", element: "P_K_Effective" },
				exported: { componentPath: "DEMO\\Provider", element: "P_K_Effective" },
			},
			provider: {
				componentPath: "DEMO\\Provider",
				element: {
					exists: true,
					name: "P_K_Effective",
					scope: "exported",
					owner: "DEMO\\Provider",
				},
			},
			consumer: {
				componentPath: "DEMO\\Consumer",
				imported: { name: "P_K_Effective", scope: "imported", kind: "parameter" },
				local: { name: "K_Effective", kind: "parameter", scope: "local", dependency: "dependent" },
			},
			dependencyFormula: {
				exists: true,
				code: "P_K_Effective",
				references: ["P_K_Effective"],
				mappings: [{ formal: "P_K_Effective", imported: "P_K_Effective", importedScope: "imported" }],
			},
			binding: {
				formal: "P_K_Effective",
				formula: "P_K_Effective",
				importedElement: "P_K_Effective",
				variantPolicy: "default",
			},
			complete: true,
		});
		assert.equal("data" in result.details, false);
	});
});

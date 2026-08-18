import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	buildReadImplementationArgs,
	formatReadImplementationResult,
	getReadImplementationEnumerationReadback,
	runAscetReadImplementation,
} from "./read-implementation.ts";

describe("read_implementation request", () => {
	test("passes only CLI-supported implementation selection arguments", () => {
		assert.deepEqual(
			buildReadImplementationArgs({
				componentPath: "DEMO/PID",
				mode: "default",
				timeoutMs: 5000,
			}),
			["exec", "read_implementation", "DEMO\\PID", "--default", "--json"],
		);
	});

	test("rejects impl mode without implementationName at the public argument seam", () => {
		assert.throws(
			() => buildReadImplementationArgs({ componentPath: "DEMO/PID", mode: "impl" }),
			(error: unknown) => {
				if (!(error instanceof Error)) return false;
				const structuredError = error as Error & { code?: string; details?: unknown };
				assert.equal(structuredError.code, "invalid_argument");
				assert.deepEqual(structuredError.details, {
					mode: "impl",
					parameter: "implementationName",
				});
				return true;
			},
		);
	});

	test("maps every implementation mode to its CLI argument", () => {
		const cases = [
			{ mode: "list" as const, expected: ["--list"] },
			{ mode: "default" as const, expected: ["--default"] },
			{ mode: "class-impl" as const, expected: ["--class-impl"] },
			{ mode: "impl" as const, implementationName: "Impl", expected: ["--impl", "Impl"] },
		];

		for (const testCase of cases) {
			assert.deepEqual(
				buildReadImplementationArgs({
					componentPath: "DEMO/PID",
					mode: testCase.mode,
					implementationName: testCase.implementationName,
				}),
				["exec", "read_implementation", "DEMO\\PID", ...testCase.expected, "--json"],
			);
		}
	});

	test("applies timeout to the CLI process rather than unsupported operation arguments", async () => {
		let observedArgs: string[] | undefined;
		let observedTimeoutMs: number | undefined;
		const result = await runAscetReadImplementation(
			{ componentPath: "DEMO/PID", timeoutMs: 5000 },
			{
				cwd: process.cwd(),
				executeCli: async (request) => {
					observedArgs = request.args;
					observedTimeoutMs = request.timeoutMs;
					return {
						exitCode: 0,
						stdout: JSON.stringify({ ok: true, result: {}, error: null }),
						stderr: "",
						timedOut: false,
						request,
					};
				},
			},
		);

		assert.equal(result.ok, true);
		assert.deepEqual(observedArgs, ["exec", "read_implementation", "DEMO\\PID", "--json"]);
		assert.equal(observedTimeoutMs, 5000);
	});

	test("preserves a large nested successful implementation payload as JSON", () => {
		const code = "return value;\n".repeat(2000);
		const payload = {
			componentPath: "DEMO/PID",
			componentKind: "Class",
			implementationName: "Impl",
			implementation: {
				code,
				metadata: {
					variant: "default",
					options: ["fast", "safe"],
				},
			},
		};
		const formatted = formatReadImplementationResult({
			ok: true,
			data: { ok: true, result: payload, error: null },
			request: { cwd: process.cwd(), cliPath: "AscetBridge.exe", args: [], timeoutMs: 1 },
			stdout: "",
			stderr: "",
			exitCode: 0,
			timedOut: false,
		});

		const parsed = JSON.parse(formatted) as {
			component: string;
			kind: string;
			implementationName: string;
			implementation: typeof payload.implementation;
		};
		assert.equal(parsed.component, "DEMO/PID");
		assert.equal(parsed.kind, "Class");
		assert.equal(parsed.implementationName, "Impl");
		assert.equal(parsed.implementation.code, code);
		assert.deepEqual(parsed.implementation.metadata, payload.implementation.metadata);
	});

	test("extracts independent Enumeration readback names without changing their order", () => {
		const readback = getReadImplementationEnumerationReadback({
			ok: true,
			data: { ok: true, result: { typeDefinition: { enumerators: ["OFF", "ON"] } } },
			request: { cwd: process.cwd(), cliPath: "AscetBridge.exe", args: [], timeoutMs: 1 },
			stdout: "",
			stderr: "",
			exitCode: 0,
			timedOut: false,
		});
		assert.deepEqual(readback, { enumerators: ["OFF", "ON"] });
	});
});

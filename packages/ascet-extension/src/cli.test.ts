import assert from "node:assert/strict";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { type AscetCliJsonResult, formatAscetCliJsonResult } from "./cli.ts";

function makeResult(data: unknown): AscetCliJsonResult {
	return {
		ok: true,
		data,
		request: {
			cwd: process.cwd(),
			cliPath: "AscetCli.exe",
			args: ["exec", "read_block_diagram", "DEMO\\Controller", "Main", "--json"],
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

describe("formatAscetCliJsonResult", () => {
	test("keeps small success output as formatted JSON", () => {
		const result = makeResult({
			summary: "Small summary.",
			counts: { elements: 1 },
		});

		assert.equal(formatAscetCliJsonResult("read_block_diagram", result), JSON.stringify(result.data, null, 2));
	});

	test("stores large success output and returns grep-friendly artifact guidance", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		try {
			const result = makeResult({
				summary: "Full graph for Main contains 120 elements.",
				counts: {
					elements: 120,
					pins: 320,
					connections: 180,
				},
				detail: {
					graph: {
						nodes: Array.from({ length: 120 }, (_, index) => ({
							id: `N${index}`,
							pins: Array.from({ length: 8 }, (_, pinIndex) => `p${pinIndex}`),
						})),
					},
				},
			});

			const text = formatAscetCliJsonResult("read_block_diagram", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.match(text, /Full graph for Main contains 120 elements\./);
			assert.match(text, /Stored full ASCET output for read_block_diagram at /);
			assert.match(text, /rg -n '<pattern>'/);
			assert.match(text, /Get-Content -Path /);
			assert.doesNotMatch(text, /"nodes"/);
			assert.doesNotMatch(text, /N119/);

			const artifactText = readFileSync(join(artifactRoot, files[0] ?? ""), "utf8");
			assert.match(artifactText, /"nodes"/);
			assert.match(artifactText, /N119/);
			assert.equal(result.formattedOutputArtifact?.operation, "read_block_diagram");
			assert.ok(result.formattedOutputArtifact?.path);
			assert.ok(existsSync(result.formattedOutputArtifact.path));
			assert.equal(result.formattedOutputArtifact.thresholdBytes, 4096);
			assert.equal(result.formattedOutputArtifact.summary, "Full graph for Main contains 120 elements.");
			assert.deepEqual(result.formattedOutputArtifact.counts, {
				elements: 120,
				pins: 320,
				connections: 180,
			});
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});

	test("uses PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES to decide when to persist output", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-threshold-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		const previousThreshold = process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = "64";
		try {
			const result = makeResult({
				summary: "Threshold-controlled output.",
				values: Array.from({ length: 12 }, (_, index) => `value-${index}`),
			});

			const text = formatAscetCliJsonResult("list_components", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.match(text, /Threshold-controlled output\./);
			assert.equal(result.formattedOutputArtifact?.thresholdBytes, 64);
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			if (previousThreshold === undefined) {
				delete process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES;
			} else {
				process.env.PI_ASCET_EXTENSION_OUTPUT_THRESHOLD_BYTES = previousThreshold;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});

	test("does not create a second artifact when formatting the same large result twice", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-idempotent-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		try {
			const result = makeResult({
				summary: "Large result to format twice.",
				detail: Array.from({ length: 200 }, (_, index) => ({ id: index, name: `Element ${index}` })),
			});

			const first = formatAscetCliJsonResult("read_state_machine_flow", result);
			const firstArtifactPath = result.formattedOutputArtifact?.path;
			const second = formatAscetCliJsonResult("read_state_machine_flow", result);
			const files = readdirSync(artifactRoot).filter((file) => file.endsWith(".json"));

			assert.equal(files.length, 1);
			assert.equal(result.formattedOutputArtifact?.path, firstArtifactPath);
			assert.equal(second, first);
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});
});

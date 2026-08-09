import assert from "node:assert/strict";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { describe, test } from "node:test";
import { type AscetCliJsonResult, formatAscetCliJsonResult } from "../../cli.ts";
import { createAscetCliToolDetails } from "./envelope.ts";

function makeResult(data: unknown): AscetCliJsonResult {
	return {
		ok: true,
		data,
		request: {
			cwd: process.cwd(),
			cliPath: "AscetBridge.exe",
			args: ["exec", "read_block_diagram", "DEMO\\Controller", "Main", "--json"],
		},
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
	};
}

function makeFailureResult(): AscetCliJsonResult {
	return {
		ok: false,
		data: null,
		request: {
			cwd: process.cwd(),
			cliPath: "AscetBridge.exe",
			args: ["exec", "read_block_diagram", "DEMO\\Controller", "Main", "--json"],
		},
		stdout: '{"ok":false}',
		stderr: "ASCET failed",
		exitCode: 1,
		timedOut: false,
		error: {
			code: "ascet_cli_failed",
			message: "ASCET command failed.",
		},
	};
}

describe("createAscetCliToolDetails", () => {
	test("omits full data and stdout after formatter persists a large output artifact", () => {
		const artifactRoot = mkdtempSync(join(tmpdir(), "pi-ascet-details-artifacts-"));
		const previousRoot = process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
		process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = artifactRoot;
		try {
			const result = makeResult({
				summary: "Large block diagram.",
				counts: { elements: 120, pins: 320 },
				detail: {
					nodes: Array.from({ length: 120 }, (_, index) => ({
						id: `N${index}`,
						pins: Array.from({ length: 8 }, (_, pinIndex) => `p${pinIndex}`),
					})),
				},
			});

			formatAscetCliJsonResult("read_block_diagram", result);
			const details = createAscetCliToolDetails("ascet_read", "read_block_diagram", result) as Record<
				string,
				unknown
			>;

			assert.ok(!Object.hasOwn(details, "ok"));
			assert.equal(details.tool, "ascet_read");
			assert.equal(details.action, "read_block_diagram");
			assert.deepEqual(details.omittedFields, ["data", "stdout"]);
			assert.ok(!Object.hasOwn(details, "data"));
			assert.ok(!Object.hasOwn(details, "stdout"));
			assert.match(String((details.artifact as { path?: unknown }).path), /read_block_diagram-/);
			assert.match(String((details.artifact as { searchHint?: unknown }).searchHint), /rg -n '<pattern>'/);
			assert.deepEqual(details.counts, { elements: 120, pins: 320 });
		} finally {
			if (previousRoot === undefined) {
				delete process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT;
			} else {
				process.env.PI_ASCET_EXTENSION_ARTIFACT_ROOT = previousRoot;
			}
			rmSync(artifactRoot, { recursive: true, force: true });
		}
	});

	test("uses compact business data and omits stdout when formatter keeps small output inline", () => {
		const result = makeResult({
			ok: true,
			result: {
				summary: "Small summary.",
				counts: { elements: 1 },
				componentPath: "DEMO\\Controller",
			},
			error: null,
			meta: { mode: "exec", operation: "read_block_diagram" },
		});

		formatAscetCliJsonResult("read_block_diagram", result);
		const details = createAscetCliToolDetails("ascet_read", "read_block_diagram", result) as Record<string, unknown>;

		assert.ok(!Object.hasOwn(details, "ok"));
		assert.ok(!Object.hasOwn(details, "stdout"));
		assert.deepEqual(details.data, {
			summary: "Small summary.",
			counts: { elements: 1 },
			component: "DEMO/Controller",
		});
		assert.ok(!Object.hasOwn(details, "artifact"));
		assert.ok(!Object.hasOwn(details, "omittedFields"));
		assert.doesNotMatch(JSON.stringify(details), /"meta"|"mode"|"error":null|"ok":true/);
	});

	test("returns structured failure details even if stale artifact metadata is present", () => {
		const result = makeFailureResult();
		result.formattedOutputArtifact = {
			operation: "read_block_diagram",
			path: "C:\\tmp\\stale.json",
			sizeBytes: 10000,
			thresholdBytes: 4096,
			summary: "Stale success summary.",
			searchHint: "Search locally.",
		};

		const details = createAscetCliToolDetails("ascet_read", "read_block_diagram", result) as Record<string, unknown>;

		assert.ok(!Object.hasOwn(details, "ok"));
		assert.ok(!Object.hasOwn(details, "data"));
		assert.ok(!Object.hasOwn(details, "stdout"));
		assert.ok(!Object.hasOwn(details, "stderr"));
		assert.deepEqual(details.error, {
			code: "ascet_cli_failed",
			message: "ASCET command failed.",
			details: {
				stderr: "ASCET failed",
				stdout: '{"ok":false}',
				exitCode: 1,
			},
		});
		assert.ok(!Object.hasOwn(details, "artifact"));
		assert.ok(!Object.hasOwn(details, "omittedFields"));
	});
});

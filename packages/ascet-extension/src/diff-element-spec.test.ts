import assert from "node:assert/strict";
import { resolve } from "node:path";
import { test } from "node:test";
import { buildDiffElementSpecArgs } from "./diff-element-spec.ts";

test("resolves a relative element spec against the calling cwd", () => {
	const cwd = resolve(process.cwd(), "test-workspace");
	const args = buildDiffElementSpecArgs(
		{
			componentPath: "PlatformLibrary/Package/Example",
			specFile: "specs/element-spec.json",
		},
		cwd,
	);

	assert.deepEqual(args, [
		"exec",
		"diff_element_spec",
		"PlatformLibrary\\Package\\Example",
		resolve(cwd, "specs/element-spec.json"),
		"--json",
	]);
});

test("preserves an absolute element spec path", () => {
	const absoluteSpecPath = resolve(process.cwd(), "fixtures", "element-spec.json");
	const args = buildDiffElementSpecArgs(
		{
			componentPath: "PlatformLibrary\\Package\\Example",
			specFile: absoluteSpecPath,
			changesOnly: true,
		},
		resolve(process.cwd(), "different-cwd"),
	);

	assert.equal(args[3], absoluteSpecPath);
	assert.deepEqual(args.slice(-2), ["--changes-only", "--json"]);
});

import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { loadAscetPermissionConfig, parseAscetPermissionConfig } from "./config.ts";

const tempDirectories: string[] = [];

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function createWorkspace(): string {
	const cwd = mkdtempSync(join(tmpdir(), "ascet-permissions-"));
	tempDirectories.push(cwd);
	return cwd;
}

describe("ASCET permission config", () => {
	test("parses a strict supported config", () => {
		assert.deepEqual(
			parseAscetPermissionConfig({
				defaultMode: "acceptEdits",
				rules: [{ behavior: "deny", action: "delete_folder", path: "PRODUCTION_*" }],
			}),
			{
				defaultMode: "acceptEdits",
				rules: [{ behavior: "deny", action: "delete_folder", path: "PRODUCTION_*" }],
			},
		);
	});

	test("rejects unknown fields and unsupported values", () => {
		assert.throws(() => parseAscetPermissionConfig({ mode: "auto" }), /unknown field/);
		assert.throws(() => parseAscetPermissionConfig({ defaultMode: "unsafe" }), /defaultMode/);
		assert.throws(
			() => parseAscetPermissionConfig({ rules: [{ behavior: "allow", action: "unknown" }] }),
			/not supported/,
		);
	});

	test("uses defaults when the project config is absent", () => {
		const loaded = loadAscetPermissionConfig(createWorkspace());
		assert.equal(loaded.defaultMode, "default");
		assert.deepEqual(loaded.rules, []);
		assert.equal(loaded.error, undefined);
	});

	test("fails closed when the project config is invalid", () => {
		const cwd = createWorkspace();
		mkdirSync(join(cwd, ".ascet"));
		writeFileSync(join(cwd, ".ascet", "permissions.json"), "{invalid", "utf8");
		const loaded = loadAscetPermissionConfig(cwd);
		assert.match(loaded.error ?? "", /Invalid ASCET permission config/);
		assert.deepEqual(loaded.rules, [{ behavior: "deny", action: "*" }]);
	});
});

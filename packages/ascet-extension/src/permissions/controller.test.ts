import assert from "node:assert/strict";
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, test } from "node:test";
import { createAscetPermissionController } from "./controller.ts";

const tempDirectories: string[] = [];

afterEach(() => {
	for (const directory of tempDirectories.splice(0)) rmSync(directory, { recursive: true, force: true });
});

function createWorkspace(config?: unknown): string {
	const cwd = mkdtempSync(join(tmpdir(), "ascet-permission-controller-"));
	tempDirectories.push(cwd);
	if (config !== undefined) {
		mkdirSync(join(cwd, ".ascet"));
		writeFileSync(join(cwd, ".ascet", "permissions.json"), JSON.stringify(config), "utf8");
	}
	return cwd;
}

describe("ASCET permission controller", () => {
	test("restores session state before project defaults and updates status", () => {
		const statuses: string[] = [];
		const controller = createAscetPermissionController({ appendEntry() {} });
		controller.initialize({
			cwd: createWorkspace({ defaultMode: "auto" }),
			sessionManager: {
				getEntries: () => [{ type: "custom", customType: "ascet.permission_mode", data: { mode: "acceptEdits" } }],
			},
			ui: {
				notify() {},
				setStatus: (_key, text) => statuses.push(text ?? ""),
			},
		});
		assert.equal(controller.getMode(), "acceptEdits");
		assert.deepEqual(statuses, ["ASCET: Accept Edits"]);
	});

	test("persists mode changes and cycles deterministically", () => {
		const entries: unknown[] = [];
		const controller = createAscetPermissionController({ appendEntry: (_type, data) => entries.push(data) });
		controller.setMode("acceptEdits");
		assert.equal(controller.cycle(), "auto");
		assert.equal(controller.cycle(), "default");
		assert.deepEqual(entries, [{ mode: "acceptEdits" }, { mode: "auto" }, { mode: "default" }]);
	});

	test("returns one immutable operation snapshot", () => {
		const cwd = createWorkspace({
			defaultMode: "default",
			rules: [{ behavior: "deny", action: "delete_folder", path: "PRODUCTION_*" }],
		});
		const controller = createAscetPermissionController({ appendEntry() {} });
		controller.setMode("auto");
		const snapshot = controller.getSnapshot(cwd);
		controller.setMode("default");
		assert.equal(snapshot.mode, "auto");
		assert.deepEqual(snapshot.rules, [{ behavior: "deny", action: "delete_folder", path: "PRODUCTION_*" }]);
	});
});

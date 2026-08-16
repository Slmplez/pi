import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	ASCET_PERMISSION_SESSION_ENTRY,
	persistAscetPermissionMode,
	restoreAscetPermissionMode,
} from "./persistence.ts";

describe("ASCET permission persistence", () => {
	test("restores the latest valid custom entry", () => {
		assert.equal(
			restoreAscetPermissionMode([
				{ type: "custom", customType: ASCET_PERMISSION_SESSION_ENTRY, data: { mode: "default" } },
				{ type: "custom", customType: ASCET_PERMISSION_SESSION_ENTRY, data: { mode: "invalid" } },
				{ type: "custom", customType: ASCET_PERMISSION_SESSION_ENTRY, data: { mode: "auto" } },
			]),
			"auto",
		);
	});

	test("persists a typed custom entry", () => {
		const entries: Array<{ customType: string; data?: unknown }> = [];
		persistAscetPermissionMode((customType, data) => entries.push({ customType, data }), "acceptEdits");
		assert.deepEqual(entries, [{ customType: ASCET_PERMISSION_SESSION_ENTRY, data: { mode: "acceptEdits" } }]);
	});
});

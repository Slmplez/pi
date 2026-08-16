import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { findAscetPermissionRule, matchesAscetPermissionPath, normalizeAscetPermissionPath } from "./rules.ts";

describe("ASCET permission rules", () => {
	test("normalizes separators and matches wildcard paths", () => {
		assert.equal(normalizeAscetPermissionPath("\\DEMO//Folder\\"), "DEMO\\Folder");
		assert.equal(matchesAscetPermissionPath("PI_LIVE_TEST_*", "PI_LIVE_TEST_123\\Component"), true);
		assert.equal(matchesAscetPermissionPath("PRODUCTION_*", "DEMO\\Component"), false);
	});

	test("applies deny over ask over allow regardless of rule order", () => {
		const rules = [
			{ behavior: "allow", action: "create_method", path: "DEMO*" },
			{ behavior: "deny", action: "*", path: "DEMO\\Protected*" },
			{ behavior: "ask", action: "create_method", path: "DEMO*" },
		] as const;
		assert.equal(
			findAscetPermissionRule({ rules, action: "create_method", path: "DEMO/ProtectedComponent" })?.behavior,
			"deny",
		);
		assert.equal(findAscetPermissionRule({ rules, action: "create_method", path: "DEMO/Other" })?.behavior, "ask");
	});

	test("requires database fingerprints to match exactly", () => {
		const rules = [{ behavior: "allow", action: "create_folder", databaseFingerprint: "db-a" }] as const;
		assert.equal(findAscetPermissionRule({ rules, action: "create_folder", databaseFingerprint: "db-b" }), undefined);
		assert.equal(
			findAscetPermissionRule({ rules, action: "create_folder", databaseFingerprint: "db-a" })?.behavior,
			"allow",
		);
	});
});

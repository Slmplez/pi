import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { parseAscetPermissionRules } from "./settings.ts";

describe("ASCET permission settings", () => {
	it("parses only typed supported rules", () => {
		assert.deepEqual(
			parseAscetPermissionRules({
				ascetPermissions: {
					rules: [
						{ behavior: "allow", action: "create_method", path: "PI_LIVE_TEST_*" },
						{ behavior: "allow", action: "request_editability" },
						{ behavior: "deny", action: "*", databaseFingerprint: "db" },
						{ behavior: "allow", action: "unknown" },
						{ behavior: "maybe", action: "create_folder" },
						{ behavior: "ask", action: "create_folder", path: 1 },
					],
				},
			}),
			[
				{ behavior: "allow", action: "create_method", path: "PI_LIVE_TEST_*" },
				{ behavior: "allow", action: "request_editability" },
				{ behavior: "deny", action: "*", databaseFingerprint: "db" },
			],
		);
	});

	it("returns no rules for absent or malformed settings", () => {
		assert.deepEqual(parseAscetPermissionRules(undefined), []);
		assert.deepEqual(parseAscetPermissionRules({ ascetPermissions: { rules: {} } }), []);
	});
});

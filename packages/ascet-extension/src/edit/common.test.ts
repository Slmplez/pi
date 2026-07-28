import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { appendVerifyAndJson, createAscetEditImpact } from "./common.ts";

describe("ASCET edit common lifecycle", () => {
	test("keeps verification flags and canonical edit impact for enumeration changes", () => {
		assert.deepEqual(appendVerifyAndJson(["exec", "set_enumerators", "DEMO/E"], true), [
			"exec",
			"set_enumerators",
			"DEMO/E",
			"--verify-readback",
			"--json",
		]);
		assert.deepEqual(createAscetEditImpact({ action: "set_enumerators", componentPath: "\\DEMO\\E" }), {
			action: "set_enumerators",
			affectedComponents: ["/DEMO/E"],
			affectedMethods: [],
			affectedElements: [],
			stale: ["element_decls", "element_refs", "text_code"],
		});
	});
});

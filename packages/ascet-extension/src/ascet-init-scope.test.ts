import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseAscetInitArgs } from "./ascet-init-scope.ts";

describe("parseAscetInitArgs", () => {
	test("parses only scope arguments", () => {
		assert.deepEqual(parseAscetInitArgs(""), {
			ok: true,
			scope: { ok: true, kind: "auto-detect" },
		});
		assert.deepEqual(parseAscetInitArgs("database"), {
			ok: true,
			scope: { ok: true, kind: "database" },
		});
		assert.deepEqual(parseAscetInitArgs("folder Platform/Package"), {
			ok: true,
			scope: { ok: true, kind: "folder", value: "Platform/Package" },
		});
		assert.deepEqual(parseAscetInitArgs("project AEB"), {
			ok: true,
			scope: { ok: true, kind: "project", value: "AEB" },
		});
	});

	test("rejects all init flags", () => {
		const badIndex = parseAscetInitArgs("--index all");
		assert.equal(badIndex.ok, false);
		assert.match(badIndex.ok ? "" : badIndex.reason, /unknown option '--index'/);

		const force = parseAscetInitArgs("--force");
		assert.equal(force.ok, false);
		assert.match(force.ok ? "" : force.reason, /unknown option '--force'/);

		const unknown = parseAscetInitArgs("--background");
		assert.equal(unknown.ok, false);
		assert.match(unknown.ok ? "" : unknown.reason, /unknown option/);
	});
});

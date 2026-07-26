import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { parseAscetInitArgs } from "./ascet-init-scope.ts";

describe("parseAscetInitArgs", () => {
	test("keeps legacy scope parsing and defaults to core index", () => {
		assert.deepEqual(parseAscetInitArgs(""), {
			ok: true,
			scope: { ok: true, kind: "auto-detect" },
			indexMode: "core",
			forceRefresh: false,
			writeSummary: true,
		});
		assert.deepEqual(parseAscetInitArgs("--index all"), {
			ok: true,
			scope: { ok: true, kind: "auto-detect" },
			indexMode: "all",
			forceRefresh: false,
			writeSummary: true,
		});
		assert.deepEqual(parseAscetInitArgs("folder Platform/Package --index core --force"), {
			ok: true,
			scope: { ok: true, kind: "folder", value: "Platform/Package" },
			indexMode: "core",
			forceRefresh: true,
			writeSummary: true,
		});
		assert.deepEqual(parseAscetInitArgs("project AEB --index=none --no-write-summary"), {
			ok: true,
			scope: { ok: true, kind: "project", value: "AEB" },
			indexMode: "none",
			forceRefresh: false,
			writeSummary: false,
		});
	});

	test("rejects invalid init flags", () => {
		const badIndex = parseAscetInitArgs("--index fast");
		assert.equal(badIndex.ok, false);
		assert.match(badIndex.ok ? "" : badIndex.reason, /--index requires/);

		const unknown = parseAscetInitArgs("--background");
		assert.equal(unknown.ok, false);
		assert.match(unknown.ok ? "" : unknown.reason, /unknown option/);
	});
});

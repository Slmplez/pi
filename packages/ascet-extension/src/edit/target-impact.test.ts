import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { resolveAscetTargetImpact } from "./target-impact.ts";

describe("ASCET target impact", () => {
	test("identifies Project and Package aliases that share one OID", () => {
		const impact = resolveAscetTargetImpact({
			targetOid: "shared-oid",
			requestedPath: "Projects\\P1::CM_AVH",
			completeness: "complete",
			entries: [
				{ path: "Projects\\P1::CM_AVH", oid: "shared-oid", kind: "module" },
				{ path: "Projects\\P2::CM_AVH", oid: "shared-oid", kind: "module" },
				{ path: "PlatformLibrary\\Package\\CM_AVH", oid: "shared-oid", kind: "module" },
			],
		});

		assert.equal(impact.sharedObject, true);
		assert.equal(impact.ownerPath, "PlatformLibrary\\Package\\CM_AVH");
		assert.deepEqual(impact.affectedProjects, ["Projects\\P1", "Projects\\P2"]);
		assert.equal(impact.aliasPaths.length, 3);
		assert.match(impact.fingerprint, /^sha256:/u);
	});

	test("fails closed when impact evidence is incomplete", () => {
		const impact = resolveAscetTargetImpact({
			targetOid: "shared-oid",
			requestedPath: "Projects\\P1::CM_AVH",
			completeness: "unknown",
			entries: [{ path: "Projects\\P1::CM_AVH", oid: "shared-oid", kind: "module" }],
		});

		assert.equal(impact.completeness, "unknown");
		assert.equal(impact.writeAllowed, false);
		assert.equal(impact.blockingCode, "shared_object_impact_unknown");
	});

	test("deduplicates aliases and produces a stable fingerprint independent of input order", () => {
		const entries = [
			{ path: "Package\\C", oid: "oid-1", kind: "class" },
			{ path: "Projects\\P::C", oid: "oid-1", kind: "class" },
			{ path: "Projects\\P::C", oid: "oid-1", kind: "class" },
		];
		const left = resolveAscetTargetImpact({
			targetOid: "oid-1",
			requestedPath: "Projects\\P::C",
			completeness: "complete",
			entries,
		});
		const right = resolveAscetTargetImpact({
			targetOid: "oid-1",
			requestedPath: "Projects\\P::C",
			completeness: "complete",
			entries: [...entries].reverse(),
		});

		assert.deepEqual(left.aliasPaths, ["Package\\C", "Projects\\P::C"]);
		assert.equal(left.fingerprint, right.fingerprint);
	});
});

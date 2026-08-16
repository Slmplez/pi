import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { compareAscetApprovalMaterial, createAscetApprovalMaterialFingerprint } from "./fingerprint.ts";
import type { AscetMutationPreflightEvidence } from "./types.ts";

function evidence(generatedAt: string): AscetMutationPreflightEvidence {
	const material = {
		version: 1 as const,
		action: "create_folder" as const,
		paramsFingerprint: "params",
		database: { path: "db", fingerprint: "db-fp" },
		target: { path: "A", oid: "oid", kind: "Folder" },
		impact: {
			complete: true,
			sharedObject: false,
			ownerPath: "A",
			affectedProjects: [],
			fingerprint: "impact",
		},
		capability: { status: "supported" as const, operation: "AddFolder", evidence: {} },
		editability: { applicable: false, status: "not_applicable" as const, canRequestEditable: false },
		effects: [{ kind: "create_folder", target: "A\\B", description: "Create folder A\\B" }],
		verification: { available: true, operation: "read_folder", target: { path: "A\\B" } },
		riskModifiers: [],
		noOp: false,
	};
	return {
		...material,
		generatedAt,
		approvalMaterialFingerprint: createAscetApprovalMaterialFingerprint(material),
	};
}

describe("ASCET preflight fingerprints", () => {
	it("excludes freshness timestamps", () => {
		assert.equal(compareAscetApprovalMaterial(evidence("a"), evidence("b")).identical, true);
	});

	it("changes when an approved effect changes", () => {
		const approved = evidence("a");
		const current = evidence("b");
		current.effects = [
			...current.effects,
			{ kind: "create_folder", target: "A\\C", description: "Create folder A\\C" },
		];
		current.approvalMaterialFingerprint = createAscetApprovalMaterialFingerprint({
			...current,
			generatedAt: undefined,
			approvalMaterialFingerprint: undefined,
		} as never);
		assert.equal(compareAscetApprovalMaterial(approved, current).identical, false);
	});
});

import { createHash } from "node:crypto";
import type { AscetMutationPreflightEvidence } from "./types.ts";

function normalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(normalize);
	if (value !== null && typeof value === "object") {
		return Object.fromEntries(
			Object.entries(value as Record<string, unknown>)
				.filter(([, entry]) => entry !== undefined)
				.sort(([left], [right]) => left.localeCompare(right))
				.map(([key, entry]) => [key, normalize(entry)]),
		);
	}
	return value;
}

export function fingerprintAscetValue(value: unknown): string {
	return createHash("sha256")
		.update(JSON.stringify(normalize(value)), "utf8")
		.digest("hex");
}

export function createAscetApprovalMaterialFingerprint(
	evidence: Omit<AscetMutationPreflightEvidence, "generatedAt" | "approvalMaterialFingerprint">,
): string {
	return fingerprintAscetValue(evidence);
}

export function compareAscetApprovalMaterial(
	approved: AscetMutationPreflightEvidence,
	current: AscetMutationPreflightEvidence,
): { identical: boolean; approvedFingerprint: string; currentFingerprint: string } {
	return {
		identical: approved.approvalMaterialFingerprint === current.approvalMaterialFingerprint,
		approvedFingerprint: approved.approvalMaterialFingerprint,
		currentFingerprint: current.approvalMaterialFingerprint,
	};
}

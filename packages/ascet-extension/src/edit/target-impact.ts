import { createHash } from "node:crypto";

export interface AscetTargetImpactEntry {
	path: string;
	oid: string;
	kind: string;
}

export interface ResolveAscetTargetImpactInput {
	targetOid: string;
	requestedPath: string;
	completeness: "complete" | "unknown";
	entries: readonly AscetTargetImpactEntry[];
}

export interface AscetTargetImpact {
	sharedObject: boolean;
	requestedPath: string;
	ownerPath: string;
	targetOid: string;
	aliasPaths: readonly string[];
	affectedProjects: readonly string[];
	completeness: "complete" | "unknown";
	writeAllowed: boolean;
	blockingCode?: "shared_object_impact_unknown";
	fingerprint: string;
}

function requireText(value: string, field: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(`${field} must not be empty.`);
	return normalized.replaceAll("/", "\\");
}

function projectPath(path: string): string | undefined {
	const separator = path.lastIndexOf("::");
	return separator > 0 ? path.slice(0, separator) : undefined;
}

function fingerprint(value: unknown): string {
	return `sha256:${createHash("sha256").update(JSON.stringify(value), "utf8").digest("hex")}`;
}

export function resolveAscetTargetImpact(input: ResolveAscetTargetImpactInput): AscetTargetImpact {
	const targetOid = requireText(input.targetOid, "targetOid");
	const requestedPath = requireText(input.requestedPath, "requestedPath");
	const aliases = new Set<string>();
	for (const entry of input.entries) {
		if (entry.oid.trim() === targetOid) aliases.add(requireText(entry.path, "entry.path"));
	}
	aliases.add(requestedPath);
	const aliasPaths = [...aliases].sort((left, right) => left.localeCompare(right, "en"));
	const ownerPath = aliasPaths.find((path) => !path.includes("::")) ?? requestedPath;
	const affectedProjects = [
		...new Set(aliasPaths.map(projectPath).filter((path): path is string => path !== undefined)),
	].sort((left, right) => left.localeCompare(right, "en"));
	const sharedObject = aliasPaths.length > 1 || requestedPath !== ownerPath || affectedProjects.length > 1;
	const evidence = {
		sharedObject,
		requestedPath,
		ownerPath,
		targetOid,
		aliasPaths,
		affectedProjects,
		completeness: input.completeness,
	};
	return {
		...evidence,
		writeAllowed: input.completeness === "complete",
		...(input.completeness === "unknown" ? { blockingCode: "shared_object_impact_unknown" as const } : {}),
		fingerprint: fingerprint(evidence),
	};
}

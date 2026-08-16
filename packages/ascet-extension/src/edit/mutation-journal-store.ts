import { createHash, randomUUID } from "node:crypto";
import { mkdirSync, readFileSync, renameSync, writeFileSync } from "node:fs";
import { dirname, join, resolve, sep } from "node:path";
import type { AscetMutationGuardEvidence } from "./mutation-guard-store.ts";

export type AscetMutationJournalStatus =
	| "prepared"
	| "applied"
	| "no_op"
	| "partially_applied"
	| "rolled_back"
	| "unknown"
	| "not_started";

export interface AscetMutationJournalRecord {
	version: 1;
	status: AscetMutationJournalStatus;
	databaseFingerprint: string;
	targetOid: string;
	targetKind: string;
	canonicalPath: string;
	action: string;
	planId: string;
	planFingerprint: string;
	targetImpactFingerprint: string;
	guardGeneration: number;
	beforeSnapshotFingerprint: string;
	desiredFingerprint: string;
	beforeSnapshot: unknown;
	attemptedMutation: unknown;
	createdAt: string;
	updatedAt: string;
	evidence?: AscetMutationGuardEvidence;
	outcome?: { operationId?: string; errorCode?: string };
}

export interface PrepareAscetMutationJournalInput {
	databaseFingerprint: string;
	targetOid: string;
	targetKind: string;
	canonicalPath: string;
	action: string;
	planId: string;
	planFingerprint: string;
	targetImpactFingerprint: string;
	guardGeneration: number;
	beforeSnapshot: unknown;
	attemptedMutation: unknown;
}

export interface UpdateAscetMutationJournalInput {
	status: Exclude<AscetMutationJournalStatus, "prepared">;
	evidence: AscetMutationGuardEvidence;
	operationId?: string;
	errorCode?: string;
}

function requireText(value: string, field: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(`${field} must not be empty.`);
	return normalized;
}

function canonicalize(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(canonicalize);
	if (value === null || typeof value !== "object") return value;
	const record = value as Record<string, unknown>;
	return Object.fromEntries(
		Object.keys(record)
			.sort()
			.map((key) => [key, canonicalize(record[key])]),
	);
}

function fingerprint(value: unknown): string {
	return `sha256:${createHash("sha256")
		.update(JSON.stringify(canonicalize(value)), "utf8")
		.digest("hex")}`;
}

function identityHash(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

export class AscetMutationJournalStore {
	private readonly root: string;
	private readonly now: () => Date;

	constructor(options: { artifactRoot: string; now?: () => Date }) {
		this.root = resolve(requireText(options.artifactRoot, "artifactRoot"), "mutation-journals");
		this.now = options.now ?? (() => new Date());
	}

	prepare(input: PrepareAscetMutationJournalInput): { path: string; record: AscetMutationJournalRecord } {
		const now = this.now().toISOString();
		const record: AscetMutationJournalRecord = {
			version: 1,
			status: "prepared",
			databaseFingerprint: requireText(input.databaseFingerprint, "databaseFingerprint"),
			targetOid: requireText(input.targetOid, "targetOid"),
			targetKind: requireText(input.targetKind, "targetKind"),
			canonicalPath: requireText(input.canonicalPath, "canonicalPath"),
			action: requireText(input.action, "action"),
			planId: requireText(input.planId, "planId"),
			planFingerprint: requireText(input.planFingerprint, "planFingerprint"),
			targetImpactFingerprint: requireText(input.targetImpactFingerprint, "targetImpactFingerprint"),
			guardGeneration: input.guardGeneration,
			beforeSnapshotFingerprint: fingerprint(input.beforeSnapshot),
			desiredFingerprint: fingerprint(input.attemptedMutation),
			beforeSnapshot: input.beforeSnapshot,
			attemptedMutation: input.attemptedMutation,
			createdAt: now,
			updatedAt: now,
		};
		const path = join(
			this.root,
			identityHash(record.databaseFingerprint),
			identityHash(record.targetOid),
			`${identityHash(record.planId)}.json`,
		);
		this.write(path, record);
		return { path, record };
	}

	load(path: string): AscetMutationJournalRecord {
		const resolvedPath = this.requireJournalPath(path);
		const value = JSON.parse(readFileSync(resolvedPath, "utf8")) as unknown;
		if (!value || typeof value !== "object" || Array.isArray(value)) {
			throw new Error("Mutation journal has an invalid shape.");
		}
		const record = value as AscetMutationJournalRecord;
		if (
			record.version !== 1 ||
			typeof record.databaseFingerprint !== "string" ||
			typeof record.targetOid !== "string" ||
			typeof record.beforeSnapshotFingerprint !== "string" ||
			typeof record.desiredFingerprint !== "string"
		) {
			throw new Error("Mutation journal has an invalid shape.");
		}
		return record;
	}
	update(path: string, input: UpdateAscetMutationJournalInput): AscetMutationJournalRecord {
		const resolvedPath = this.requireJournalPath(path);
		const existing = JSON.parse(readFileSync(resolvedPath, "utf8")) as AscetMutationJournalRecord;
		const record: AscetMutationJournalRecord = {
			...existing,
			status: input.status,
			updatedAt: this.now().toISOString(),
			evidence: input.evidence,
			outcome: {
				...(input.operationId ? { operationId: input.operationId } : {}),
				...(input.errorCode ? { errorCode: input.errorCode } : {}),
			},
		};
		this.write(resolvedPath, record);
		return record;
	}

	private requireJournalPath(path: string): string {
		const resolvedPath = resolve(requireText(path, "journalPath"));
		if (!resolvedPath.startsWith(`${this.root}${sep}`))
			throw new Error("journalPath is outside the mutation journal root.");
		return resolvedPath;
	}

	private write(path: string, record: AscetMutationJournalRecord): void {
		mkdirSync(dirname(path), { recursive: true });
		const temporaryPath = `${path}.${randomUUID()}.tmp`;
		writeFileSync(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
		renameSync(temporaryPath, path);
	}
}

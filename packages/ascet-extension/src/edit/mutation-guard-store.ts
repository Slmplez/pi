import { createHash, randomUUID } from "node:crypto";
import {
	closeSync,
	existsSync,
	mkdirSync,
	openSync,
	readFileSync,
	renameSync,
	unlinkSync,
	writeFileSync,
} from "node:fs";
import { join } from "node:path";

export type AscetMutationGuardStatus = "clear" | "quarantined" | "reconciling";
export type AscetMutationGuardReason = "unknown_outcome" | "rollback_failed" | "process_interrupted";

export interface AscetMutationGuardEvidence {
	bridgeEntered: boolean;
	backendResponseReceived: boolean;
	mutationStarted: boolean;
}

export interface AscetMutationGuardRecord {
	version: 1;
	databaseFingerprint: string;
	targetOid: string;
	targetKind: string;
	canonicalPath: string;
	generation: number;
	status: AscetMutationGuardStatus;
	reason?: AscetMutationGuardReason;
	operation?: string;
	operationId?: string;
	planId?: string;
	journalPath?: string;
	beforeSnapshotFingerprint?: string;
	desiredFingerprint?: string;
	detectedAt?: string;
	reconciledAt?: string;
	reconciliationEvidenceFingerprint?: string;
	evidence?: AscetMutationGuardEvidence;
}

export interface AscetMutationQuarantineInput {
	databaseFingerprint: string;
	targetOid: string;
	targetKind: string;
	canonicalPath: string;
	reason: AscetMutationGuardReason;
	operation: string;
	operationId: string;
	planId?: string;
	journalPath?: string;
	beforeSnapshotFingerprint?: string;
	desiredFingerprint?: string;
	evidence: AscetMutationGuardEvidence;
}

export interface AscetMutationGuardClearInput {
	databaseFingerprint: string;
	targetOid: string;
	expectedGeneration: number;
	reconciliationEvidenceFingerprint: string;
}

export interface AscetMutationGuardCheck {
	clear: boolean;
	generation: number;
	record?: AscetMutationGuardRecord;
}

export type AscetMutationGuardStoreErrorCode =
	| "invalid_guard_input"
	| "guard_corrupt"
	| "guard_busy"
	| "guard_generation_mismatch"
	| "target_not_quarantined";

export class AscetMutationGuardStoreError extends Error {
	readonly code: AscetMutationGuardStoreErrorCode;

	constructor(code: AscetMutationGuardStoreErrorCode, message: string) {
		super(message);
		this.name = "AscetMutationGuardStoreError";
		this.code = code;
	}
}

export interface AscetMutationGuardStoreOptions {
	artifactRoot: string;
	now?: () => Date;
}

function requireText(value: string, field: string): string {
	const normalized = value.trim();
	if (!normalized) {
		throw new AscetMutationGuardStoreError("invalid_guard_input", `${field} must not be empty.`);
	}
	return normalized;
}

function identityHash(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseRecord(
	raw: string,
	expectedDatabaseFingerprint: string,
	expectedTargetOid: string,
): AscetMutationGuardRecord {
	let value: unknown;
	try {
		value = JSON.parse(raw) as unknown;
	} catch (error) {
		throw new AscetMutationGuardStoreError(
			"guard_corrupt",
			`Mutation guard JSON is invalid: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (
		!isRecord(value) ||
		value.version !== 1 ||
		typeof value.databaseFingerprint !== "string" ||
		typeof value.targetOid !== "string" ||
		typeof value.targetKind !== "string" ||
		typeof value.canonicalPath !== "string" ||
		typeof value.generation !== "number" ||
		!Number.isInteger(value.generation) ||
		value.generation < 1 ||
		(value.status !== "clear" && value.status !== "quarantined" && value.status !== "reconciling")
	) {
		throw new AscetMutationGuardStoreError("guard_corrupt", "Mutation guard record has an invalid shape.");
	}
	if (value.databaseFingerprint !== expectedDatabaseFingerprint || value.targetOid !== expectedTargetOid) {
		throw new AscetMutationGuardStoreError(
			"guard_corrupt",
			"Mutation guard identity does not match its storage key.",
		);
	}
	return value as unknown as AscetMutationGuardRecord;
}

export class AscetMutationGuardStore {
	private readonly root: string;
	private readonly now: () => Date;

	constructor(options: AscetMutationGuardStoreOptions) {
		this.root = join(requireText(options.artifactRoot, "artifactRoot"), "mutation-guards");
		this.now = options.now ?? (() => new Date());
	}

	getRecordPath(databaseFingerprint: string, targetOid: string): string {
		const database = requireText(databaseFingerprint, "databaseFingerprint");
		const target = requireText(targetOid, "targetOid");
		return join(this.root, identityHash(database), `${identityHash(target)}.json`);
	}

	load(databaseFingerprint: string, targetOid: string): AscetMutationGuardRecord | undefined {
		const database = requireText(databaseFingerprint, "databaseFingerprint");
		const target = requireText(targetOid, "targetOid");
		const filePath = this.getRecordPath(database, target);
		if (!existsSync(filePath)) return undefined;
		return parseRecord(readFileSync(filePath, "utf8"), database, target);
	}

	assertClear(databaseFingerprint: string, targetOid: string): AscetMutationGuardCheck {
		const record = this.load(databaseFingerprint, targetOid);
		if (!record) return { clear: true, generation: 0 };
		return { clear: record.status === "clear", generation: record.generation, record };
	}

	quarantine(input: AscetMutationQuarantineInput): AscetMutationGuardRecord {
		const databaseFingerprint = requireText(input.databaseFingerprint, "databaseFingerprint");
		const targetOid = requireText(input.targetOid, "targetOid");
		return this.withLock(databaseFingerprint, targetOid, () => {
			const existing = this.load(databaseFingerprint, targetOid);
			const record: AscetMutationGuardRecord = {
				version: 1,
				databaseFingerprint,
				targetOid,
				targetKind: requireText(input.targetKind, "targetKind"),
				canonicalPath: requireText(input.canonicalPath, "canonicalPath"),
				generation: (existing?.generation ?? 0) + 1,
				status: "quarantined",
				reason: input.reason,
				operation: requireText(input.operation, "operation"),
				operationId: requireText(input.operationId, "operationId"),
				...(input.planId ? { planId: input.planId } : {}),
				...(input.journalPath ? { journalPath: input.journalPath } : {}),
				...(input.beforeSnapshotFingerprint ? { beforeSnapshotFingerprint: input.beforeSnapshotFingerprint } : {}),
				...(input.desiredFingerprint ? { desiredFingerprint: input.desiredFingerprint } : {}),
				detectedAt: this.now().toISOString(),
				evidence: input.evidence,
			};
			this.writeRecord(record);
			return record;
		});
	}

	clear(input: AscetMutationGuardClearInput): AscetMutationGuardRecord {
		const databaseFingerprint = requireText(input.databaseFingerprint, "databaseFingerprint");
		const targetOid = requireText(input.targetOid, "targetOid");
		const evidenceFingerprint = requireText(
			input.reconciliationEvidenceFingerprint,
			"reconciliationEvidenceFingerprint",
		);
		return this.withLock(databaseFingerprint, targetOid, () => {
			const existing = this.load(databaseFingerprint, targetOid);
			if (!existing || existing.status === "clear") {
				if (existing && existing.generation !== input.expectedGeneration) {
					throw new AscetMutationGuardStoreError(
						"guard_generation_mismatch",
						`Expected guard generation ${input.expectedGeneration}, current generation is ${existing.generation}.`,
					);
				}
				throw new AscetMutationGuardStoreError("target_not_quarantined", "Target is not quarantined.");
			}
			if (existing.generation !== input.expectedGeneration) {
				throw new AscetMutationGuardStoreError(
					"guard_generation_mismatch",
					`Expected guard generation ${input.expectedGeneration}, current generation is ${existing.generation}.`,
				);
			}
			const record: AscetMutationGuardRecord = {
				...existing,
				generation: existing.generation + 1,
				status: "clear",
				reconciledAt: this.now().toISOString(),
				reconciliationEvidenceFingerprint: evidenceFingerprint,
			};
			this.writeRecord(record);
			return record;
		});
	}

	private withLock<T>(databaseFingerprint: string, targetOid: string, action: () => T): T {
		const recordPath = this.getRecordPath(databaseFingerprint, targetOid);
		mkdirSync(join(recordPath, ".."), { recursive: true });
		const lockPath = `${recordPath}.lock`;
		let descriptor: number;
		try {
			descriptor = openSync(lockPath, "wx", 0o600);
		} catch {
			throw new AscetMutationGuardStoreError("guard_busy", "Mutation guard is being updated by another process.");
		}
		try {
			return action();
		} finally {
			closeSync(descriptor);
			unlinkSync(lockPath);
		}
	}

	private writeRecord(record: AscetMutationGuardRecord): void {
		const filePath = this.getRecordPath(record.databaseFingerprint, record.targetOid);
		mkdirSync(join(filePath, ".."), { recursive: true });
		const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
		writeFileSync(temporaryPath, `${JSON.stringify(record, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
		renameSync(temporaryPath, filePath);
	}
}

import { createHash } from "node:crypto";
import { closeSync, existsSync, mkdirSync, openSync, readFileSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import type { AscetCliJsonResult, AscetCliLifecycleEvent } from "../cli.ts";
import { AscetApprovalStore } from "./approval-store.ts";
import { AscetMutationGuardStore } from "./mutation-guard-store.ts";
import { AscetMutationJournalStore } from "./mutation-journal-store.ts";
import { classifyAscetEditExecution } from "./verification.ts";

export type AscetMutationCoordinatorErrorCode =
	| "mutation_target_quarantined"
	| "mutation_target_busy"
	| "mutation_guard_generation_mismatch";

export class AscetMutationCoordinatorError extends Error {
	readonly code: AscetMutationCoordinatorErrorCode;

	constructor(code: AscetMutationCoordinatorErrorCode, message: string) {
		super(message);
		this.name = "AscetMutationCoordinatorError";
		this.code = code;
	}
}

export interface AscetMutationCoordinatorOptions {
	artifactRoot: string;
}

export interface AscetMutationCoordinatorInput {
	action: string;
	planId: string;
	planFingerprint: string;
	databaseFingerprint: string;
	targetOid: string;
	targetKind: string;
	canonicalPath: string;
	targetImpactFingerprint: string;
	guardGeneration: number;
	sessionId: string;
	approvalTtlMs: number;
	beginExecution: () => void;
	completeExecution: () => void;
	journal: {
		beforeSnapshot: unknown;
		attemptedMutation: unknown;
	};
	dispatch: (onLifecycle: (event: AscetCliLifecycleEvent) => void) => Promise<AscetCliJsonResult>;
}

function identityHash(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

function requireText(value: string, field: string): string {
	const normalized = value.trim();
	if (!normalized) throw new Error(`${field} must not be empty.`);
	return normalized;
}

function isNodeError(error: unknown): error is NodeJS.ErrnoException {
	return error instanceof Error && "code" in error;
}

export class AscetMutationCoordinator {
	private readonly artifactRoot: string;
	private readonly guardStore: AscetMutationGuardStore;
	private readonly approvalStore: AscetApprovalStore;
	private readonly journalStore: AscetMutationJournalStore;

	constructor(options: AscetMutationCoordinatorOptions) {
		this.artifactRoot = requireText(options.artifactRoot, "artifactRoot");
		this.guardStore = new AscetMutationGuardStore({ artifactRoot: this.artifactRoot });
		this.approvalStore = new AscetApprovalStore({ artifactRoot: this.artifactRoot });
		this.journalStore = new AscetMutationJournalStore({ artifactRoot: this.artifactRoot });
	}

	async execute(input: AscetMutationCoordinatorInput): Promise<AscetCliJsonResult> {
		const initialGuard = this.guardStore.assertClear(input.databaseFingerprint, input.targetOid);
		this.requireClearGuard(initialGuard.clear, initialGuard.generation, input);
		const approvalBinding = {
			action: requireText(input.action, "action"),
			planId: requireText(input.planId, "planId"),
			planFingerprint: requireText(input.planFingerprint, "planFingerprint"),
			databaseFingerprint: requireText(input.databaseFingerprint, "databaseFingerprint"),
			targetOid: requireText(input.targetOid, "targetOid"),
			targetImpactFingerprint: requireText(input.targetImpactFingerprint, "targetImpactFingerprint"),
			guardGeneration: input.guardGeneration,
			sessionId: requireText(input.sessionId, "sessionId"),
		};
		const approval = this.approvalStore.create({ ...approvalBinding, ttlMs: input.approvalTtlMs });

		return this.withTargetLock(input, async () => {
			const currentGuard = this.guardStore.assertClear(input.databaseFingerprint, input.targetOid);
			this.requireClearGuard(currentGuard.clear, currentGuard.generation, input);
			this.approvalStore.consume({
				...approvalBinding,
				approvalId: approval.receipt.approvalId,
				token: approval.token,
			});
			const journal = this.journalStore.prepare({
				databaseFingerprint: input.databaseFingerprint,
				targetOid: input.targetOid,
				targetKind: input.targetKind,
				canonicalPath: input.canonicalPath,
				action: input.action,
				planId: input.planId,
				planFingerprint: input.planFingerprint,
				targetImpactFingerprint: input.targetImpactFingerprint,
				guardGeneration: input.guardGeneration,
				beforeSnapshot: input.journal.beforeSnapshot,
				attemptedMutation: input.journal.attemptedMutation,
			});

			let beforeBridge = false;
			let bridgeEntered = false;
			let backendResponseReceived = false;
			let quarantined = false;
			try {
				input.beginExecution();
				const raw = await input.dispatch((event) => {
					if (event.stage === "before_bridge") beforeBridge = true;
					if (event.stage === "bridge_entered") bridgeEntered = true;
					if (event.stage === "backend_response_received") backendResponseReceived = true;
				});
				if (!beforeBridge) {
					throw new Error("Mutation dispatch completed without before_bridge lifecycle evidence.");
				}
				const classification = classifyAscetEditExecution(raw);
				const evidence = { bridgeEntered, backendResponseReceived, mutationStarted: bridgeEntered };
				const journalRecord = this.journalStore.update(journal.path, {
					status: classification.mutationStatus,
					evidence,
					...(raw.operationId ? { operationId: raw.operationId } : {}),
					...(raw.error?.code ? { errorCode: raw.error.code } : {}),
				});
				if (classification.mutationStatus === "unknown") {
					this.guardStore.quarantine({
						databaseFingerprint: input.databaseFingerprint,
						targetOid: input.targetOid,
						targetKind: input.targetKind,
						canonicalPath: input.canonicalPath,
						reason: raw.error?.code.includes("rollback_failed") ? "rollback_failed" : "unknown_outcome",
						operation: input.action,
						operationId: raw.operationId ?? `plan:${input.planId}`,
						planId: input.planId,
						journalPath: journal.path,
						beforeSnapshotFingerprint: journalRecord.beforeSnapshotFingerprint,
						desiredFingerprint: journalRecord.desiredFingerprint,
						evidence,
					});
					quarantined = true;
				}
				input.completeExecution();
				return raw;
			} catch (error) {
				const evidence = { bridgeEntered, backendResponseReceived, mutationStarted: bridgeEntered };
				const journalRecord = this.journalStore.update(journal.path, {
					status: bridgeEntered ? "unknown" : "not_started",
					evidence,
					errorCode: error instanceof Error ? error.name : "unknown_error",
				});
				if (bridgeEntered && !quarantined) {
					this.guardStore.quarantine({
						databaseFingerprint: input.databaseFingerprint,
						targetOid: input.targetOid,
						targetKind: input.targetKind,
						canonicalPath: input.canonicalPath,
						reason: "process_interrupted",
						operation: input.action,
						operationId: `plan:${input.planId}`,
						planId: input.planId,
						journalPath: journal.path,
						beforeSnapshotFingerprint: journalRecord.beforeSnapshotFingerprint,
						desiredFingerprint: journalRecord.desiredFingerprint,
						evidence,
					});
				}
				throw error;
			}
		});
	}

	private requireClearGuard(clear: boolean, generation: number, input: AscetMutationCoordinatorInput): void {
		if (!clear) {
			throw new AscetMutationCoordinatorError(
				"mutation_target_quarantined",
				`Target OID ${input.targetOid} is quarantined and requires reconciliation.`,
			);
		}
		if (generation !== input.guardGeneration) {
			throw new AscetMutationCoordinatorError(
				"mutation_guard_generation_mismatch",
				`Mutation guard generation changed from ${input.guardGeneration} to ${generation}.`,
			);
		}
	}

	getTargetLockPath(databaseFingerprint: string, targetOid: string): string {
		return join(
			this.artifactRoot,
			"mutation-locks",
			identityHash(requireText(databaseFingerprint, "databaseFingerprint")),
			`${identityHash(requireText(targetOid, "targetOid"))}.lock`,
		);
	}

	private async withTargetLock<T>(input: AscetMutationCoordinatorInput, action: () => Promise<T>): Promise<T> {
		const lockPath = this.getTargetLockPath(input.databaseFingerprint, input.targetOid);
		mkdirSync(join(lockPath, ".."), { recursive: true });
		let descriptor: number;
		try {
			descriptor = openSync(lockPath, "wx", 0o600);
		} catch {
			if (this.isStaleTargetLock(lockPath)) {
				this.guardStore.quarantine({
					databaseFingerprint: input.databaseFingerprint,
					targetOid: input.targetOid,
					targetKind: input.targetKind,
					canonicalPath: input.canonicalPath,
					reason: "process_interrupted",
					operation: input.action,
					operationId: `stale-lock:${input.planId}`,
					planId: input.planId,
					evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
				});
				throw new AscetMutationCoordinatorError(
					"mutation_target_quarantined",
					`Stale mutation lock for target OID ${input.targetOid} was quarantined as process_interrupted.`,
				);
			}
			throw new AscetMutationCoordinatorError(
				"mutation_target_busy",
				`Target OID ${input.targetOid} is already being mutated by another process.`,
			);
		}
		try {
			writeFileSync(
				descriptor,
				`${JSON.stringify({ databaseFingerprint: input.databaseFingerprint, targetOid: input.targetOid, pid: process.pid })}\n`,
				"utf8",
			);
			return await action();
		} finally {
			closeSync(descriptor);
			if (existsSync(lockPath)) unlinkSync(lockPath);
		}
	}

	private isStaleTargetLock(lockPath: string): boolean {
		if (!existsSync(lockPath)) return false;
		try {
			const value = JSON.parse(readFileSync(lockPath, "utf8")) as unknown;
			if (!value || typeof value !== "object" || !("pid" in value) || typeof value.pid !== "number") return true;
			try {
				process.kill(value.pid, 0);
				return false;
			} catch (error) {
				return isNodeError(error) && error.code === "ESRCH";
			}
		} catch {
			return true;
		}
	}
}

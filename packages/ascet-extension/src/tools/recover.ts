import { existsSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import {
	type AscetMutationGuardCheck,
	AscetMutationGuardStore,
	AscetMutationGuardStoreError,
} from "../edit/mutation-guard-store.ts";
import { type AscetMutationJournalStatus, AscetMutationJournalStore } from "../edit/mutation-journal-store.ts";
import {
	type AscetMutationAcceptCurrentResult,
	type AscetMutationReconcileWriteResult,
	runAscetMutationAcceptCurrent,
	runAscetMutationReconcileWrite,
} from "../edit/mutation-reconciliation.ts";
import { getAscetArtifactRoot } from "../observation-store.ts";
import { clearStaleAscetCliLock } from "../scheduler/cli-lock.ts";
import { createAscetSchedulerStatusReport } from "../scheduler/status.ts";
import { type AscetRuntimeStatusReport, createAscetRuntimeStatusReport } from "../status-runtime.ts";
import { toToolSuccessPayload } from "../tool-response-contract.ts";

export type AscetRecoverParams =
	| { action: "status" }
	| { action: "clear_extension_temp" }
	| { action: "scheduler_status" }
	| { action: "scheduler_recover" }
	| { action: "clear_stale_cli_lock" }
	| {
			action: "reconcile_mutation";
			mode: "inspect";
			databaseFingerprint: string;
			targetOid: string;
			expectedGeneration: number;
	  }
	| {
			action: "reconcile_mutation";
			mode: "rollback_to_before" | "cleanup_created" | "accept_current";
			databaseFingerprint: string;
			targetOid: string;
			expectedGeneration: number;
			intent: "apply";
	  };

export interface RunAscetRecoverOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	tempRoot?: string;
	createStatusReport?: (options: RunAscetRecoverOptions) => Promise<AscetRuntimeStatusReport>;
	signal?: AbortSignal;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	confirm?: (title: string, message: string) => Promise<boolean>;
}

export interface AscetMutationJournalInspection {
	status: AscetMutationJournalStatus;
	action: string;
	planId: string;
	planFingerprint: string;
	targetImpactFingerprint: string;
	beforeSnapshotFingerprint: string;
	desiredFingerprint: string;
	createdAt: string;
	updatedAt: string;
}
export interface AscetRecoverResult {
	ok: boolean;
	action: AscetRecoverParams["action"];
	data: {
		status?: AscetRuntimeStatusReport;
		schedulerStatus?: Awaited<ReturnType<typeof createAscetSchedulerStatusReport>>;
		tempRoot?: string;
		cleared?: boolean;
		staleLockCleared?: boolean;
		mutationGuard?: AscetMutationGuardCheck;
		mutationJournal?: AscetMutationJournalInspection;
		reconciliation?: AscetMutationReconcileWriteResult | AscetMutationAcceptCurrentResult;
	};
}

function getExtensionTempRoot(options: RunAscetRecoverOptions): string {
	return options.tempRoot ?? resolve(tmpdir(), "pi-ascet-extension");
}

export async function runAscetRecover(
	params: AscetRecoverParams,
	options: RunAscetRecoverOptions,
): Promise<AscetRecoverResult> {
	if (params.action === "reconcile_mutation" && params.mode !== "inspect") {
		const reconciliation =
			params.mode === "accept_current"
				? await runAscetMutationAcceptCurrent({ ...params, mode: "accept_current" }, options)
				: await runAscetMutationReconcileWrite({ ...params, mode: params.mode }, options);
		return { ok: true, action: params.action, data: { reconciliation } };
	}

	if (params.action === "reconcile_mutation") {
		const store = new AscetMutationGuardStore({
			artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
		});
		const mutationGuard = store.assertClear(params.databaseFingerprint, params.targetOid);
		if (mutationGuard.generation !== params.expectedGeneration) {
			throw new AscetMutationGuardStoreError(
				"guard_generation_mismatch",
				`Expected guard generation ${params.expectedGeneration}, current generation is ${mutationGuard.generation}.`,
			);
		}
		let mutationJournal: AscetMutationJournalInspection | undefined;
		const guardRecord = mutationGuard.record;
		if (guardRecord?.journalPath) {
			const journal = new AscetMutationJournalStore({
				artifactRoot: getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined),
			}).load(guardRecord.journalPath);
			if (
				journal.databaseFingerprint !== params.databaseFingerprint ||
				journal.targetOid !== params.targetOid ||
				journal.beforeSnapshotFingerprint !== guardRecord.beforeSnapshotFingerprint ||
				journal.desiredFingerprint !== guardRecord.desiredFingerprint
			) {
				throw new AscetMutationGuardStoreError(
					"guard_corrupt",
					"Mutation journal identity or fingerprints do not match the quarantine guard.",
				);
			}
			mutationJournal = {
				status: journal.status,
				action: journal.action,
				planId: journal.planId,
				planFingerprint: journal.planFingerprint,
				targetImpactFingerprint: journal.targetImpactFingerprint,
				beforeSnapshotFingerprint: journal.beforeSnapshotFingerprint,
				desiredFingerprint: journal.desiredFingerprint,
				createdAt: journal.createdAt,
				updatedAt: journal.updatedAt,
			};
		}
		return { ok: true, action: params.action, data: { mutationGuard, mutationJournal } };
	}
	if (params.action === "status") {
		return {
			ok: true,
			action: params.action,
			data: {
				status: await (options.createStatusReport ?? createAscetRuntimeStatusReport)(options),
			},
		};
	}

	if (params.action === "scheduler_status" || params.action === "scheduler_recover") {
		const schedulerStatus = await createAscetSchedulerStatusReport(
			params.action === "scheduler_recover" ? "recover" : "status",
			options,
		);
		return {
			ok: true,
			action: params.action,
			data: { schedulerStatus },
		};
	}

	if (params.action === "clear_stale_cli_lock") {
		return {
			ok: true,
			action: params.action,
			data: {
				staleLockCleared: await clearStaleAscetCliLock(options),
			},
		};
	}

	const tempRoot = getExtensionTempRoot(options);
	if (existsSync(tempRoot)) {
		rmSync(tempRoot, { recursive: true, force: true });
	}
	return {
		ok: true,
		action: params.action,
		data: {
			tempRoot,
			cleared: true,
		},
	};
}

export function formatAscetRecoverResult(result: AscetRecoverResult): string {
	if (result.action === "reconcile_mutation") {
		return JSON.stringify(
			toToolSuccessPayload(
				result.data.reconciliation
					? { reconciliation: result.data.reconciliation }
					: {
							mutationGuard: result.data.mutationGuard,
							mutationJournal: result.data.mutationJournal,
						},
			),
			null,
			2,
		);
	}
	if (result.action === "status") {
		return JSON.stringify(toToolSuccessPayload(result.data.status ?? {}), null, 2);
	}
	if (result.action === "scheduler_status" || result.action === "scheduler_recover") {
		return JSON.stringify(toToolSuccessPayload(result.data.schedulerStatus ?? {}), null, 2);
	}
	if (result.action === "clear_stale_cli_lock") {
		return JSON.stringify(toToolSuccessPayload({ staleLockCleared: result.data.staleLockCleared }), null, 2);
	}
	return JSON.stringify(toToolSuccessPayload({ path: result.data.tempRoot, cleared: result.data.cleared }), null, 2);
}

import { runAscetApplyElementSpec } from "../apply-element-spec.ts";
import type { AscetCliExecutionResult, AscetCliRequest } from "../cli.ts";
import { runAscetCliJson } from "../cli.ts";
import { getAscetDatabaseIdentity, runAscetGet } from "../get.ts";
import { getAscetArtifactRoot } from "../observation-store.ts";
import { unwrapToolSuccessPayload } from "../tool-response-contract.ts";
import {
	findElementSpecDocument,
	fingerprintJson,
	removeTemporaryElementSpec,
	writeTemporaryElementSpec,
} from "./element-spec-plan.ts";
import { AscetMutationGuardStore } from "./mutation-guard-store.ts";
import { AscetMutationJournalStore } from "./mutation-journal-store.ts";
import { classifyAscetEditExecution } from "./verification.ts";

export type AscetMutationReconcileWriteMode = "rollback_to_before" | "cleanup_created";

export interface AscetMutationReconcileWriteParams {
	mode: AscetMutationReconcileWriteMode;
	databaseFingerprint: string;
	targetOid: string;
	expectedGeneration: number;
	intent: "apply";
}

export interface AscetMutationReconcileWriteOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	confirm?: (title: string, message: string) => Promise<boolean>;
}

export interface AscetMutationReconcileWriteResult {
	mode: AscetMutationReconcileWriteMode;
	status: "rolled_back";
	generation: number;
	evidenceFingerprint: string;
	removedElements: string[];
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function records(value: unknown): Record<string, unknown>[] {
	return Array.isArray(value) && value.every(isRecord) ? value : [];
}

function text(record: Record<string, unknown> | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function sortedElements(elements: readonly Record<string, unknown>[]): Record<string, unknown>[] {
	return [...elements].sort((left, right) => String(left.name ?? "").localeCompare(String(right.name ?? "")));
}

function elementFingerprint(elements: readonly Record<string, unknown>[]): string {
	return fingerprintJson({ elements: sortedElements(elements) });
}

async function readCatalog(
	componentPath: string,
	options: AscetMutationReconcileWriteOptions,
): Promise<{ identity: Record<string, unknown>; elements: Record<string, unknown>[] }> {
	const raw = await runAscetCliJson(["exec", "read_element_catalog", componentPath, "--json"], {
		...options,
		commandId: "read_element_catalog",
		jobKind: "read",
	});
	if (!raw.ok) throw new Error(`reconciliation_catalog_read_failed:${raw.error?.code ?? "unknown"}`);
	const catalog = findElementSpecDocument(raw.data);
	if (!catalog || !isRecord(catalog.identity)) throw new Error("reconciliation_catalog_invalid");
	return { identity: catalog.identity, elements: catalog.elements };
}

function quarantineAgain(
	guardStore: AscetMutationGuardStore,
	guard: NonNullable<ReturnType<AscetMutationGuardStore["assertClear"]>["record"]>,
	journalPath: string,
	beforeSnapshotFingerprint: string,
	desiredFingerprint: string,
): void {
	guardStore.quarantine({
		databaseFingerprint: guard.databaseFingerprint,
		targetOid: guard.targetOid,
		targetKind: guard.targetKind,
		canonicalPath: guard.canonicalPath,
		reason: "rollback_failed",
		operation: guard.operation ?? "reconcile_mutation",
		operationId: guard.operationId ?? `reconcile:${guard.targetOid}`,
		...(guard.planId ? { planId: guard.planId } : {}),
		journalPath,
		beforeSnapshotFingerprint,
		desiredFingerprint,
		evidence: { bridgeEntered: true, backendResponseReceived: false, mutationStarted: true },
	});
}

export async function runAscetMutationReconcileWrite(
	params: AscetMutationReconcileWriteParams,
	options: AscetMutationReconcileWriteOptions,
): Promise<AscetMutationReconcileWriteResult> {
	const artifactRoot = getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined);
	const guardStore = new AscetMutationGuardStore({ artifactRoot });
	const guardCheck = guardStore.assertClear(params.databaseFingerprint, params.targetOid);
	if (
		guardCheck.generation !== params.expectedGeneration ||
		!guardCheck.record ||
		guardCheck.record.status !== "quarantined"
	) {
		throw new Error("reconciliation_guard_changed");
	}
	const guard = guardCheck.record;
	if (!guard.journalPath || !guard.beforeSnapshotFingerprint || !guard.desiredFingerprint) {
		throw new Error("reconciliation_journal_required");
	}
	const journalStore = new AscetMutationJournalStore({ artifactRoot });
	const journal = journalStore.load(guard.journalPath);
	if (
		journal.databaseFingerprint !== params.databaseFingerprint ||
		journal.targetOid !== params.targetOid ||
		journal.beforeSnapshotFingerprint !== guard.beforeSnapshotFingerprint ||
		journal.desiredFingerprint !== guard.desiredFingerprint
	) {
		throw new Error("reconciliation_evidence_mismatch");
	}
	if (journal.action !== "apply_element_spec") throw new Error("reconciliation_action_not_supported");
	if (
		!options.confirm ||
		!(await options.confirm(
			"Confirm ASCET mutation reconciliation",
			`mode: ${params.mode}\ntargetOid: ${params.targetOid}\ngeneration: ${params.expectedGeneration}\nplanId: ${journal.planId}`,
		))
	) {
		throw new Error("reconciliation_confirmation_not_granted");
	}

	const reconciling = guardStore.beginReconciliation({
		databaseFingerprint: params.databaseFingerprint,
		targetOid: params.targetOid,
		expectedGeneration: params.expectedGeneration,
		mode: params.mode,
	});
	let specFile: string | undefined;
	try {
		const identityRaw = await runAscetGet({ action: "database_identity" }, options);
		const identityPayload = unwrapToolSuccessPayload(identityRaw.data);
		const currentIdentity = isRecord(identityPayload) ? getAscetDatabaseIdentity(identityPayload) : undefined;
		if (!identityRaw.ok || currentIdentity?.fingerprint !== params.databaseFingerprint) {
			throw new Error("reconciliation_database_identity_mismatch");
		}

		const beforePreflight = isRecord(journal.beforeSnapshot) ? journal.beforeSnapshot : undefined;
		const beforeCatalog = isRecord(beforePreflight?.catalogSnapshot) ? beforePreflight.catalogSnapshot : undefined;
		const beforeElements = records(beforeCatalog?.elements);
		if (beforeElements.length === 0 && !Array.isArray(beforeCatalog?.elements)) {
			throw new Error("reconciliation_before_snapshot_incomplete");
		}
		const liveBefore = await readCatalog(journal.canonicalPath, options);
		const componentOid = text(liveBefore.identity, "componentOID") ?? text(liveBefore.identity, "componentOid");
		if (componentOid !== params.targetOid) throw new Error("reconciliation_target_identity_mismatch");

		const normalizedSpec = isRecord(beforePreflight?.normalizedSpec) ? beforePreflight.normalizedSpec : undefined;
		const desiredNames = new Set(records(normalizedSpec?.elements).map((element) => String(element.name ?? "")));
		const beforeNames = new Set(beforeElements.map((element) => String(element.name ?? "")));
		const createdNames = [...desiredNames].filter((name) => name.length > 0 && !beforeNames.has(name)).sort();
		const expectedElements =
			params.mode === "rollback_to_before"
				? beforeElements
				: liveBefore.elements.filter((element) => !createdNames.includes(String(element.name ?? "")));
		specFile = writeTemporaryElementSpec({ elements: expectedElements }, artifactRoot);
		const raw = await runAscetApplyElementSpec(
			{
				componentPath: journal.canonicalPath,
				specFile,
				mode: "restore",
				intent: "apply",
				elementIntent: "restore",
				deleteMissing: true,
				recreateIncompatible: params.mode === "rollback_to_before",
				verifyReadback: true,
			},
			options,
		);
		const classification = classifyAscetEditExecution(raw);
		if (classification.mutationStatus !== "applied" && classification.mutationStatus !== "rolled_back") {
			journalStore.update(guard.journalPath, {
				status: "unknown",
				evidence: { bridgeEntered: true, backendResponseReceived: raw.ok, mutationStarted: true },
				...(raw.operationId ? { operationId: raw.operationId } : {}),
				...(raw.error?.code ? { errorCode: raw.error.code } : {}),
			});
			throw new Error("reconciliation_write_outcome_unknown");
		}
		const liveAfter = await readCatalog(journal.canonicalPath, options);
		if (elementFingerprint(liveAfter.elements) !== elementFingerprint(expectedElements)) {
			throw new Error("reconciliation_readback_mismatch");
		}
		const evidenceFingerprint = `sha256:${fingerprintJson({
			mode: params.mode,
			databaseFingerprint: params.databaseFingerprint,
			targetOid: params.targetOid,
			journalBefore: journal.beforeSnapshotFingerprint,
			journalDesired: journal.desiredFingerprint,
			readback: elementFingerprint(liveAfter.elements),
		})}`;
		journalStore.update(guard.journalPath, {
			status: "rolled_back",
			evidence: { bridgeEntered: true, backendResponseReceived: true, mutationStarted: true },
			...(raw.operationId ? { operationId: raw.operationId } : {}),
		});
		const cleared = guardStore.clear({
			databaseFingerprint: params.databaseFingerprint,
			targetOid: params.targetOid,
			expectedGeneration: reconciling.generation,
			reconciliationEvidenceFingerprint: evidenceFingerprint,
		});
		return {
			mode: params.mode,
			status: "rolled_back",
			generation: cleared.generation,
			evidenceFingerprint,
			removedElements: params.mode === "cleanup_created" ? createdNames : [],
		};
	} catch (error) {
		const current = guardStore.assertClear(params.databaseFingerprint, params.targetOid).record;
		if (current?.status === "reconciling") {
			quarantineAgain(
				guardStore,
				current,
				guard.journalPath,
				journal.beforeSnapshotFingerprint,
				journal.desiredFingerprint,
			);
		}
		throw error;
	} finally {
		if (specFile) removeTemporaryElementSpec(specFile);
	}
}
export interface AscetMutationAcceptCurrentParams {
	mode: "accept_current";
	databaseFingerprint: string;
	targetOid: string;
	expectedGeneration: number;
	intent: "apply";
}

export interface AscetMutationAcceptCurrentResult {
	mode: "accept_current";
	status: "accepted_current";
	generation: number;
	evidenceFingerprint: string;
}

export async function runAscetMutationAcceptCurrent(
	params: AscetMutationAcceptCurrentParams,
	options: AscetMutationReconcileWriteOptions,
): Promise<AscetMutationAcceptCurrentResult> {
	const artifactRoot = getAscetArtifactRoot(options.env as NodeJS.ProcessEnv | undefined);
	const guardStore = new AscetMutationGuardStore({ artifactRoot });
	const guardCheck = guardStore.assertClear(params.databaseFingerprint, params.targetOid);
	if (
		guardCheck.generation !== params.expectedGeneration ||
		!guardCheck.record ||
		guardCheck.record.status !== "quarantined"
	) {
		throw new Error("reconciliation_guard_changed");
	}
	const guard = guardCheck.record;
	if (!guard.journalPath || !guard.beforeSnapshotFingerprint || !guard.desiredFingerprint) {
		throw new Error("reconciliation_journal_required");
	}
	const journalStore = new AscetMutationJournalStore({ artifactRoot });
	const journal = journalStore.load(guard.journalPath);
	if (
		journal.databaseFingerprint !== params.databaseFingerprint ||
		journal.targetOid !== params.targetOid ||
		journal.beforeSnapshotFingerprint !== guard.beforeSnapshotFingerprint ||
		journal.desiredFingerprint !== guard.desiredFingerprint
	) {
		throw new Error("reconciliation_evidence_mismatch");
	}
	if (journal.action !== "apply_element_spec") throw new Error("reconciliation_action_not_supported");
	if (
		!options.confirm ||
		!(await options.confirm(
			"Confirm current ASCET mutation state",
			`mode: accept_current\ntargetOid: ${params.targetOid}\ngeneration: ${params.expectedGeneration}\nplanId: ${journal.planId}`,
		))
	) {
		throw new Error("reconciliation_confirmation_not_granted");
	}
	const reconciling = guardStore.beginReconciliation({
		databaseFingerprint: params.databaseFingerprint,
		targetOid: params.targetOid,
		expectedGeneration: params.expectedGeneration,
		mode: "accept_current",
	});
	try {
		const identityRaw = await runAscetGet({ action: "database_identity" }, options);
		const identityPayload = unwrapToolSuccessPayload(identityRaw.data);
		const currentIdentity = isRecord(identityPayload) ? getAscetDatabaseIdentity(identityPayload) : undefined;
		if (!identityRaw.ok || currentIdentity?.fingerprint !== params.databaseFingerprint) {
			throw new Error("reconciliation_database_identity_mismatch");
		}
		const beforePreflight = isRecord(journal.beforeSnapshot) ? journal.beforeSnapshot : undefined;
		const beforeCatalog = isRecord(beforePreflight?.catalogSnapshot) ? beforePreflight.catalogSnapshot : undefined;
		const beforeElements = records(beforeCatalog?.elements);
		if (beforeElements.length === 0 && !Array.isArray(beforeCatalog?.elements)) {
			throw new Error("reconciliation_before_snapshot_incomplete");
		}
		const normalizedSpec = isRecord(beforePreflight?.normalizedSpec) ? beforePreflight.normalizedSpec : undefined;
		const desiredElements = records(normalizedSpec?.elements);
		const attemptedMutation = isRecord(journal.attemptedMutation) ? journal.attemptedMutation : undefined;
		const expectedByName = new Map<string, Record<string, unknown>>();
		if (attemptedMutation?.deleteMissing !== true) {
			for (const element of beforeElements) expectedByName.set(String(element.name ?? ""), element);
		}
		for (const element of desiredElements) expectedByName.set(String(element.name ?? ""), element);
		const expectedElements = [...expectedByName.values()];
		const live = await readCatalog(journal.canonicalPath, options);
		const componentOid = text(live.identity, "componentOID") ?? text(live.identity, "componentOid");
		if (componentOid !== params.targetOid) throw new Error("reconciliation_target_identity_mismatch");
		if (elementFingerprint(live.elements) !== elementFingerprint(expectedElements)) {
			throw new Error("reconciliation_current_state_mismatch");
		}
		const evidenceFingerprint = `sha256:${fingerprintJson({
			mode: "accept_current",
			databaseFingerprint: params.databaseFingerprint,
			targetOid: params.targetOid,
			journalBefore: journal.beforeSnapshotFingerprint,
			journalDesired: journal.desiredFingerprint,
			readback: elementFingerprint(live.elements),
		})}`;
		journalStore.update(guard.journalPath, {
			status: "applied",
			evidence: { bridgeEntered: true, backendResponseReceived: true, mutationStarted: true },
		});
		const cleared = guardStore.clear({
			databaseFingerprint: params.databaseFingerprint,
			targetOid: params.targetOid,
			expectedGeneration: reconciling.generation,
			reconciliationEvidenceFingerprint: evidenceFingerprint,
		});
		return {
			mode: "accept_current",
			status: "accepted_current",
			generation: cleared.generation,
			evidenceFingerprint,
		};
	} catch (error) {
		const current = guardStore.assertClear(params.databaseFingerprint, params.targetOid).record;
		if (current?.status === "reconciling") {
			quarantineAgain(
				guardStore,
				current,
				guard.journalPath,
				journal.beforeSnapshotFingerprint,
				journal.desiredFingerprint,
			);
		}
		throw error;
	}
}

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
import { join, resolve } from "node:path";
import { getAscetArtifactRoot } from "../observation-store.ts";

export const ASCET_PLAN_RECORD_VERSION = 3;
export const DEFAULT_ASCET_PLAN_TTL_MS = 5 * 60 * 1000;

export type AscetPlanStoreErrorCode =
	| "invalid_plan_input"
	| "invalid_plan_id"
	| "plan_id_conflict"
	| "plan_not_found"
	| "plan_corrupt"
	| "plan_version_unsupported"
	| "plan_expired"
	| "plan_consumed"
	| "plan_executing"
	| "plan_state_mismatch"
	| "plan_busy"
	| "plan_operation_mismatch"
	| "plan_id_mismatch"
	| "plan_binding_mismatch"
	| "plan_database_identity_missing"
	| "plan_target_identity_missing"
	| "plan_contract_mismatch"
	| "plan_database_identity_mismatch"
	| "plan_target_identity_mismatch"
	| "plan_target_impact_mismatch"
	| "plan_guard_generation_mismatch"
	| "plan_evidence_mismatch"
	| "stale_plan";

export type AscetPlanJsonPrimitive = string | number | boolean | null;
export type AscetPlanJsonValue = AscetPlanJsonPrimitive | AscetPlanJsonValue[] | { [key: string]: AscetPlanJsonValue };

export interface AscetPlanBinding {
	workspace: string;
	agentId: string;
	sessionId: string;
}

export interface AscetPlanDatabaseIdentity {
	name?: string;
	path: string;
	fingerprint: string;
}

export interface AscetPlanTargetIdentity {
	path: string;
	oid: string;
	kind: string;
}

export type AscetPlanState = "planned" | "executing" | "consumed";

export interface AscetPlanRecord {
	version: 3;
	state: AscetPlanState;
	planId: string;
	operation: string;
	params: AscetPlanJsonValue;
	binding: AscetPlanBinding;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetPlanJsonValue;
	guardGeneration: number;
	backendPreflight: AscetPlanJsonValue;
	evidenceFingerprint: string;
	contractFingerprint: string;
	planFingerprint: string;
	createdAt: string;
	expiresAt: string;
	executingAt?: string;
	consumedAt?: string;
}

export interface CreateAscetPlanInput {
	operation: string;
	params: AscetPlanJsonValue;
	binding: AscetPlanBinding;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetPlanJsonValue;
	guardGeneration: number;
	backendPreflight: AscetPlanJsonValue;
	contractFingerprint: string;
	ttlMs?: number;
	expiresAt?: string;
	planId?: string;
}

export interface VerifyAscetPlanInput {
	planId: string;
	operation: string;
	params: AscetPlanJsonValue;
	binding: AscetPlanBinding;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetPlanJsonValue;
	guardGeneration: number;
	backendPreflight: AscetPlanJsonValue;
	contractFingerprint: string;
}

export interface AscetPlanStoreOptions {
	artifactRoot?: string;
	now?: () => Date;
	defaultTtlMs?: number;
	generatePlanId?: () => string;
}

export interface AscetPlanStoreErrorDetails {
	[key: string]: unknown;
}

export class AscetPlanStoreError extends Error {
	readonly code: AscetPlanStoreErrorCode;
	readonly details: AscetPlanStoreErrorDetails;

	public constructor(code: AscetPlanStoreErrorCode, message: string, details: AscetPlanStoreErrorDetails = {}) {
		super(message);
		this.name = "AscetPlanStoreError";
		this.code = code;
		this.details = details;
	}
}

const SAFE_PLAN_ID = /^[A-Za-z0-9][A-Za-z0-9_-]{0,127}$/u;
const FINGERPRINT = /^[a-f0-9]{64}$/u;
let temporaryFileCounter = 0;
const runtimeSessionId = randomUUID();

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function isJsonValue(value: unknown): value is AscetPlanJsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") return true;
	if (typeof value === "number") return Number.isFinite(value);
	if (Array.isArray(value)) return value.every((entry) => isJsonValue(entry));
	if (!isObject(value)) return false;
	const prototype = Object.getPrototypeOf(value);
	return (prototype === Object.prototype || prototype === null) && Object.values(value).every(isJsonValue);
}

function canonicalize(value: AscetPlanJsonValue): string {
	if (value === null) return "null";
	if (typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) return `[${value.map(canonicalize).join(",")}]`;
	return `{${Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`)
		.join(",")}}`;
}

function fingerprint(value: AscetPlanJsonValue): string {
	return createHash("sha256").update(canonicalize(value), "utf8").digest("hex");
}

function requireJsonValue(value: unknown, description: string): AscetPlanJsonValue {
	if (!isJsonValue(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", `${description} must be a JSON value.`, { description });
	}
	return value;
}

function requireNonEmpty(value: unknown, description: string): string {
	if (typeof value !== "string" || value.trim().length === 0) {
		throw new AscetPlanStoreError("invalid_plan_input", `${description} must be a non-empty string.`, {
			description,
		});
	}
	return value;
}

function requireFingerprint(value: unknown, description: string): string {
	if (typeof value !== "string" || !FINGERPRINT.test(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", `${description} must be a lowercase SHA-256 fingerprint.`, {
			description,
		});
	}
	return value;
}

function requireOperation(operation: string): string {
	return requireNonEmpty(operation, "operation");
}

function requirePlanId(planId: string): string {
	if (!SAFE_PLAN_ID.test(planId)) {
		throw new AscetPlanStoreError("invalid_plan_id", `Unsafe planId: ${planId}`, { planId });
	}
	return planId;
}

function parseTimestamp(value: string, description: string): number {
	const timestamp = Date.parse(value);
	if (!Number.isFinite(timestamp)) {
		throw new AscetPlanStoreError("plan_corrupt", `${description} is not a valid timestamp.`, { value });
	}
	return timestamp;
}

function assertDate(date: Date, description: string): Date {
	if (!Number.isFinite(date.getTime())) {
		throw new AscetPlanStoreError("invalid_plan_input", `${description} must be a valid Date.`);
	}
	return date;
}

function requireBinding(value: unknown): AscetPlanBinding {
	if (!isObject(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", "binding must be an object.");
	}
	return {
		workspace: requireNonEmpty(value.workspace, "binding.workspace"),
		agentId: requireNonEmpty(value.agentId, "binding.agentId"),
		sessionId: requireNonEmpty(value.sessionId, "binding.sessionId"),
	};
}

function requireDatabaseIdentity(value: unknown): AscetPlanDatabaseIdentity {
	if (!isObject(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", "databaseIdentity must be an object.");
	}
	const name = value.name === undefined ? undefined : requireNonEmpty(value.name, "databaseIdentity.name");
	return {
		...(name === undefined ? {} : { name }),
		path: requireNonEmpty(value.path, "databaseIdentity.path"),
		fingerprint: requireFingerprint(value.fingerprint, "databaseIdentity.fingerprint"),
	};
}

function requireTargetIdentity(value: unknown): AscetPlanTargetIdentity {
	if (!isObject(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", "targetIdentity must be an object.");
	}
	return {
		path: requireNonEmpty(value.path, "targetIdentity.path"),
		oid: requireNonEmpty(value.oid, "targetIdentity.oid"),
		kind: requireNonEmpty(value.kind, "targetIdentity.kind"),
	};
}

function bindingJson(binding: AscetPlanBinding): AscetPlanJsonValue {
	return { workspace: binding.workspace, agentId: binding.agentId, sessionId: binding.sessionId };
}

function databaseIdentityJson(identity: AscetPlanDatabaseIdentity): AscetPlanJsonValue {
	return {
		...(identity.name === undefined ? {} : { name: identity.name }),
		path: identity.path,
		fingerprint: identity.fingerprint,
	};
}

function targetIdentityJson(identity: AscetPlanTargetIdentity): AscetPlanJsonValue {
	return { path: identity.path, oid: identity.oid, kind: identity.kind };
}

function requireGuardGeneration(value: unknown): number {
	if (!Number.isSafeInteger(value) || (value as number) < 0) {
		throw new AscetPlanStoreError("invalid_plan_input", "guardGeneration must be a non-negative safe integer.", {
			guardGeneration: value,
		});
	}
	return value as number;
}

function requirePlanState(value: unknown): AscetPlanState {
	if (value !== "planned" && value !== "executing" && value !== "consumed") {
		throw new AscetPlanStoreError("plan_corrupt", `Persisted plan state is invalid: ${String(value)}.`);
	}
	return value;
}

export function canonicalizeAscetPlanJson(value: AscetPlanJsonValue): string {
	return canonicalize(requireJsonValue(value, "value"));
}

export function createAscetPlanBinding(input: { cwd: string; agentId?: string; sessionId?: string }): AscetPlanBinding {
	return {
		workspace: resolve(input.cwd),
		agentId: input.agentId?.trim() || "system",
		sessionId: input.sessionId?.trim() || runtimeSessionId,
	};
}

export function createAscetPlanContractFingerprint(contract: AscetPlanJsonValue): string {
	return fingerprint(requireJsonValue(contract, "contract"));
}

export function createAscetPlanEvidenceFingerprint(
	backendPreflight: AscetPlanJsonValue,
	databaseIdentity: AscetPlanDatabaseIdentity,
	targetIdentity: AscetPlanTargetIdentity,
	targetImpact: AscetPlanJsonValue,
	guardGeneration: number,
): string {
	return fingerprint({
		backendPreflight: requireJsonValue(backendPreflight, "backendPreflight"),
		databaseIdentity: databaseIdentityJson(requireDatabaseIdentity(databaseIdentity)),
		targetIdentity: targetIdentityJson(requireTargetIdentity(targetIdentity)),
		targetImpact: requireJsonValue(targetImpact, "targetImpact"),
		guardGeneration: requireGuardGeneration(guardGeneration),
	});
}

export function createAscetPlanFingerprint(input: {
	operation: string;
	params: AscetPlanJsonValue;
	binding: AscetPlanBinding;
	databaseIdentity: AscetPlanDatabaseIdentity;
	targetIdentity: AscetPlanTargetIdentity;
	targetImpact: AscetPlanJsonValue;
	guardGeneration: number;
	evidenceFingerprint: string;
	contractFingerprint: string;
}): string {
	return fingerprint({
		version: ASCET_PLAN_RECORD_VERSION,
		operation: requireOperation(input.operation),
		params: requireJsonValue(input.params, "params"),
		binding: bindingJson(requireBinding(input.binding)),
		databaseIdentity: databaseIdentityJson(requireDatabaseIdentity(input.databaseIdentity)),
		targetIdentity: targetIdentityJson(requireTargetIdentity(input.targetIdentity)),
		targetImpact: requireJsonValue(input.targetImpact, "targetImpact"),
		guardGeneration: requireGuardGeneration(input.guardGeneration),
		evidenceFingerprint: requireFingerprint(input.evidenceFingerprint, "evidenceFingerprint"),
		contractFingerprint: requireFingerprint(input.contractFingerprint, "contractFingerprint"),
	});
}

function parsePlanRecord(value: unknown): AscetPlanRecord {
	if (!isObject(value)) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan is not a JSON object.");
	}
	if (value.version !== ASCET_PLAN_RECORD_VERSION) {
		throw new AscetPlanStoreError(
			"plan_version_unsupported",
			`Persisted plan version is unsupported: ${String(value.version ?? "missing")}.`,
			{ version: value.version },
		);
	}
	try {
		const state = requirePlanState(value.state);
		const planId = requirePlanId(requireNonEmpty(value.planId, "planId"));
		const operation = requireOperation(requireNonEmpty(value.operation, "operation"));
		const params = requireJsonValue(value.params, "params");
		const binding = requireBinding(value.binding);
		const databaseIdentity = requireDatabaseIdentity(value.databaseIdentity);
		const targetIdentity = requireTargetIdentity(value.targetIdentity);
		const targetImpact = requireJsonValue(value.targetImpact, "targetImpact");
		const guardGeneration = requireGuardGeneration(value.guardGeneration);
		const backendPreflight = requireJsonValue(value.backendPreflight, "backendPreflight");
		const evidenceFingerprint = requireFingerprint(value.evidenceFingerprint, "evidenceFingerprint");
		const contractFingerprint = requireFingerprint(value.contractFingerprint, "contractFingerprint");
		const planFingerprint = requireFingerprint(value.planFingerprint, "planFingerprint");
		const createdAt = requireNonEmpty(value.createdAt, "createdAt");
		const expiresAt = requireNonEmpty(value.expiresAt, "expiresAt");
		const executingAt =
			value.executingAt === undefined ? undefined : requireNonEmpty(value.executingAt, "executingAt");
		const consumedAt = value.consumedAt === undefined ? undefined : requireNonEmpty(value.consumedAt, "consumedAt");
		const createdTimestamp = parseTimestamp(createdAt, "createdAt");
		const expiresTimestamp = parseTimestamp(expiresAt, "expiresAt");
		if (expiresTimestamp <= createdTimestamp) {
			throw new AscetPlanStoreError("plan_corrupt", "Persisted plan expires before or at creation time.", {
				createdAt,
				expiresAt,
			});
		}
		if (executingAt !== undefined) parseTimestamp(executingAt, "executingAt");
		if (consumedAt !== undefined) parseTimestamp(consumedAt, "consumedAt");
		if (state === "planned" && (executingAt !== undefined || consumedAt !== undefined)) {
			throw new AscetPlanStoreError("plan_corrupt", "A planned record must not contain execution timestamps.");
		}
		if (state === "executing" && (executingAt === undefined || consumedAt !== undefined)) {
			throw new AscetPlanStoreError("plan_corrupt", "An executing record requires executingAt and no consumedAt.");
		}
		if (state === "consumed" && (executingAt === undefined || consumedAt === undefined)) {
			throw new AscetPlanStoreError("plan_corrupt", "A consumed record requires executingAt and consumedAt.");
		}
		const expectedEvidenceFingerprint = createAscetPlanEvidenceFingerprint(
			backendPreflight,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
		);
		if (expectedEvidenceFingerprint !== evidenceFingerprint) {
			throw new AscetPlanStoreError(
				"plan_corrupt",
				"Persisted plan evidence fingerprint does not match its contents.",
				{
					planId,
					evidenceFingerprint,
					expectedEvidenceFingerprint,
				},
			);
		}
		const expectedPlanFingerprint = createAscetPlanFingerprint({
			operation,
			params,
			binding,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
			evidenceFingerprint,
			contractFingerprint,
		});
		if (expectedPlanFingerprint !== planFingerprint) {
			throw new AscetPlanStoreError("plan_corrupt", "Persisted plan fingerprint does not match its contents.", {
				planId,
				planFingerprint,
				expectedPlanFingerprint,
			});
		}
		return {
			version: ASCET_PLAN_RECORD_VERSION,
			state,
			planId,
			operation,
			params,
			binding,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
			backendPreflight,
			evidenceFingerprint,
			contractFingerprint,
			planFingerprint,
			createdAt,
			expiresAt,
			...(executingAt === undefined ? {} : { executingAt }),
			...(consumedAt === undefined ? {} : { consumedAt }),
		};
	} catch (error) {
		if (error instanceof AscetPlanStoreError && error.code === "plan_corrupt") throw error;
		if (error instanceof AscetPlanStoreError) {
			throw new AscetPlanStoreError("plan_corrupt", error.message, error.details);
		}
		throw error;
	}
}

function serializePlan(record: AscetPlanRecord): string {
	return `${canonicalize(record as unknown as AscetPlanJsonValue)}\n`;
}

export class AscetPlanStore {
	private readonly artifactRoot: string;
	private readonly now: () => Date;
	private readonly defaultTtlMs: number;
	private readonly generatePlanId: () => string;

	public constructor(options: AscetPlanStoreOptions = {}) {
		this.artifactRoot = options.artifactRoot ?? getAscetArtifactRoot();
		this.now = options.now ?? (() => new Date());
		this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_ASCET_PLAN_TTL_MS;
		this.generatePlanId = options.generatePlanId ?? randomUUID;
		if (!Number.isFinite(this.defaultTtlMs) || this.defaultTtlMs <= 0) {
			throw new AscetPlanStoreError("invalid_plan_input", "defaultTtlMs must be a positive finite number.", {
				defaultTtlMs: this.defaultTtlMs,
			});
		}
	}

	public create(input: CreateAscetPlanInput): AscetPlanRecord {
		const operation = requireOperation(input.operation);
		const params = requireJsonValue(input.params, "params");
		const binding = requireBinding(input.binding);
		const databaseIdentity = requireDatabaseIdentity(input.databaseIdentity);
		const targetIdentity = requireTargetIdentity(input.targetIdentity);
		const targetImpact = requireJsonValue(input.targetImpact, "targetImpact");
		const guardGeneration = requireGuardGeneration(input.guardGeneration);
		const backendPreflight = requireJsonValue(input.backendPreflight, "backendPreflight");
		const contractFingerprint = requireFingerprint(input.contractFingerprint, "contractFingerprint");
		const created = assertDate(this.now(), "now");
		const expiresAt = this.resolveExpiration(created, input);
		const planId = requirePlanId(input.planId ?? this.generatePlanId());
		const filePath = this.planPath(planId);
		if (existsSync(filePath)) {
			throw new AscetPlanStoreError("plan_id_conflict", `Plan already exists: ${planId}`, { planId });
		}
		const evidenceFingerprint = createAscetPlanEvidenceFingerprint(
			backendPreflight,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
		);
		const planFingerprint = createAscetPlanFingerprint({
			operation,
			params,
			binding,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
			evidenceFingerprint,
			contractFingerprint,
		});
		const record: AscetPlanRecord = {
			version: ASCET_PLAN_RECORD_VERSION,
			state: "planned",
			planId,
			operation,
			params,
			binding,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
			backendPreflight,
			evidenceFingerprint,
			contractFingerprint,
			planFingerprint,
			createdAt: created.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};
		this.writeRecord(filePath, record);
		return record;
	}

	public load(planId: string): AscetPlanRecord {
		const record = this.readRecord(planId);
		this.assertAvailable(record);
		return record;
	}

	public verify(input: VerifyAscetPlanInput): AscetPlanRecord {
		const record = this.load(input.planId);
		this.assertMatches(record, input);
		return record;
	}

	public beginExecution(input: VerifyAscetPlanInput): AscetPlanRecord {
		return this.withTransitionLock(input.planId, () => {
			const record = this.readRecord(input.planId);
			this.assertAvailable(record);
			this.assertMatches(record, input);
			const executingRecord: AscetPlanRecord = {
				...record,
				state: "executing",
				executingAt: assertDate(this.now(), "now").toISOString(),
			};
			this.writeRecord(this.planPath(input.planId), executingRecord);
			return executingRecord;
		});
	}

	public consume(input: VerifyAscetPlanInput): AscetPlanRecord {
		return this.withTransitionLock(input.planId, () => {
			const record = this.readRecord(input.planId);
			if (record.state === "consumed") {
				throw new AscetPlanStoreError("plan_consumed", `Plan has already been consumed: ${record.planId}`, {
					planId: record.planId,
					consumedAt: record.consumedAt,
				});
			}
			if (record.state !== "executing") {
				throw new AscetPlanStoreError("plan_state_mismatch", `Plan is not executing: ${record.planId}`, {
					planId: record.planId,
					state: record.state,
				});
			}
			this.assertMatches(record, input);
			const consumedRecord: AscetPlanRecord = {
				...record,
				state: "consumed",
				consumedAt: assertDate(this.now(), "now").toISOString(),
			};
			this.writeRecord(this.planPath(input.planId), consumedRecord);
			return consumedRecord;
		});
	}

	private withTransitionLock<T>(planIdValue: string, action: () => T): T {
		const planId = requirePlanId(planIdValue);
		const filePath = this.planPath(planId);
		mkdirSync(this.planDirectory(), { recursive: true });
		const lockPath = `${filePath}.consume.lock`;
		let lockHandle: number | undefined;
		try {
			try {
				lockHandle = openSync(lockPath, "wx");
			} catch (error) {
				if (this.isFileExistsError(error)) {
					throw new AscetPlanStoreError("plan_busy", `Plan is currently being updated: ${planId}`, { planId });
				}
				throw error;
			}
			return action();
		} finally {
			if (lockHandle !== undefined) {
				closeSync(lockHandle);
				if (existsSync(lockPath)) unlinkSync(lockPath);
			}
		}
	}

	private resolveExpiration(created: Date, input: CreateAscetPlanInput): Date {
		if (input.expiresAt !== undefined && input.ttlMs !== undefined) {
			throw new AscetPlanStoreError("invalid_plan_input", "Specify either expiresAt or ttlMs, not both.");
		}
		const expiration = input.expiresAt
			? new Date(parseTimestamp(input.expiresAt, "expiresAt"))
			: new Date(created.getTime() + (input.ttlMs ?? this.defaultTtlMs));
		if (
			(input.ttlMs !== undefined && (!Number.isFinite(input.ttlMs) || input.ttlMs <= 0)) ||
			!Number.isFinite(expiration.getTime()) ||
			expiration.getTime() <= created.getTime()
		) {
			throw new AscetPlanStoreError("invalid_plan_input", "Plan expiration must be after creation time.", {
				expiresAt: input.expiresAt,
				ttlMs: input.ttlMs,
			});
		}
		return expiration;
	}

	private planDirectory(): string {
		return join(this.artifactRoot, "plans");
	}

	private planPath(planId: string): string {
		return join(this.planDirectory(), `${requirePlanId(planId)}.json`);
	}

	private readRecord(planId: string): AscetPlanRecord {
		const safePlanId = requirePlanId(planId);
		const filePath = this.planPath(safePlanId);
		if (!existsSync(filePath)) {
			throw new AscetPlanStoreError("plan_not_found", `Plan not found: ${safePlanId}`, { planId: safePlanId });
		}
		let parsed: unknown;
		try {
			parsed = JSON.parse(readFileSync(filePath, "utf8")) as unknown;
		} catch (error) {
			throw new AscetPlanStoreError("plan_corrupt", `Unable to read plan: ${safePlanId}`, {
				planId: safePlanId,
				reason: error instanceof Error ? error.message : String(error),
			});
		}
		const record = parsePlanRecord(parsed);
		if (record.planId !== safePlanId) {
			throw new AscetPlanStoreError("plan_id_mismatch", `Plan file identity does not match planId: ${safePlanId}`, {
				planId: safePlanId,
				recordedPlanId: record.planId,
			});
		}
		return record;
	}

	private assertAvailable(record: AscetPlanRecord): void {
		if (record.state === "consumed") {
			throw new AscetPlanStoreError("plan_consumed", `Plan has already been consumed: ${record.planId}`, {
				planId: record.planId,
				consumedAt: record.consumedAt,
			});
		}
		if (record.state === "executing") {
			throw new AscetPlanStoreError("plan_executing", `Plan execution has already started: ${record.planId}`, {
				planId: record.planId,
				executingAt: record.executingAt,
			});
		}
		if (assertDate(this.now(), "now").getTime() >= parseTimestamp(record.expiresAt, "expiresAt")) {
			throw new AscetPlanStoreError("plan_expired", `Plan has expired: ${record.planId}`, {
				planId: record.planId,
				expiresAt: record.expiresAt,
			});
		}
	}

	private assertMatches(record: AscetPlanRecord, input: VerifyAscetPlanInput): void {
		const operation = requireOperation(input.operation);
		if (record.operation !== operation) {
			throw new AscetPlanStoreError("plan_operation_mismatch", `Plan operation does not match: ${record.planId}`, {
				planId: record.planId,
				expectedOperation: operation,
				recordedOperation: record.operation,
			});
		}
		const binding = requireBinding(input.binding);
		if (canonicalize(bindingJson(record.binding)) !== canonicalize(bindingJson(binding))) {
			throw new AscetPlanStoreError("plan_binding_mismatch", `Plan binding does not match: ${record.planId}`, {
				planId: record.planId,
				recordedBinding: record.binding,
				expectedBinding: binding,
			});
		}
		const contractFingerprint = requireFingerprint(input.contractFingerprint, "contractFingerprint");
		if (record.contractFingerprint !== contractFingerprint) {
			throw new AscetPlanStoreError("plan_contract_mismatch", `Plan contract has changed: ${record.planId}`, {
				planId: record.planId,
				recordedContractFingerprint: record.contractFingerprint,
				expectedContractFingerprint: contractFingerprint,
			});
		}
		const databaseIdentity = requireDatabaseIdentity(input.databaseIdentity);
		if (
			canonicalize(databaseIdentityJson(record.databaseIdentity)) !==
			canonicalize(databaseIdentityJson(databaseIdentity))
		) {
			throw new AscetPlanStoreError(
				"plan_database_identity_mismatch",
				`Plan database identity does not match: ${record.planId}`,
				{
					planId: record.planId,
					recordedDatabaseIdentity: record.databaseIdentity,
					expectedDatabaseIdentity: databaseIdentity,
				},
			);
		}
		const targetIdentity = requireTargetIdentity(input.targetIdentity);
		if (
			canonicalize(targetIdentityJson(record.targetIdentity)) !== canonicalize(targetIdentityJson(targetIdentity))
		) {
			throw new AscetPlanStoreError(
				"plan_target_identity_mismatch",
				`Plan target identity does not match: ${record.planId}`,
				{
					planId: record.planId,
					recordedTargetIdentity: record.targetIdentity,
					expectedTargetIdentity: targetIdentity,
				},
			);
		}
		const targetImpact = requireJsonValue(input.targetImpact, "targetImpact");
		if (canonicalize(record.targetImpact) !== canonicalize(targetImpact)) {
			throw new AscetPlanStoreError(
				"plan_target_impact_mismatch",
				`Plan target impact does not match: ${record.planId}`,
				{
					planId: record.planId,
					recordedTargetImpact: record.targetImpact,
					expectedTargetImpact: targetImpact,
				},
			);
		}
		const guardGeneration = requireGuardGeneration(input.guardGeneration);
		if (record.guardGeneration !== guardGeneration) {
			throw new AscetPlanStoreError(
				"plan_guard_generation_mismatch",
				`Plan mutation guard generation does not match: ${record.planId}`,
				{
					planId: record.planId,
					recordedGuardGeneration: record.guardGeneration,
					expectedGuardGeneration: guardGeneration,
				},
			);
		}
		const params = requireJsonValue(input.params, "params");
		const backendPreflight = requireJsonValue(input.backendPreflight, "backendPreflight");
		const evidenceFingerprint = createAscetPlanEvidenceFingerprint(
			backendPreflight,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
		);
		if (record.evidenceFingerprint !== evidenceFingerprint) {
			throw new AscetPlanStoreError("plan_evidence_mismatch", `Plan preflight evidence is stale: ${record.planId}`, {
				planId: record.planId,
				recordedEvidenceFingerprint: record.evidenceFingerprint,
				expectedEvidenceFingerprint: evidenceFingerprint,
			});
		}
		const planFingerprint = createAscetPlanFingerprint({
			operation,
			params,
			binding,
			databaseIdentity,
			targetIdentity,
			targetImpact,
			guardGeneration,
			evidenceFingerprint,
			contractFingerprint,
		});
		if (record.planFingerprint !== planFingerprint) {
			throw new AscetPlanStoreError("stale_plan", `Plan fingerprint is stale: ${record.planId}`, {
				planId: record.planId,
				recordedPlanFingerprint: record.planFingerprint,
				expectedPlanFingerprint: planFingerprint,
			});
		}
	}

	private writeRecord(filePath: string, record: AscetPlanRecord): void {
		const directory = this.planDirectory();
		mkdirSync(directory, { recursive: true });
		const temporaryPath = `${filePath}.tmp-${process.pid}-${temporaryFileCounter++}`;
		try {
			writeFileSync(temporaryPath, serializePlan(record), { encoding: "utf8", mode: 0o600 });
			renameSync(temporaryPath, filePath);
		} finally {
			if (existsSync(temporaryPath)) unlinkSync(temporaryPath);
		}
	}

	private isFileExistsError(error: unknown): boolean {
		return isObject(error) && error.code === "EEXIST";
	}
}

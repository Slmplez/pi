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

export const DEFAULT_ASCET_PLAN_TTL_MS = 5 * 60 * 1000;

export type AscetPlanStoreErrorCode =
	| "invalid_plan_input"
	| "invalid_plan_id"
	| "plan_id_conflict"
	| "plan_not_found"
	| "plan_corrupt"
	| "plan_expired"
	| "plan_consumed"
	| "plan_busy"
	| "plan_operation_mismatch"
	| "plan_id_mismatch"
	| "plan_binding_mismatch"
	| "stale_plan";

export type AscetPlanJsonPrimitive = string | number | boolean | null;
export type AscetPlanJsonValue = AscetPlanJsonPrimitive | AscetPlanJsonValue[] | { [key: string]: AscetPlanJsonValue };

export interface AscetPlanRecord {
	planId: string;
	operation: string;
	params: AscetPlanJsonValue;
	backendPreflight: AscetPlanJsonValue;
	binding?: AscetPlanJsonValue;
	fingerprint: string;
	createdAt: string;
	expiresAt: string;
	consumedAt?: string;
}

export interface CreateAscetPlanInput {
	operation: string;
	params: AscetPlanJsonValue;
	backendPreflight: AscetPlanJsonValue;
	binding?: AscetPlanJsonValue;
	ttlMs?: number;
	expiresAt?: string;
	planId?: string;
}

export interface VerifyAscetPlanInput {
	planId: string;
	operation: string;
	params: AscetPlanJsonValue;
	backendPreflight: AscetPlanJsonValue;
	binding?: AscetPlanJsonValue;
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

function isJsonValue(value: unknown): value is AscetPlanJsonValue {
	if (value === null || typeof value === "string" || typeof value === "boolean") {
		return true;
	}
	if (typeof value === "number") {
		return Number.isFinite(value);
	}
	if (Array.isArray(value)) {
		return value.every((entry) => isJsonValue(entry));
	}
	if (typeof value !== "object") {
		return false;
	}
	const prototype = Object.getPrototypeOf(value);
	if (prototype !== Object.prototype && prototype !== null) {
		return false;
	}
	return Object.values(value).every((entry) => isJsonValue(entry));
}

function canonicalize(value: AscetPlanJsonValue): string {
	if (value === null) {
		return "null";
	}
	if (typeof value === "string" || typeof value === "boolean") {
		return JSON.stringify(value);
	}
	if (typeof value === "number") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map((entry) => canonicalize(entry)).join(",")}]`;
	}
	const entries = Object.keys(value)
		.sort()
		.map((key) => `${JSON.stringify(key)}:${canonicalize(value[key])}`);
	return `{${entries.join(",")}}`;
}

function requireJsonValue(value: unknown, description: string): AscetPlanJsonValue {
	if (!isJsonValue(value)) {
		throw new AscetPlanStoreError("invalid_plan_input", `${description} must be a JSON value.`, { description });
	}
	return value;
}

function requireOperation(operation: string): string {
	if (operation.trim().length === 0) {
		throw new AscetPlanStoreError("invalid_plan_input", "operation must be a non-empty string.", { operation });
	}
	return operation;
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

function createFingerprintPayload(
	operation: string,
	params: AscetPlanJsonValue,
	backendPreflight: AscetPlanJsonValue,
	binding?: AscetPlanJsonValue,
): AscetPlanJsonValue {
	return { operation, params, backendPreflight, ...(binding !== undefined ? { binding } : {}) };
}

export function canonicalizeAscetPlanJson(value: AscetPlanJsonValue): string {
	return canonicalize(requireJsonValue(value, "value"));
}

export function createAscetPlanBinding(input: {
	cwd: string;
	agentId?: string;
	sessionId?: string;
}): AscetPlanJsonValue {
	return {
		workspace: resolve(input.cwd),
		agentId: input.agentId?.trim() || "system",
		sessionId: input.sessionId?.trim() || runtimeSessionId,
	};
}

export function createAscetPlanFingerprint(
	operation: string,
	params: AscetPlanJsonValue,
	backendPreflight: AscetPlanJsonValue,
	binding?: AscetPlanJsonValue,
): string {
	const payload = createFingerprintPayload(
		requireOperation(operation),
		requireJsonValue(params, "params"),
		requireJsonValue(backendPreflight, "backendPreflight"),
		binding === undefined ? undefined : requireJsonValue(binding, "binding"),
	);
	return createHash("sha256").update(canonicalize(payload), "utf8").digest("hex");
}

function isObject(value: unknown): value is Record<string, unknown> {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function parsePlanRecord(value: unknown): AscetPlanRecord {
	if (!isObject(value)) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan is not a JSON object.");
	}
	const planId = value.planId;
	const operation = value.operation;
	const params = value.params;
	const backendPreflight = value.backendPreflight;
	const binding = value.binding;
	const fingerprint = value.fingerprint;
	const createdAt = value.createdAt;
	const expiresAt = value.expiresAt;
	const consumedAt = value.consumedAt;
	if (
		typeof planId !== "string" ||
		typeof operation !== "string" ||
		!isJsonValue(params) ||
		!isJsonValue(backendPreflight) ||
		(binding !== undefined && !isJsonValue(binding)) ||
		typeof fingerprint !== "string" ||
		typeof createdAt !== "string" ||
		typeof expiresAt !== "string" ||
		(consumedAt !== undefined && typeof consumedAt !== "string")
	) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan is missing required fields.");
	}
	if (!SAFE_PLAN_ID.test(planId) || !FINGERPRINT.test(fingerprint)) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan contains unsafe identity fields.", { planId });
	}
	const createdTimestamp = parseTimestamp(createdAt, "createdAt");
	const expiresTimestamp = parseTimestamp(expiresAt, "expiresAt");
	if (expiresTimestamp <= createdTimestamp) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan expires before or at creation time.", {
			createdAt,
			expiresAt,
		});
	}
	const normalizedConsumedAt = typeof consumedAt === "string" ? consumedAt : undefined;
	if (normalizedConsumedAt !== undefined) {
		parseTimestamp(normalizedConsumedAt, "consumedAt");
	}
	const normalizedBinding = binding === undefined ? undefined : binding;
	const expectedFingerprint = createAscetPlanFingerprint(operation, params, backendPreflight, normalizedBinding);
	if (expectedFingerprint !== fingerprint) {
		throw new AscetPlanStoreError("plan_corrupt", "Persisted plan fingerprint does not match its contents.", {
			planId,
			fingerprint,
			expectedFingerprint,
		});
	}
	return {
		planId,
		operation,
		params,
		backendPreflight,
		...(normalizedBinding !== undefined ? { binding: normalizedBinding } : {}),
		fingerprint,
		createdAt,
		expiresAt,
		...(normalizedConsumedAt !== undefined ? { consumedAt: normalizedConsumedAt } : {}),
	};
}

function serializePlan(record: AscetPlanRecord): string {
	const value: AscetPlanJsonValue = {
		planId: record.planId,
		operation: record.operation,
		params: record.params,
		backendPreflight: record.backendPreflight,
		...(record.binding !== undefined ? { binding: record.binding } : {}),
		fingerprint: record.fingerprint,
		createdAt: record.createdAt,
		expiresAt: record.expiresAt,
		...(record.consumedAt !== undefined ? { consumedAt: record.consumedAt } : {}),
	};
	return `${canonicalize(value)}\n`;
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
		const backendPreflight = requireJsonValue(input.backendPreflight, "backendPreflight");
		const binding = input.binding === undefined ? undefined : requireJsonValue(input.binding, "binding");
		const created = assertDate(this.now(), "now");
		const expiresAt = this.resolveExpiration(created, input);
		const planId = requirePlanId(input.planId ?? this.generatePlanId());
		const filePath = this.planPath(planId);
		if (existsSync(filePath)) {
			throw new AscetPlanStoreError("plan_id_conflict", `Plan already exists: ${planId}`, { planId });
		}
		const record: AscetPlanRecord = {
			planId,
			operation,
			params,
			backendPreflight,
			...(binding !== undefined ? { binding } : {}),
			fingerprint: createAscetPlanFingerprint(operation, params, backendPreflight, binding),
			createdAt: created.toISOString(),
			expiresAt: expiresAt.toISOString(),
		};
		this.writeRecord(filePath, record);
		return record;
	}

	public load(planId: string, binding?: AscetPlanJsonValue): AscetPlanRecord {
		const record = this.readRecord(planId);
		this.assertAvailable(record);
		if (binding !== undefined) {
			this.assertBinding(record, binding);
		}
		return record;
	}

	public verify(input: VerifyAscetPlanInput): AscetPlanRecord {
		const record = this.load(input.planId, input.binding);
		this.assertMatches(record, input);
		return record;
	}

	public consume(input: VerifyAscetPlanInput): AscetPlanRecord {
		const planId = requirePlanId(input.planId);
		const filePath = this.planPath(planId);
		mkdirSync(this.planDirectory(), { recursive: true });
		const lockPath = `${filePath}.consume.lock`;
		let lockHandle: number | undefined;
		try {
			try {
				lockHandle = openSync(lockPath, "wx");
			} catch (error) {
				if (this.isFileExistsError(error)) {
					throw new AscetPlanStoreError("plan_busy", `Plan is currently being consumed: ${planId}`, { planId });
				}
				throw error;
			}
			const record = this.readRecord(planId);
			this.assertAvailable(record);
			this.assertMatches(record, input);
			const consumedAt = assertDate(this.now(), "now").toISOString();
			const consumedRecord: AscetPlanRecord = { ...record, consumedAt };
			this.writeRecord(filePath, consumedRecord);
			return consumedRecord;
		} finally {
			if (lockHandle !== undefined) {
				closeSync(lockHandle);
			}
			if (existsSync(lockPath)) {
				unlinkSync(lockPath);
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
		if (record.consumedAt !== undefined) {
			throw new AscetPlanStoreError("plan_consumed", `Plan has already been consumed: ${record.planId}`, {
				planId: record.planId,
				consumedAt: record.consumedAt,
			});
		}
		if (assertDate(this.now(), "now").getTime() >= parseTimestamp(record.expiresAt, "expiresAt")) {
			throw new AscetPlanStoreError("plan_expired", `Plan has expired: ${record.planId}`, {
				planId: record.planId,
				expiresAt: record.expiresAt,
			});
		}
	}

	private assertBinding(record: AscetPlanRecord, binding: AscetPlanJsonValue | undefined): void {
		const expectedBinding = binding === undefined ? undefined : requireJsonValue(binding, "binding");
		if (
			(record.binding === undefined) !== (expectedBinding === undefined) ||
			(record.binding !== undefined &&
				expectedBinding !== undefined &&
				canonicalize(record.binding) !== canonicalize(expectedBinding))
		) {
			throw new AscetPlanStoreError("plan_binding_mismatch", `Plan binding does not match: ${record.planId}`, {
				planId: record.planId,
				recordedBinding: record.binding,
				expectedBinding,
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
		const expectedBinding = input.binding === undefined ? undefined : requireJsonValue(input.binding, "binding");
		this.assertBinding(record, expectedBinding);
		const expectedFingerprint = createAscetPlanFingerprint(
			operation,
			input.params,
			input.backendPreflight,
			expectedBinding,
		);
		if (expectedFingerprint !== record.fingerprint) {
			throw new AscetPlanStoreError("stale_plan", `Plan fingerprint is stale: ${record.planId}`, {
				planId: record.planId,
				expectedFingerprint,
				recordedFingerprint: record.fingerprint,
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
			if (existsSync(temporaryPath)) {
				unlinkSync(temporaryPath);
			}
		}
	}

	private isFileExistsError(error: unknown): boolean {
		return isObject(error) && error.code === "EEXIST";
	}
}

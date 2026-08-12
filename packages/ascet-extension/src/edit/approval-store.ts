import { createHash, randomUUID, timingSafeEqual } from "node:crypto";
import { closeSync, mkdirSync, openSync, readFileSync, renameSync, unlinkSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export interface AscetApprovalBinding {
	action: string;
	planId: string;
	planFingerprint: string;
	databaseFingerprint: string;
	targetOid: string;
	targetImpactFingerprint: string;
	guardGeneration: number;
	sessionId: string;
}

export interface AscetApprovalReceipt extends AscetApprovalBinding {
	version: 1;
	approvalId: string;
	tokenHash: string;
	approvedAt: string;
	expiresAt: string;
	consumedAt?: string;
}

export interface CreateAscetApprovalInput extends AscetApprovalBinding {
	ttlMs: number;
}

export interface ConsumeAscetApprovalInput extends AscetApprovalBinding {
	approvalId: string;
	token: string;
}

export interface AscetApprovalStoreOptions {
	artifactRoot: string;
	now?: () => Date;
	generateApprovalId?: () => string;
	generateToken?: () => string;
}

export type AscetApprovalStoreErrorCode =
	| "invalid_approval_input"
	| "approval_not_found"
	| "approval_corrupt"
	| "approval_busy"
	| "approval_expired"
	| "approval_consumed"
	| "approval_binding_mismatch"
	| "approval_token_mismatch";

export class AscetApprovalStoreError extends Error {
	readonly code: AscetApprovalStoreErrorCode;

	constructor(code: AscetApprovalStoreErrorCode, message: string) {
		super(message);
		this.name = "AscetApprovalStoreError";
		this.code = code;
	}
}

const SAFE_APPROVAL_ID = /^[A-Za-z0-9_-]{8,128}$/u;

function requireText(value: string, field: string): string {
	const normalized = value.trim();
	if (!normalized) throw new AscetApprovalStoreError("invalid_approval_input", `${field} must not be empty.`);
	return normalized;
}

function requireApprovalId(value: string): string {
	const normalized = requireText(value, "approvalId");
	if (!SAFE_APPROVAL_ID.test(normalized)) {
		throw new AscetApprovalStoreError("invalid_approval_input", "approvalId contains unsafe characters.");
	}
	return normalized;
}

function hashToken(token: string): string {
	return createHash("sha256").update(token, "utf8").digest("hex");
}

function tokensMatch(expectedHash: string, token: string): boolean {
	const expected = Buffer.from(expectedHash, "hex");
	const actual = Buffer.from(hashToken(token), "hex");
	return expected.length === actual.length && timingSafeEqual(expected, actual);
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function parseReceipt(raw: string): AscetApprovalReceipt {
	let value: unknown;
	try {
		value = JSON.parse(raw) as unknown;
	} catch (error) {
		throw new AscetApprovalStoreError(
			"approval_corrupt",
			`Approval receipt JSON is invalid: ${error instanceof Error ? error.message : String(error)}`,
		);
	}
	if (
		!isRecord(value) ||
		value.version !== 1 ||
		typeof value.approvalId !== "string" ||
		typeof value.tokenHash !== "string" ||
		typeof value.action !== "string" ||
		typeof value.planId !== "string" ||
		typeof value.planFingerprint !== "string" ||
		typeof value.databaseFingerprint !== "string" ||
		typeof value.targetOid !== "string" ||
		typeof value.targetImpactFingerprint !== "string" ||
		typeof value.guardGeneration !== "number" ||
		typeof value.sessionId !== "string" ||
		typeof value.approvedAt !== "string" ||
		typeof value.expiresAt !== "string"
	) {
		throw new AscetApprovalStoreError("approval_corrupt", "Approval receipt has an invalid shape.");
	}
	return value as unknown as AscetApprovalReceipt;
}

function validateBinding(binding: AscetApprovalBinding): AscetApprovalBinding {
	if (!Number.isInteger(binding.guardGeneration) || binding.guardGeneration < 0) {
		throw new AscetApprovalStoreError("invalid_approval_input", "guardGeneration must be a non-negative integer.");
	}
	return {
		action: requireText(binding.action, "action"),
		planId: requireText(binding.planId, "planId"),
		planFingerprint: requireText(binding.planFingerprint, "planFingerprint"),
		databaseFingerprint: requireText(binding.databaseFingerprint, "databaseFingerprint"),
		targetOid: requireText(binding.targetOid, "targetOid"),
		targetImpactFingerprint: requireText(binding.targetImpactFingerprint, "targetImpactFingerprint"),
		guardGeneration: binding.guardGeneration,
		sessionId: requireText(binding.sessionId, "sessionId"),
	};
}

function bindingsMatch(receipt: AscetApprovalReceipt, binding: AscetApprovalBinding): boolean {
	return (
		receipt.action === binding.action &&
		receipt.planId === binding.planId &&
		receipt.planFingerprint === binding.planFingerprint &&
		receipt.databaseFingerprint === binding.databaseFingerprint &&
		receipt.targetOid === binding.targetOid &&
		receipt.targetImpactFingerprint === binding.targetImpactFingerprint &&
		receipt.guardGeneration === binding.guardGeneration &&
		receipt.sessionId === binding.sessionId
	);
}

export class AscetApprovalStore {
	private readonly root: string;
	private readonly now: () => Date;
	private readonly generateApprovalId: () => string;
	private readonly generateToken: () => string;

	constructor(options: AscetApprovalStoreOptions) {
		this.root = join(requireText(options.artifactRoot, "artifactRoot"), "approvals");
		this.now = options.now ?? (() => new Date());
		this.generateApprovalId = options.generateApprovalId ?? (() => randomUUID());
		this.generateToken = options.generateToken ?? (() => `${randomUUID()}${randomUUID()}`);
	}

	create(input: CreateAscetApprovalInput): { receipt: AscetApprovalReceipt; token: string } {
		if (!Number.isFinite(input.ttlMs) || input.ttlMs <= 0) {
			throw new AscetApprovalStoreError("invalid_approval_input", "ttlMs must be positive.");
		}
		const binding = validateBinding(input);
		const approvalId = requireApprovalId(this.generateApprovalId());
		const token = requireText(this.generateToken(), "token");
		const approvedAt = this.now();
		const receipt: AscetApprovalReceipt = {
			version: 1,
			approvalId,
			tokenHash: hashToken(token),
			...binding,
			approvedAt: approvedAt.toISOString(),
			expiresAt: new Date(approvedAt.getTime() + input.ttlMs).toISOString(),
		};
		this.withLock(approvalId, () => this.writeReceipt(receipt));
		return { receipt, token };
	}

	load(approvalId: string): AscetApprovalReceipt {
		const normalizedId = requireApprovalId(approvalId);
		try {
			return parseReceipt(readFileSync(this.getReceiptPath(normalizedId), "utf8"));
		} catch (error) {
			if (error instanceof AscetApprovalStoreError) throw error;
			throw new AscetApprovalStoreError("approval_not_found", `Approval receipt '${normalizedId}' was not found.`);
		}
	}

	consume(input: ConsumeAscetApprovalInput): AscetApprovalReceipt {
		const approvalId = requireApprovalId(input.approvalId);
		const binding = validateBinding(input);
		const token = requireText(input.token, "token");
		return this.withLock(approvalId, () => {
			const receipt = this.load(approvalId);
			if (receipt.consumedAt)
				throw new AscetApprovalStoreError("approval_consumed", "Approval receipt was already consumed.");
			if (this.now().getTime() >= Date.parse(receipt.expiresAt)) {
				throw new AscetApprovalStoreError("approval_expired", "Approval receipt has expired.");
			}
			if (!bindingsMatch(receipt, binding)) {
				throw new AscetApprovalStoreError("approval_binding_mismatch", "Approval receipt binding does not match.");
			}
			if (!tokensMatch(receipt.tokenHash, token)) {
				throw new AscetApprovalStoreError("approval_token_mismatch", "Approval receipt token does not match.");
			}
			const consumed = { ...receipt, consumedAt: this.now().toISOString() };
			this.writeReceipt(consumed);
			return consumed;
		});
	}

	private getReceiptPath(approvalId: string): string {
		return join(this.root, `${approvalId}.json`);
	}

	private withLock<T>(approvalId: string, action: () => T): T {
		mkdirSync(this.root, { recursive: true });
		const lockPath = `${this.getReceiptPath(approvalId)}.lock`;
		let descriptor: number;
		try {
			descriptor = openSync(lockPath, "wx", 0o600);
		} catch {
			throw new AscetApprovalStoreError("approval_busy", "Approval receipt is being updated by another process.");
		}
		try {
			return action();
		} finally {
			closeSync(descriptor);
			unlinkSync(lockPath);
		}
	}

	private writeReceipt(receipt: AscetApprovalReceipt): void {
		mkdirSync(this.root, { recursive: true });
		const filePath = this.getReceiptPath(receipt.approvalId);
		const temporaryPath = `${filePath}.${randomUUID()}.tmp`;
		writeFileSync(temporaryPath, `${JSON.stringify(receipt, null, 2)}\n`, { encoding: "utf8", mode: 0o600 });
		renameSync(temporaryPath, filePath);
	}
}

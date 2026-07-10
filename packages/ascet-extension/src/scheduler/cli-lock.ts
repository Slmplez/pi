import { randomUUID } from "node:crypto";
import { existsSync } from "node:fs";
import { mkdir, open, readFile, rm, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type PiAscetRuntimePathOptions, resolvePiAscetLockPath } from "./paths.ts";

export interface AscetCliLockFile {
	token: string;
	pid: number;
	agentId: string;
	commandId: string;
	toolName: string;
	processName: string;
	acquiredAt: string;
	heartbeatAt: string;
}

export interface AscetCliLock {
	path: string;
	token: string;
	release(): Promise<void>;
}

export type AscetCliLockSnapshot =
	| { locked: false; path: string }
	| {
			locked: true;
			path: string;
			owner: AscetCliLockFile;
			stale: boolean;
			ageMs: number;
			heartbeatAgeMs: number;
	  };

interface AscetCliLockMetadata {
	agentId: string;
	commandId: string;
	toolName: string;
	processName: string;
}

interface AscetCliLockOptions extends PiAscetRuntimePathOptions {
	lockPath?: string;
	pid?: number;
	acquireTimeoutMs?: number;
	retryDelayMs?: number;
	staleMs?: number;
	heartbeatIntervalMs?: number;
	now?: () => number;
	tokenFactory?: () => string;
	isPidAlive?: (pid: number) => boolean;
}

interface AscetCliLockSnapshotOptions extends PiAscetRuntimePathOptions {
	lockPath?: string;
	staleMs?: number;
	now?: () => number;
	isPidAlive?: (pid: number) => boolean;
}

export class AscetCliLockTimeoutError extends Error {
	readonly code = "ASCET_CLI_LOCK_TIMEOUT";

	constructor(
		readonly lockPath: string,
		readonly timeoutMs: number,
	) {
		super(`Timed out waiting ${timeoutMs}ms for ASCET CLI lock ${lockPath}.`);
		this.name = "AscetCliLockTimeoutError";
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise((resolve) => setTimeout(resolve, ms));
}

function resolveLockPath(options: AscetCliLockOptions | AscetCliLockSnapshotOptions): string {
	return options.lockPath ?? resolvePiAscetLockPath(options);
}

export async function acquireAscetCliLock(
	metadata: AscetCliLockMetadata,
	options: AscetCliLockOptions = {},
): Promise<AscetCliLock> {
	const lockPath = resolveLockPath(options);
	const acquireTimeoutMs = options.acquireTimeoutMs ?? 60_000;
	const retryDelayMs = options.retryDelayMs ?? 50;
	const staleMs = options.staleMs ?? 120_000;
	const now = options.now ?? (() => Date.now());
	const pid = options.pid ?? process.pid;
	const token = options.tokenFactory?.() ?? randomUUID();
	const startedAt = now();

	await mkdir(dirname(lockPath), { recursive: true });

	while (true) {
		const timestamp = new Date(now()).toISOString();
		const lockFile: AscetCliLockFile = {
			token,
			pid,
			agentId: metadata.agentId,
			commandId: metadata.commandId,
			toolName: metadata.toolName,
			processName: metadata.processName,
			acquiredAt: timestamp,
			heartbeatAt: timestamp,
		};

		try {
			const handle = await open(lockPath, "wx");
			try {
				await handle.writeFile(JSON.stringify(lockFile));
			} finally {
				await handle.close();
			}
			return createHeldLock(lockPath, token, lockFile, options);
		} catch (error) {
			if (!isAlreadyExistsError(error)) {
				throw error;
			}
		}

		const snapshot = await getAscetCliLockSnapshot({
			...options,
			lockPath,
			staleMs,
			now,
			isPidAlive: options.isPidAlive,
		});
		if (snapshot.locked && snapshot.stale) {
			await rm(lockPath, { force: true });
			continue;
		}

		if (now() - startedAt >= acquireTimeoutMs) {
			throw new AscetCliLockTimeoutError(lockPath, acquireTimeoutMs);
		}
		await sleep(retryDelayMs);
	}
}

export async function getAscetCliLockSnapshot(
	options: AscetCliLockSnapshotOptions = {},
): Promise<AscetCliLockSnapshot> {
	const lockPath = resolveLockPath(options);
	const now = options.now ?? (() => Date.now());
	const staleMs = options.staleMs ?? 120_000;

	if (!existsSync(lockPath)) {
		return { locked: false, path: lockPath };
	}

	const owner = await readLockFile(lockPath);
	if (!owner) {
		return { locked: false, path: lockPath };
	}

	const heartbeatMs = Date.parse(owner.heartbeatAt);
	const acquiredMs = Date.parse(owner.acquiredAt);
	const heartbeatAgeMs = Number.isFinite(heartbeatMs) ? Math.max(0, now() - heartbeatMs) : Number.POSITIVE_INFINITY;
	const ageMs = Number.isFinite(acquiredMs) ? Math.max(0, now() - acquiredMs) : Number.POSITIVE_INFINITY;
	const pidAlive = (options.isPidAlive ?? isPidAlive)(owner.pid);

	return {
		locked: true,
		path: lockPath,
		owner,
		stale: !pidAlive || heartbeatAgeMs > staleMs,
		ageMs,
		heartbeatAgeMs,
	};
}

export async function clearStaleAscetCliLock(options: AscetCliLockSnapshotOptions = {}): Promise<boolean> {
	const snapshot = await getAscetCliLockSnapshot(options);
	if (!snapshot.locked || !snapshot.stale) {
		return false;
	}
	await rm(snapshot.path, { force: true });
	return true;
}

export function formatAscetCliLockStatus(snapshot: AscetCliLockSnapshot): string {
	if (!snapshot.locked) {
		return ["CLI Lock:", "  owner: none"].join("\n");
	}
	return [
		"CLI Lock:",
		`  ownerPid: ${snapshot.owner.pid}`,
		`  command: ${snapshot.owner.toolName}/${snapshot.owner.commandId}`,
		`  process: ${snapshot.owner.processName}`,
		`  agent: ${snapshot.owner.agentId}`,
		`  age: ${formatDuration(snapshot.ageMs)}`,
		`  heartbeat: ${formatDuration(snapshot.heartbeatAgeMs)} ago`,
		`  stale: ${snapshot.stale ? "yes" : "no"}`,
	].join("\n");
}

async function createHeldLock(
	lockPath: string,
	token: string,
	lockFile: AscetCliLockFile,
	options: AscetCliLockOptions,
): Promise<AscetCliLock> {
	const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;
	const now = options.now ?? (() => Date.now());
	let released = false;
	const heartbeat = setInterval(() => {
		if (released) {
			return;
		}
		void writeFile(
			lockPath,
			JSON.stringify({
				...lockFile,
				heartbeatAt: new Date(now()).toISOString(),
			}),
		).catch(() => {});
	}, heartbeatIntervalMs);

	return {
		path: lockPath,
		token,
		async release(): Promise<void> {
			if (released) {
				return;
			}
			released = true;
			clearInterval(heartbeat);
			const current = await readLockFile(lockPath);
			if (current?.token === token) {
				await rm(lockPath, { force: true });
			}
		},
	};
}

async function readLockFile(lockPath: string): Promise<AscetCliLockFile | null> {
	try {
		const raw = await readFile(lockPath, "utf8");
		const parsed = JSON.parse(raw) as Partial<AscetCliLockFile>;
		if (
			typeof parsed.token !== "string" ||
			typeof parsed.pid !== "number" ||
			typeof parsed.agentId !== "string" ||
			typeof parsed.commandId !== "string" ||
			typeof parsed.toolName !== "string" ||
			typeof parsed.processName !== "string" ||
			typeof parsed.acquiredAt !== "string" ||
			typeof parsed.heartbeatAt !== "string"
		) {
			return null;
		}
		return parsed as AscetCliLockFile;
	} catch {
		return null;
	}
}

function formatDuration(ms: number): string {
	if (!Number.isFinite(ms)) {
		return "unknown";
	}
	if (ms < 1000) {
		return `${Math.round(ms)}ms`;
	}
	return `${Math.round(ms / 1000)}s`;
}

function isAlreadyExistsError(error: unknown): boolean {
	return (
		typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "EEXIST"
	);
}

function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

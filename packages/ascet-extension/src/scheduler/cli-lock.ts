import { randomUUID } from "node:crypto";
import type { Stats } from "node:fs";
import { type FileHandle, mkdir, open, readFile, rm, stat } from "node:fs/promises";
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
	  }
	| {
			locked: true;
			path: string;
			corrupt: true;
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
	signal?: AbortSignal;
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

interface ValidLockFileContents {
	kind: "valid";
	owner: AscetCliLockFile;
	raw: string;
}

interface CorruptLockFileContents {
	kind: "corrupt";
	raw: string;
}

interface MissingLockFileContents {
	kind: "missing";
}

type LockFileContents = ValidLockFileContents | CorruptLockFileContents | MissingLockFileContents;

interface LockFileIdentity {
	raw: string;
	dev: number;
	ino: number;
	size: number;
	mtimeMs: number;
}

interface LockInspection {
	snapshot: AscetCliLockSnapshot;
	identity?: LockFileIdentity;
}

export class AscetCliLockTimeoutError extends Error {
	readonly code = "ASCET_CLI_LOCK_TIMEOUT";
	readonly lockPath: string;
	readonly timeoutMs: number;

	constructor(lockPath: string, timeoutMs: number) {
		super(`Timed out waiting ${timeoutMs}ms for ASCET CLI lock ${lockPath}.`);
		this.name = "AscetCliLockTimeoutError";
		this.lockPath = lockPath;
		this.timeoutMs = timeoutMs;
	}
}

function getAbortReason(signal: AbortSignal): unknown {
	return signal.reason ?? new Error("ASCET CLI lock acquisition was aborted.");
}

function throwIfAborted(signal: AbortSignal | undefined): void {
	if (signal?.aborted) {
		throw getAbortReason(signal);
	}
}

function sleep(ms: number, signal?: AbortSignal): Promise<void> {
	if (!signal) {
		return new Promise((resolve) => setTimeout(resolve, ms));
	}
	if (signal.aborted) {
		return Promise.reject(getAbortReason(signal));
	}
	return new Promise((resolve, reject) => {
		const onAbort = () => {
			clearTimeout(timer);
			reject(getAbortReason(signal));
		};
		const timer = setTimeout(() => {
			signal.removeEventListener("abort", onAbort);
			resolve();
		}, ms);
		signal.addEventListener("abort", onAbort, { once: true });
	});
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
	throwIfAborted(options.signal);

	while (true) {
		throwIfAborted(options.signal);
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
				await handle.sync();
				await handle.utimes(new Date(now()), new Date(now()));
				throwIfAborted(options.signal);
				return createHeldLock(lockPath, token, handle, options);
			} catch (error) {
				await handle.close();
				await rm(lockPath, { force: true });
				throw error;
			}
		} catch (error) {
			if (!isAlreadyExistsError(error)) {
				throw error;
			}
		}

		const inspection = await inspectAscetCliLock({
			...options,
			lockPath,
			staleMs,
			now,
			isPidAlive: options.isPidAlive,
		});
		if (inspection.snapshot.locked && inspection.snapshot.stale && inspection.identity) {
			if (await removeLockIfUnchanged(lockPath, inspection.identity)) {
				continue;
			}
		}

		if (now() - startedAt >= acquireTimeoutMs) {
			throw new AscetCliLockTimeoutError(lockPath, acquireTimeoutMs);
		}
		await sleep(retryDelayMs, options.signal);
	}
}

export async function getAscetCliLockSnapshot(
	options: AscetCliLockSnapshotOptions = {},
): Promise<AscetCliLockSnapshot> {
	return (await inspectAscetCliLock(options)).snapshot;
}

export async function clearStaleAscetCliLock(options: AscetCliLockSnapshotOptions = {}): Promise<boolean> {
	const inspection = await inspectAscetCliLock(options);
	if (!inspection.snapshot.locked || !inspection.snapshot.stale || !inspection.identity) {
		return false;
	}
	return removeLockIfUnchanged(inspection.snapshot.path, inspection.identity);
}

export function formatAscetCliLockStatus(snapshot: AscetCliLockSnapshot): string {
	if (!snapshot.locked) {
		return ["CLI Lock:", "  owner: none"].join("\n");
	}
	if ("corrupt" in snapshot) {
		return [
			"CLI Lock:",
			"  owner: corrupt lock file",
			`  age: ${formatDuration(snapshot.ageMs)}`,
			`  heartbeat: ${formatDuration(snapshot.heartbeatAgeMs)} ago`,
			`  stale: ${snapshot.stale ? "yes" : "no"}`,
		].join("\n");
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

async function inspectAscetCliLock(options: AscetCliLockSnapshotOptions): Promise<LockInspection> {
	const lockPath = resolveLockPath(options);
	const now = options.now ?? (() => Date.now());
	const staleMs = options.staleMs ?? 120_000;
	const contents = await readLockFile(lockPath);
	if (contents.kind === "missing") {
		return { snapshot: { locked: false, path: lockPath } };
	}

	const lockStat = await readLockStat(lockPath);
	if (!lockStat) {
		return { snapshot: { locked: false, path: lockPath } };
	}
	const heartbeatAgeMs = getAgeMs(now(), lockStat.mtimeMs);
	const identity = createLockFileIdentity(contents.raw, lockStat);
	if (contents.kind === "corrupt") {
		return {
			snapshot: {
				locked: true,
				path: lockPath,
				corrupt: true,
				stale: heartbeatAgeMs > staleMs,
				ageMs: heartbeatAgeMs,
				heartbeatAgeMs,
			},
			identity,
		};
	}

	const acquiredMs = Date.parse(contents.owner.acquiredAt);
	const pidAlive = (options.isPidAlive ?? isPidAlive)(contents.owner.pid);
	return {
		snapshot: {
			locked: true,
			path: lockPath,
			owner: contents.owner,
			stale: !pidAlive || heartbeatAgeMs > staleMs,
			ageMs: Number.isFinite(acquiredMs) ? getAgeMs(now(), acquiredMs) : Number.POSITIVE_INFINITY,
			heartbeatAgeMs,
		},
		identity,
	};
}

async function createHeldLock(
	lockPath: string,
	token: string,
	handle: FileHandle,
	options: AscetCliLockOptions,
): Promise<AscetCliLock> {
	const heartbeatIntervalMs = options.heartbeatIntervalMs ?? 5_000;
	const now = options.now ?? (() => Date.now());
	let released = false;
	let heartbeatPending = false;
	const heartbeat = setInterval(() => {
		if (released || heartbeatPending) {
			return;
		}
		heartbeatPending = true;
		const timestamp = new Date(now());
		void handle
			.utimes(timestamp, timestamp)
			.catch(() => {})
			.finally(() => {
				heartbeatPending = false;
			});
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
			try {
				await removeLockIfOwned(lockPath, token, handle);
			} finally {
				await handle.close();
			}
		},
	};
}

async function removeLockIfUnchanged(lockPath: string, expected: LockFileIdentity): Promise<boolean> {
	let handle: FileHandle | undefined;
	try {
		handle = await open(lockPath, "r");
		const [contents, handleStat, pathStat] = await Promise.all([
			readLockFileHandle(handle),
			handle.stat(),
			readLockStat(lockPath),
		]);
		if (
			!pathStat ||
			contents.kind === "missing" ||
			!isSameFile(handleStat, pathStat) ||
			!isSameLockFileIdentity(createLockFileIdentity(contents.raw, handleStat), expected)
		) {
			return false;
		}
		await rm(lockPath, { force: true });
		return true;
	} catch (error) {
		if (isNotFoundError(error)) {
			return false;
		}
		throw error;
	} finally {
		await handle?.close();
	}
}

async function removeLockIfOwned(lockPath: string, token: string, handle: FileHandle): Promise<boolean> {
	const [contents, handleStat, pathStat] = await Promise.all([
		readLockFile(lockPath),
		handle.stat(),
		readLockStat(lockPath),
	]);
	if (contents.kind !== "valid" || contents.owner.token !== token || !pathStat || !isSameFile(handleStat, pathStat)) {
		return false;
	}
	await rm(lockPath, { force: true });
	return true;
}

async function readLockFile(lockPath: string): Promise<LockFileContents> {
	try {
		return parseLockFile(await readFile(lockPath, "utf8"));
	} catch (error) {
		if (isNotFoundError(error)) {
			return { kind: "missing" };
		}
		throw error;
	}
}

async function readLockFileHandle(handle: FileHandle): Promise<LockFileContents> {
	return parseLockFile(await handle.readFile("utf8"));
}

function parseLockFile(raw: string): LockFileContents {
	try {
		const parsed = JSON.parse(raw) as Partial<AscetCliLockFile>;
		if (!isValidLockFile(parsed)) {
			return { kind: "corrupt", raw };
		}
		return { kind: "valid", owner: parsed, raw };
	} catch {
		return { kind: "corrupt", raw };
	}
}

function isValidLockFile(value: Partial<AscetCliLockFile>): value is AscetCliLockFile {
	return (
		typeof value.token === "string" &&
		typeof value.pid === "number" &&
		typeof value.agentId === "string" &&
		typeof value.commandId === "string" &&
		typeof value.toolName === "string" &&
		typeof value.processName === "string" &&
		typeof value.acquiredAt === "string" &&
		typeof value.heartbeatAt === "string"
	);
}

async function readLockStat(lockPath: string): Promise<Stats | undefined> {
	try {
		return await stat(lockPath);
	} catch (error) {
		if (isNotFoundError(error)) {
			return undefined;
		}
		throw error;
	}
}

function createLockFileIdentity(raw: string, lockStat: Stats): LockFileIdentity {
	return {
		raw,
		dev: lockStat.dev,
		ino: lockStat.ino,
		size: lockStat.size,
		mtimeMs: lockStat.mtimeMs,
	};
}

function isSameLockFileIdentity(left: LockFileIdentity, right: LockFileIdentity): boolean {
	return (
		left.raw === right.raw &&
		left.size === right.size &&
		left.mtimeMs === right.mtimeMs &&
		left.dev === right.dev &&
		left.ino === right.ino
	);
}

function isSameFile(left: Stats, right: Stats): boolean {
	return left.dev === right.dev && left.ino === right.ino;
}

function getAgeMs(now: number, timestamp: number): number {
	return Number.isFinite(timestamp) ? Math.max(0, now - timestamp) : Number.POSITIVE_INFINITY;
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
	return typeof error === "object" && error !== null && "code" in error && error.code === "EEXIST";
}

function isNotFoundError(error: unknown): boolean {
	return typeof error === "object" && error !== null && "code" in error && error.code === "ENOENT";
}

function isPidAlive(pid: number): boolean {
	try {
		process.kill(pid, 0);
		return true;
	} catch {
		return false;
	}
}

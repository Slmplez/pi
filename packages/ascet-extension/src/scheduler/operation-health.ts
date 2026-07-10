import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname } from "node:path";
import { type PiAscetRuntimePathOptions, resolvePiAscetOperationHealthPath } from "./paths.ts";

export type AscetOperationHealthStatus = "healthy" | "suspect" | "degraded";
export type AscetOperationFallback = "one_shot";
export type AscetOperationFailureReason = "child_command_timeout" | "cli_lock_timeout" | "scheduler_timeout";

export interface AscetOperationHealthState {
	commandId: string;
	status: AscetOperationHealthStatus;
	fallback?: AscetOperationFallback;
	until?: number;
	reason?: AscetOperationFailureReason;
	failures: number;
}

export interface AscetOperationFailure {
	commandId: string;
	reason: AscetOperationFailureReason;
}

export interface AscetOperationHealthStore {
	getState(commandId: string): AscetOperationHealthState;
	listUnhealthy(): AscetOperationHealthState[];
	recordFailure(failure: AscetOperationFailure): AscetOperationHealthState;
	recordSuccess(commandId: string): AscetOperationHealthState;
	reset(commandId?: string): void;
	loadPersisted(): Promise<void>;
	flush(): Promise<void>;
}

export interface AscetOperationHealthPersistence {
	load(): Promise<string>;
	save(snapshot: string): Promise<void>;
}

interface AscetOperationHealthStoreOptions {
	threshold?: number;
	cooldownMs?: number;
	now?: () => number;
	persistence?: AscetOperationHealthPersistence;
}

const DEFAULT_THRESHOLD = 1;
const DEFAULT_COOLDOWN_MS = 60_000;

function createHealthyState(commandId: string): AscetOperationHealthState {
	return { commandId, status: "healthy", failures: 0 };
}

export function createAscetOperationHealthStore(
	options: AscetOperationHealthStoreOptions = {},
): AscetOperationHealthStore {
	const threshold = Math.max(1, Math.floor(options.threshold ?? DEFAULT_THRESHOLD));
	const cooldownMs = Math.max(1, Math.floor(options.cooldownMs ?? DEFAULT_COOLDOWN_MS));
	const now = options.now ?? Date.now;
	const persistence = options.persistence;
	const states = new Map<string, AscetOperationHealthState>();

	function getState(commandId: string): AscetOperationHealthState {
		const state = states.get(commandId);
		if (!state) {
			return createHealthyState(commandId);
		}
		if (state.status === "degraded" && state.until !== undefined && state.until <= now()) {
			states.delete(commandId);
			return createHealthyState(commandId);
		}
		return { ...state };
	}

	function listUnhealthy(): AscetOperationHealthState[] {
		const result: AscetOperationHealthState[] = [];
		for (const state of states.values()) {
			const current = getState(state.commandId);
			if (current.status !== "healthy") {
				result.push(current);
			}
		}
		return result.sort((left, right) => left.commandId.localeCompare(right.commandId));
	}

	function recordFailure(failure: AscetOperationFailure): AscetOperationHealthState {
		const current = getState(failure.commandId);
		const failures = current.failures + 1;
		const degraded = failures >= threshold;
		const next: AscetOperationHealthState = degraded
			? {
					commandId: failure.commandId,
					status: "degraded",
					fallback: "one_shot",
					until: now() + cooldownMs,
					reason: failure.reason,
					failures,
				}
			: {
					commandId: failure.commandId,
					status: "suspect",
					reason: failure.reason,
					failures,
				};
		states.set(failure.commandId, next);
		return { ...next };
	}

	function recordSuccess(commandId: string): AscetOperationHealthState {
		states.delete(commandId);
		return createHealthyState(commandId);
	}

	function reset(commandId?: string): void {
		if (commandId) {
			states.delete(commandId);
			return;
		}
		states.clear();
	}

	async function loadPersisted(): Promise<void> {
		if (!persistence) {
			return;
		}
		const raw = await persistence.load();
		if (!raw.trim()) {
			return;
		}
		let parsed: { operations?: unknown };
		try {
			parsed = JSON.parse(raw) as { operations?: unknown };
		} catch {
			return;
		}
		if (!Array.isArray(parsed.operations)) {
			return;
		}
		states.clear();
		for (const item of parsed.operations) {
			if (isPersistedState(item)) {
				states.set(item.commandId, { ...item });
			}
		}
	}

	async function flush(): Promise<void> {
		if (!persistence) {
			return;
		}
		await persistence.save(JSON.stringify({ version: 1, operations: listUnhealthy() }));
	}

	return { getState, listUnhealthy, recordFailure, recordSuccess, reset, loadPersisted, flush };
}

export function createFileOperationHealthPersistence(
	path = resolvePiAscetOperationHealthPath(),
): AscetOperationHealthPersistence {
	return {
		async load(): Promise<string> {
			try {
				return await readFile(path, "utf8");
			} catch (error) {
				if (isNotFoundError(error)) {
					return "";
				}
				throw error;
			}
		},
		async save(snapshot: string): Promise<void> {
			await mkdir(dirname(path), { recursive: true });
			await writeFile(path, snapshot, "utf8");
		},
	};
}

export function formatAscetOperationHealthStatus(states: AscetOperationHealthState[]): string {
	if (states.length === 0) {
		return ["Operation Health:", "  degraded: none"].join("\n");
	}
	return [
		"Operation Health:",
		...states.map((state) =>
			[
				`  ${state.commandId}`,
				`status=${state.status}`,
				state.fallback ? `fallback=${state.fallback}` : null,
				state.reason ? `reason=${state.reason}` : null,
				`failures=${state.failures}`,
				state.until ? `until=${new Date(state.until).toISOString()}` : null,
			]
				.filter(Boolean)
				.join(" "),
		),
	].join("\n");
}

let globalAscetOperationHealthPath: string | null = null;
let globalAscetOperationHealthStore: AscetOperationHealthStore | null = null;

export function getGlobalAscetOperationHealthStore(options: PiAscetRuntimePathOptions = {}): AscetOperationHealthStore {
	const healthPath = resolvePiAscetOperationHealthPath(options);
	if (!globalAscetOperationHealthStore || globalAscetOperationHealthPath !== healthPath) {
		globalAscetOperationHealthPath = healthPath;
		globalAscetOperationHealthStore = createAscetOperationHealthStore({
			persistence: createFileOperationHealthPersistence(healthPath),
		});
	}
	return globalAscetOperationHealthStore;
}

export function resetGlobalAscetOperationHealthStoreForTests(): void {
	globalAscetOperationHealthPath = null;
	globalAscetOperationHealthStore = createAscetOperationHealthStore();
}

function isNotFoundError(error: unknown): boolean {
	return (
		typeof error === "object" && error !== null && "code" in error && (error as { code?: unknown }).code === "ENOENT"
	);
}

function isPersistedState(value: unknown): value is AscetOperationHealthState {
	if (typeof value !== "object" || value === null) {
		return false;
	}
	const candidate = value as Partial<AscetOperationHealthState>;
	return (
		typeof candidate.commandId === "string" &&
		(candidate.status === "suspect" || candidate.status === "degraded") &&
		typeof candidate.failures === "number"
	);
}

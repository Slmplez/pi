import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

export interface PiAscetRuntimePathOptions {
	env?: Record<string, string | undefined>;
}

function getEnv(options: PiAscetRuntimePathOptions | undefined, key: string): string | undefined {
	return options?.env?.[key] ?? process.env[key];
}

export function resolvePiAscetRuntimeRoot(options: PiAscetRuntimePathOptions = {}): string {
	const override = getEnv(options, "PI_ASCET_RUNTIME_DIR");
	if (override) {
		return resolve(override);
	}
	const localAppData = getEnv(options, "LOCALAPPDATA");
	const baseDir = localAppData ? join(localAppData, "PI", "ascet") : join(tmpdir(), "PI", "ascet");
	return resolve(baseDir);
}

export function resolvePiAscetLockPath(options: PiAscetRuntimePathOptions = {}): string {
	const override = getEnv(options, "PI_ASCET_LOCK_PATH");
	if (override) {
		return resolve(override);
	}
	return join(resolvePiAscetRuntimeRoot(options), "locks", "ascet-toolapi.lock");
}

export function resolvePiAscetOperationHealthPath(options: PiAscetRuntimePathOptions = {}): string {
	const override = getEnv(options, "PI_ASCET_OPERATION_HEALTH_PATH");
	if (override) {
		return resolve(override);
	}
	return join(resolvePiAscetRuntimeRoot(options), "operation-health.json");
}

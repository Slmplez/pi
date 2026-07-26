export interface AscetSqliteReadPoolConfig {
	enabled: boolean;
	workerCount: number;
	mode: "direct";
}

function parsePositiveInt(value: string | undefined, fallback: number): number {
	const parsed = Number.parseInt(value ?? "", 10);
	return Number.isFinite(parsed) && parsed > 0 ? parsed : fallback;
}

export function getAscetSqliteReadPoolConfig(
	env: Record<string, string | undefined> = process.env,
): AscetSqliteReadPoolConfig {
	const enabled = (env.PI_ASCET_SQLITE_READ_WORKERS ?? "0") === "1";
	return {
		enabled,
		workerCount: parsePositiveInt(env.PI_ASCET_SQLITE_READ_WORKER_COUNT, 4),
		mode: "direct",
	};
}

export function runAscetSqliteReadQuery<T>(query: () => T): T {
	return query();
}

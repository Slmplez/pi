import { getAscetSqliteIndexStatus } from "../search-index-sqlite/status.ts";
import { writeAscetIndexStatusFile } from "../search-index-sqlite/status-file.ts";
import { readAscetIndexStatus } from "./status.ts";
import type { AscetIndexStatusReport } from "./types.ts";

export function repairAscetIndexStatusFile(
	cwd: string,
): AscetIndexStatusReport & { repaired: boolean; source: "sqlite" } {
	const sqlite = getAscetSqliteIndexStatus(cwd);
	const totalDocs = sqlite.areas.reduce((total, area) => total + area.itemCount, 0);
	writeAscetIndexStatusFile(cwd, {
		state: sqlite.status === "missing" ? "failed" : sqlite.status,
		phase: "p0",
		elapsedMs: sqlite.elapsedMs,
		totalDocs,
		staleAreas: sqlite.areas.filter((area) => area.status === "stale").map((area) => area.area),
		areas: Object.fromEntries(
			sqlite.areas.map((area) => [
				area.area,
				{
					status: area.status,
					count: area.itemCount,
					itemCount: area.itemCount,
					elapsedMs: area.elapsedMs,
					errorCode: area.errorCode || undefined,
					errorMessage: area.errorMessage || undefined,
				},
			]),
		),
		error:
			sqlite.status === "missing"
				? { code: "sqlite_index_missing", message: "No active ASCET SQLite index generation was found." }
				: undefined,
	});
	return { ...readAscetIndexStatus({ cwd, detailLevel: "areas" }), repaired: true, source: "sqlite" };
}

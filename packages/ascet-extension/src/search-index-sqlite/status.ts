import { existsSync } from "node:fs";
import { openAscetSearchSqlite } from "./connection.ts";
import { getAscetSearchIndexSqlitePath } from "./paths.ts";
import { ASCET_P0_INDEX_AREAS, ASCET_SEARCH_SQLITE_SCHEMA_VERSION, type AscetP0IndexArea } from "./schema.ts";
import { writeAscetIndexStatusFile } from "./status-file.ts";
import type { AscetSqliteAreaStatus, AscetSqliteIndexStatus } from "./types.ts";

interface RunRow {
	id?: unknown;
	schema_version?: unknown;
	database_name?: unknown;
	database_path?: unknown;
	status?: unknown;
	generated_at_ms?: unknown;
	completed_at_ms?: unknown;
	elapsed_ms?: unknown;
}

interface AreaRow {
	area?: unknown;
	status?: unknown;
	item_count?: unknown;
	elapsed_ms?: unknown;
	scan_complete?: unknown;
	error_code?: unknown;
	error_message?: unknown;
}

function asString(value: unknown): string {
	return typeof value === "string" ? value : "";
}

function asNumber(value: unknown): number {
	return typeof value === "number" && Number.isFinite(value) ? value : 0;
}

function normalizeAreaStatus(value: string): AscetSqliteAreaStatus["status"] {
	if (value === "ready" || value === "stale" || value === "failed" || value === "building") {
		return value;
	}
	return "missing";
}

function normalizeRunStatus(value: string): AscetSqliteIndexStatus["status"] {
	if (value === "ready" || value === "building" || value === "failed" || value === "stale") {
		return value;
	}
	return "missing";
}

function missingStatus(): AscetSqliteIndexStatus {
	return {
		status: "missing",
		runId: "",
		databaseName: "",
		databasePath: "",
		generatedAtMs: 0,
		completedAtMs: 0,
		elapsedMs: 0,
		areas: ASCET_P0_INDEX_AREAS.map((area) => ({
			area,
			status: "missing",
			itemCount: 0,
			elapsedMs: 0,
			scanComplete: false,
			errorCode: "",
			errorMessage: "",
		})),
	};
}

export function getAscetSqliteIndexStatus(cwd: string): AscetSqliteIndexStatus {
	if (!existsSync(getAscetSearchIndexSqlitePath(cwd))) {
		return missingStatus();
	}
	const connection = openAscetSearchSqlite(cwd, "reader");
	try {
		const run = connection.db
			.prepare(`
select id, schema_version, database_name, database_path, status, generated_at_ms, completed_at_ms, elapsed_ms
from ascet_index_runs
where active = 1
limit 1
`)
			.get() as RunRow | undefined;
		if (!run) {
			return missingStatus();
		}
		if (asNumber(run.schema_version) !== ASCET_SEARCH_SQLITE_SCHEMA_VERSION) {
			return missingStatus();
		}
		const runId = asString(run.id);
		const areaRows = connection.db
			.prepare(`
select area, status, item_count, elapsed_ms, scan_complete, error_code, error_message
from ascet_index_areas
where run_id = ?
`)
			.all(runId) as AreaRow[];
		const byArea = new Map<string, AreaRow>();
		for (const row of areaRows) {
			byArea.set(asString(row.area), row);
		}
		const areas = ASCET_P0_INDEX_AREAS.map((area) => {
			const row = byArea.get(area);
			return {
				area,
				status: normalizeAreaStatus(asString(row?.status)),
				itemCount: asNumber(row?.item_count),
				elapsedMs: asNumber(row?.elapsed_ms),
				scanComplete: row?.scan_complete === 1,
				errorCode: asString(row?.error_code),
				errorMessage: asString(row?.error_message),
			};
		});
		const hasFailedArea = areas.some((area) => area.status === "failed");
		const hasBuildingArea = areas.some((area) => area.status === "building");
		const hasIncompleteArea = areas.some((area) => area.status !== "ready");
		const normalizedRunStatus = normalizeRunStatus(asString(run.status));
		return {
			status: hasFailedArea
				? "failed"
				: hasBuildingArea
					? "building"
					: hasIncompleteArea
						? "stale"
						: normalizedRunStatus,
			runId,
			databaseName: asString(run.database_name),
			databasePath: asString(run.database_path),
			generatedAtMs: asNumber(run.generated_at_ms),
			completedAtMs: asNumber(run.completed_at_ms),
			elapsedMs: asNumber(run.elapsed_ms),
			areas,
		};
	} catch {
		return missingStatus();
	} finally {
		connection.close();
	}
}

export function markAscetSqliteIndexAreasStale(cwd: string, areas: readonly AscetP0IndexArea[], reason: string): void {
	if (!existsSync(getAscetSearchIndexSqlitePath(cwd)) || areas.length === 0) {
		return;
	}
	const connection = openAscetSearchSqlite(cwd, "writer");
	try {
		const run = connection.db.prepare("select id from ascet_index_runs where active = 1 limit 1").get() as
			| { id?: unknown }
			| undefined;
		const runId = asString(run?.id);
		if (!runId) {
			return;
		}
		connection.db.exec("begin immediate");
		const update = connection.db.prepare(`
update ascet_index_areas
set status = 'stale', error_code = 'invalidated', error_message = ?
where run_id = ? and area = ?
`);
		for (const area of areas) {
			update.run(reason, runId, area);
		}
		connection.db.prepare("update ascet_index_runs set status = 'stale' where id = ?").run(runId);
		connection.db.exec("commit");
		const staleAreas = [...new Set(areas)];
		writeAscetIndexStatusFile(cwd, {
			state: "stale",
			generation: runId,
			staleAreas,
			areas: Object.fromEntries(
				staleAreas.map((area) => [area, { status: "stale", errorCode: "invalidated", errorMessage: reason }]),
			),
		});
	} catch {
		if (connection.db.isTransaction) {
			connection.db.exec("rollback");
		}
	} finally {
		connection.close();
	}
}

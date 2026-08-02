import { existsSync, readFileSync } from "node:fs";
import { getAscetSqliteIndexStatus } from "../search-index-sqlite/status.ts";
import { type AscetIndexStatusFile, getAscetIndexStatusFilePath } from "../search-index-sqlite/status-file.ts";
import type { AscetIndexStatusOptions, AscetIndexStatusReport } from "./types.ts";

function readStatusFile(cwd: string): AscetIndexStatusFile | undefined {
	const path = getAscetIndexStatusFilePath(cwd);
	if (!existsSync(path)) {
		return undefined;
	}
	try {
		return JSON.parse(readFileSync(path, "utf8")) as AscetIndexStatusFile;
	} catch {
		return undefined;
	}
}

function isoFromMs(value: number): string | undefined {
	return value > 0 ? new Date(value).toISOString() : undefined;
}

export function readAscetIndexStatus(options: AscetIndexStatusOptions): AscetIndexStatusReport {
	const detailLevel = options.detailLevel ?? "summary";
	const sqlite = getAscetSqliteIndexStatus(options.cwd);
	const footer = readStatusFile(options.cwd);
	const totalDocs = sqlite.areas.reduce((total, area) => total + area.itemCount, 0);
	const staleAreas = sqlite.areas.filter((area) => area.status !== "ready").map((area) => area.area);
	const footerInSync =
		footer !== undefined &&
		footer.state === sqlite.status &&
		(footer.generation === undefined || footer.generation === sqlite.runId) &&
		(footer.totalDocs === undefined || footer.totalDocs === totalDocs);

	const report: AscetIndexStatusReport = {
		state: sqlite.status,
		storage: "sqlite",
		totalDocs,
		databaseName: sqlite.databaseName || undefined,
		databasePath: sqlite.databasePath || undefined,
		generatedAt: isoFromMs(sqlite.generatedAtMs),
		elapsedMs: sqlite.elapsedMs || undefined,
		staleAreas: staleAreas.length > 0 ? staleAreas : undefined,
		footer: {
			inSync: footerInSync,
			generation: footer?.generation,
			state: footer?.state,
			totalDocs: footer?.totalDocs,
			path: detailLevel === "full" ? getAscetIndexStatusFilePath(options.cwd) : undefined,
			errorCode: footer?.error?.code,
			errorMessage: footer?.error?.message,
		},
		scheduler: options.includeScheduler ? options.schedulerSnapshot : undefined,
	};

	if (detailLevel !== "summary") {
		report.areas = sqlite.areas.map((area) => ({
			name: area.area,
			state: area.status,
			count: area.itemCount,
			elapsedMs: detailLevel === "full" ? area.elapsedMs : undefined,
			scanComplete: detailLevel === "full" ? area.scanComplete : undefined,
			errorCode: area.errorCode || undefined,
			errorMessage: area.errorMessage || undefined,
		}));
	}

	return report;
}

export function formatAscetIndexStatusSummary(report: AscetIndexStatusReport): string {
	const docs = `${report.totalDocs} docs`;
	const stale = report.staleAreas?.length ? `, stale ${report.staleAreas.length} areas` : "";
	const footer = report.footer?.inSync === false ? ", footer out of sync" : "";
	return `ASCET index: ${report.state} ${docs}${stale}${footer}`;
}

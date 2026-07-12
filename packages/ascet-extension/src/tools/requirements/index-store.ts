import { mkdirSync, statSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import type { RequirementRecord, RequirementWorksheetData } from "./types.ts";

export interface RequirementIndexMeta {
	sourceFile: string;
	sheetName: string;
	fileSize: number;
	mtimeMs: number;
	rowCount: number;
	headers: string[];
	indexedAt: string;
}

function cacheDir(cwd: string): string {
	return resolve(cwd, ".pi", "ascet-design");
}

function buildMeta(worksheet: RequirementWorksheetData): RequirementIndexMeta {
	const stat = statSync(worksheet.sourceFile);
	return {
		sourceFile: worksheet.sourceFile,
		sheetName: worksheet.sheetName,
		fileSize: stat.size,
		mtimeMs: stat.mtimeMs,
		rowCount: worksheet.rowCount,
		headers: worksheet.headers.map((header) => header.name),
		indexedAt: new Date().toISOString(),
	};
}

export function writeRequirementIndex(
	cwd: string,
	worksheet: RequirementWorksheetData,
	records: RequirementRecord[],
): void {
	const dir = cacheDir(cwd);
	mkdirSync(dir, { recursive: true });
	const meta = buildMeta(worksheet);
	writeFileSync(join(dir, "requirements-meta.json"), `${JSON.stringify(meta, null, 2)}\n`, "utf8");
	writeFileSync(
		join(dir, "requirements-index.jsonl"),
		records.map((record) => JSON.stringify(record)).join("\n") + (records.length > 0 ? "\n" : ""),
		"utf8",
	);
	writeFileSync(
		join(dir, "requirements-graph.json"),
		`${JSON.stringify(
			{
				sourceFile: worksheet.sourceFile,
				nodes: records.map((record) => ({
					requirementId: record.requirementId,
					title: record.title,
					rowNumber: record.rowNumber,
					signals: record.signals,
					reusedSignals: record.reusedSignals,
				})),
			},
			null,
			2,
		)}\n`,
		"utf8",
	);
}

import { readdirSync, statSync } from "node:fs";
import { join, resolve } from "node:path";
import { AscetRequirementsError } from "./excel-reader.ts";

const IGNORED_DIRS = new Set([
	".git",
	".pi",
	"node_modules",
	"dist",
	"dist-release",
	"build",
	"coverage",
	"tmp",
	"temp",
]);

const PREFERRED_NAME_PARTS = ["requirement", "risk", "swim", "defect", "lesson", "ascet"];

function isPreferredCandidate(path: string): boolean {
	const lower = path.toLowerCase();
	return PREFERRED_NAME_PARTS.some((part) => lower.includes(part));
}

function collectXlsxFiles(root: string, output: string[], depth = 0): void {
	if (depth > 5) {
		return;
	}
	for (const entry of readdirSync(root, { withFileTypes: true })) {
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) {
				collectXlsxFiles(join(root, entry.name), output, depth + 1);
			}
			continue;
		}
		if (entry.isFile() && entry.name.toLowerCase().endsWith(".xlsx")) {
			output.push(join(root, entry.name));
		}
	}
}

export function discoverRequirementsWorkbook(cwd: string): string {
	const root = resolve(cwd);
	const candidates: string[] = [];
	collectXlsxFiles(root, candidates);
	const existingCandidates = candidates.filter((candidate) => {
		try {
			return statSync(candidate).isFile();
		} catch {
			return false;
		}
	});
	if (existingCandidates.length === 0) {
		throw new AscetRequirementsError("REQUIREMENTS_EXCEL_NOT_FOUND", "No .xlsx requirements workbook was found.", [
			"Place the requirements .xlsx file in the workspace.",
			"Pass sourceFile with the workbook path.",
		]);
	}

	const preferred = existingCandidates.filter(isPreferredCandidate);
	const selectedCandidates = preferred.length > 0 ? preferred : existingCandidates;
	if (selectedCandidates.length === 1) {
		return selectedCandidates[0]!;
	}

	throw new AscetRequirementsError(
		"REQUIREMENTS_EXCEL_AMBIGUOUS",
		`Multiple candidate requirements workbooks were found: ${selectedCandidates.join("; ")}`,
		["Ask the user which Excel file should be used.", "Retry with sourceFile set to the selected workbook."],
	);
}

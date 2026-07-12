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

interface DirectoryEntry {
	name: string;
	isDirectory(): boolean;
	isFile(): boolean;
}

type ReadDirectory = (path: string, options: { withFileTypes: true }) => DirectoryEntry[];

function isPreferredCandidate(path: string): boolean {
	const lower = path.toLowerCase();
	return PREFERRED_NAME_PARTS.some((part) => lower.includes(part));
}

export function isRecoverableDiscoveryError(error: unknown): boolean {
	const code = typeof error === "object" && error !== null && "code" in error ? String(error.code) : undefined;
	return code === "EPERM" || code === "EACCES" || code === "ENOENT" || code === "ENOTDIR";
}

export function collectXlsxFiles(
	root: string,
	output: string[],
	depth = 0,
	readDirectory: ReadDirectory = readdirSync,
): void {
	if (depth > 5) {
		return;
	}
	let entries: DirectoryEntry[];
	try {
		entries = readDirectory(root, { withFileTypes: true });
	} catch (error) {
		if (isRecoverableDiscoveryError(error)) {
			return;
		}
		throw error;
	}
	for (const entry of entries) {
		if (entry.isDirectory()) {
			if (!IGNORED_DIRS.has(entry.name)) {
				collectXlsxFiles(join(root, entry.name), output, depth + 1, readDirectory);
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

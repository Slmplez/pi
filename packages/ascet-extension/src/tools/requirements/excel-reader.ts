import { existsSync } from "node:fs";
import { extname, resolve } from "node:path";
import ExcelJS from "exceljs";
import { profileRequirementHeaders } from "./schema-profiler.ts";
import type { RequirementWorksheetData } from "./types.ts";

export class AscetRequirementsError extends Error {
	code: string;
	recoveryActions: string[];

	constructor(code: string, message: string, recoveryActions: string[] = []) {
		super(message);
		this.name = "AscetRequirementsError";
		this.code = code;
		this.recoveryActions = recoveryActions;
	}
}

function cellText(cell: ExcelJS.Cell): string {
	return cell.text.trim();
}

export async function readRequirementsWorkbook(sourceFile: string): Promise<RequirementWorksheetData> {
	const resolvedSourceFile = resolve(sourceFile);
	const extension = extname(resolvedSourceFile).toLowerCase();
	if (extension === ".xls") {
		throw new AscetRequirementsError(
			"UNSUPPORTED_EXCEL_FORMAT",
			"Unsupported Excel format: .xls. Convert the file to .xlsx and retry.",
			["Convert the workbook to .xlsx.", "Pass the converted file path as sourceFile."],
		);
	}
	if (extension !== ".xlsx") {
		throw new AscetRequirementsError(
			"UNSUPPORTED_EXCEL_FORMAT",
			`Unsupported Excel format: ${extension || "<none>"}.`,
			["Use a .xlsx requirements workbook."],
		);
	}
	if (!existsSync(resolvedSourceFile)) {
		throw new AscetRequirementsError(
			"REQUIREMENTS_EXCEL_NOT_FOUND",
			`Requirements Excel file was not found: ${resolvedSourceFile}`,
			["Place the .xlsx file in the workspace.", "Pass sourceFile with the absolute workbook path."],
		);
	}

	const workbook = new ExcelJS.Workbook();
	await workbook.xlsx.readFile(resolvedSourceFile);
	const worksheet = workbook.worksheets[0];
	if (!worksheet) {
		throw new AscetRequirementsError("REQUIREMENTS_EXCEL_EMPTY", "Requirements workbook has no worksheets.", [
			"Add a worksheet with requirement rows.",
		]);
	}

	const headerRow = worksheet.getRow(1);
	const headers: RequirementWorksheetData["headers"] = [];
	headerRow.eachCell({ includeEmpty: false }, (cell, columnNumber) => {
		const value = cellText(cell);
		if (value.length > 0) {
			headers.push({ name: value, columnNumber });
		}
	});

	const profile = profileRequirementHeaders(headers);
	if (profile.missingRequiredFields.length > 0) {
		throw new AscetRequirementsError(
			"REQUIREMENTS_SCHEMA_UNSUPPORTED",
			`Requirements workbook is missing required columns: ${profile.missingRequiredFields.join(", ")}`,
			["Check the header row.", "Include Design requirement ID and Design requirements name columns."],
		);
	}

	const rows: RequirementWorksheetData["rows"] = [];
	for (let rowNumber = 2; rowNumber <= worksheet.rowCount; rowNumber++) {
		const row = worksheet.getRow(rowNumber);
		const cells = headers
			.map((header) => {
				const cell = row.getCell(header.columnNumber);
				return {
					header: header.name,
					columnNumber: header.columnNumber,
					address: cell.address,
					value: cellText(cell),
				};
			})
			.filter((cell) => cell.value.length > 0);
		if (cells.length > 0) {
			rows.push({ rowNumber, cells });
		}
	}

	return {
		sourceFile: resolvedSourceFile,
		sheetName: worksheet.name,
		headers,
		rows,
		rowCount: rows.length,
	};
}

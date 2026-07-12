import { profileRequirementHeaders } from "./schema-profiler.ts";
import type {
	RequirementCanonicalField,
	RequirementEvidence,
	RequirementRecord,
	RequirementWorksheetData,
} from "./types.ts";

const FIELD_TO_PROPERTY: Partial<Record<RequirementCanonicalField, keyof RequirementRecord>> = {
	title: "title",
	requirement_id: "requirementId",
	description: "description",
	supplier_comments: "supplierComments",
	rb_top_fnid: "rbTopFnid",
	feature: "feature",
};

function splitList(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	return value
		.split(/[\n;,]+/g)
		.map((part) => part.trim())
		.filter((part) => part.length > 0);
}

function extractIds(value: string, pattern: RegExp): string[] {
	const ids = new Set<string>();
	for (const match of value.matchAll(pattern)) {
		if (match[0]) {
			ids.add(match[0]);
		}
	}
	return Array.from(ids);
}

function parseReusedSignals(value: string | undefined): RequirementRecord["reusedSignals"] {
	return splitList(value).map((part) => {
		const [signalPart, idsPart] = part.split(":");
		const ids = extractIds(idsPart ?? part, /\b\d{4,9}\b/g);
		return {
			signal: signalPart?.trim() || undefined,
			requirementIds: ids,
			raw: part,
		};
	});
}

function extractDeviations(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	const lower = value.toLowerCase();
	return lower.includes("deviation") ? [value] : [];
}

function extractAcceptedExceptions(value: string | undefined): string[] {
	if (!value) {
		return [];
	}
	const lower = value.toLowerCase();
	return lower.includes("accepted") ? [value] : [];
}

function createEvidence(
	worksheet: RequirementWorksheetData,
	rowNumber: number,
	column: string,
	cellAddress: string,
	value: string,
	reason: string,
): RequirementEvidence {
	return {
		sourceFile: worksheet.sourceFile,
		sheetName: worksheet.sheetName,
		rowNumber,
		column,
		cellAddress,
		value,
		reason,
		evidenceKind: "direct",
	};
}

export function normalizeRequirementRecords(worksheet: RequirementWorksheetData): RequirementRecord[] {
	const profile = profileRequirementHeaders(worksheet.headers);
	const headerToField = new Map<string, RequirementCanonicalField>();
	for (const [field, header] of Object.entries(profile.fieldToHeader) as Array<
		[RequirementCanonicalField, { name: string; columnNumber: number } | undefined]
	>) {
		if (header) {
			headerToField.set(header.name, field);
		}
	}

	const records: RequirementRecord[] = [];
	for (const row of worksheet.rows) {
		const rawCells: RequirementRecord["rawCells"] = {};
		const evidenceByField: RequirementRecord["evidenceByField"] = {};
		const record: RequirementRecord = {
			sourceFile: worksheet.sourceFile,
			sheetName: worksheet.sheetName,
			rowNumber: row.rowNumber,
			ccps: [],
			signalGroups: [],
			signals: [],
			reusedSignals: [],
			defects: [],
			swims: [],
			lessons: [],
			deviations: [],
			acceptedExceptions: [],
			rawCells,
			evidenceByField,
		};

		for (const cell of row.cells) {
			const field = headerToField.get(cell.header);
			if (!field) {
				continue;
			}
			rawCells[field] = cell.value;
			evidenceByField[field] = createEvidence(
				worksheet,
				row.rowNumber,
				cell.header,
				cell.address,
				cell.value,
				`Matched ${field} column.`,
			);

			const property = FIELD_TO_PROPERTY[field];
			if (property) {
				(record[property] as string | undefined) = cell.value;
			}
		}

		record.ccps = splitList(rawCells.ccp);
		record.signalGroups = splitList(rawCells.signal_group);
		record.signals = splitList(rawCells.signal);
		record.reusedSignals = parseReusedSignals(rawCells.reused_signal);
		record.defects = extractIds(rawCells.defect ?? "", /\b\d{4,9}\b/g);
		record.swims = extractIds(rawCells.swim ?? "", /\bSWIM-\d+\b/gi);
		record.lessons = splitList(rawCells.lesson_learned);
		record.deviations = extractDeviations(rawCells.supplier_comments);
		record.acceptedExceptions = extractAcceptedExceptions(rawCells.supplier_comments);

		if (record.requirementId || record.title || record.description) {
			records.push(record);
		}
	}
	return records;
}

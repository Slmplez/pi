import { profileRequirementHeaders } from "./schema-profiler.ts";
import type {
	RequirementCanonicalField,
	RequirementEvidence,
	RequirementRecord,
	RequirementRiskCell,
	RequirementWorksheetData,
	RiskType,
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

function extractRiskIdentifiers(value: string, riskType: RiskType): string[] {
	if (riskType === "bosch_defect") {
		return extractIds(value, /\b\d{4,9}\b/g);
	}
	if (riskType === "coem_swim") {
		return extractIds(value, /\bSWIM-\d+\b/gi);
	}
	if (riskType === "lesson_learned") {
		return extractIds(value, /\b(?:LL-\d+|\d{4,9})\b/gi);
	}
	return extractIds(value, /\b(?:SWIM-\d+|LL-\d+|\d{4,9})\b/gi);
}

function createRiskCell(
	riskType: RiskType,
	field: RequirementCanonicalField,
	contentRaw: string | undefined,
	evidence: RequirementEvidence | undefined,
): RequirementRiskCell | undefined {
	const value = contentRaw?.trim();
	if (!value || !evidence) {
		return undefined;
	}
	return {
		riskType,
		field,
		contentRaw: value,
		identifiers: extractRiskIdentifiers(value, riskType),
		evidence,
	};
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
			riskCells: [],
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

		for (const riskCell of [
			createRiskCell(
				"supplier_comments",
				"supplier_comments",
				rawCells.supplier_comments,
				evidenceByField.supplier_comments,
			),
			createRiskCell("bosch_defect", "defect", rawCells.defect, evidenceByField.defect),
			createRiskCell("coem_swim", "swim", rawCells.swim, evidenceByField.swim),
			createRiskCell("lesson_learned", "lesson_learned", rawCells.lesson_learned, evidenceByField.lesson_learned),
			...record.deviations.map((value) =>
				createRiskCell("deviation", "supplier_comments", value, evidenceByField.supplier_comments),
			),
			...record.acceptedExceptions.map((value) =>
				createRiskCell("accepted_exception", "supplier_comments", value, evidenceByField.supplier_comments),
			),
		]) {
			if (riskCell) {
				record.riskCells.push(riskCell);
			}
		}

		if (record.requirementId || record.title || record.description) {
			records.push(record);
		}
	}
	return records;
}

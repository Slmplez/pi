import { normalizedText, signalFamily } from "./entities.ts";
import type { RequirementEvidence, RequirementRecord } from "./types.ts";

export interface ScoreAccumulator {
	score: number;
	reasons: string[];
	evidence: RequirementEvidence[];
}

function addScore(accumulator: ScoreAccumulator, score: number, reason: string, evidence?: RequirementEvidence): void {
	accumulator.score += score;
	accumulator.reasons.push(reason);
	if (evidence) {
		accumulator.evidence.push(evidence);
	}
}

function containsIgnoreCase(value: string | undefined, query: string): boolean {
	return normalizedText(value).includes(query.toLowerCase());
}

export function scoreRequirementId(record: RequirementRecord, ids: string[], accumulator: ScoreAccumulator): void {
	if (!record.requirementId) {
		return;
	}
	for (const id of ids) {
		if (record.requirementId === id) {
			addScore(accumulator, 1000, `Exact requirement ID match: ${id}`, record.evidenceByField.requirement_id);
		} else if (record.requirementId.includes(id)) {
			addScore(accumulator, 300, `Partial requirement ID match: ${id}`, record.evidenceByField.requirement_id);
		}
	}
}

export function scoreSignals(record: RequirementRecord, signals: string[], accumulator: ScoreAccumulator): void {
	for (const signal of signals) {
		const signalLower = signal.toLowerCase();
		for (const recordSignal of record.signals) {
			if (recordSignal.toLowerCase() === signalLower) {
				addScore(accumulator, 450, `Exact signal match: ${signal}`, record.evidenceByField.signal);
			} else if (
				recordSignal.toLowerCase().includes(signalLower) ||
				signalLower.includes(recordSignal.toLowerCase())
			) {
				addScore(accumulator, 250, `Signal contains match: ${signal}`, record.evidenceByField.signal);
			} else if (signalFamily(recordSignal).toLowerCase() === signalFamily(signal).toLowerCase()) {
				addScore(accumulator, 150, `Signal family match: ${signal}`);
			}
		}
		for (const reused of record.reusedSignals) {
			if (reused.signal?.toLowerCase() === signalLower) {
				addScore(accumulator, 400, `Reused signal match: ${signal}`, record.evidenceByField.reused_signal);
			} else if (reused.raw.toLowerCase().includes(signalLower)) {
				addScore(accumulator, 220, `Reused signal contains match: ${signal}`, record.evidenceByField.reused_signal);
			}
		}
	}
}

export function scoreText(record: RequirementRecord, keywords: string[], accumulator: ScoreAccumulator): void {
	const weightedFields: Array<{
		field: keyof RequirementRecord["rawCells"];
		value: string | undefined;
		score: number;
		label: string;
	}> = [
		{ field: "title", value: record.title, score: 120, label: "title" },
		{ field: "description", value: record.description, score: 80, label: "description" },
		{ field: "supplier_comments", value: record.supplierComments, score: 90, label: "supplier comments" },
		{ field: "feature", value: record.feature, score: 70, label: "feature" },
		{ field: "ccp", value: record.rawCells.ccp, score: 60, label: "CCP" },
		{ field: "defect", value: record.rawCells.defect, score: 100, label: "defect" },
		{ field: "swim", value: record.rawCells.swim, score: 100, label: "SWIM" },
		{ field: "lesson_learned", value: record.rawCells.lesson_learned, score: 100, label: "lesson learned" },
	];

	for (const keyword of keywords) {
		for (const field of weightedFields) {
			if (containsIgnoreCase(field.value, keyword)) {
				addScore(
					accumulator,
					field.score,
					`Keyword '${keyword}' matched ${field.label}.`,
					record.evidenceByField[field.field],
				);
			}
		}
	}
}

export function scoreExternalIds(
	record: RequirementRecord,
	defects: string[],
	swims: string[],
	accumulator: ScoreAccumulator,
): void {
	for (const defect of defects) {
		if (record.defects.includes(defect)) {
			addScore(accumulator, 500, `Defect match: ${defect}`, record.evidenceByField.defect);
		}
	}
	for (const swim of swims) {
		if (record.swims.some((value) => value.toUpperCase() === swim.toUpperCase())) {
			addScore(accumulator, 500, `SWIM match: ${swim}`, record.evidenceByField.swim);
		}
	}
}

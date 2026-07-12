import { extractRequirementQueryEntities } from "./entities.ts";
import { type ScoreAccumulator, scoreExternalIds, scoreRequirementId, scoreSignals, scoreText } from "./scoring.ts";
import type { AscetRequirementsParams, RequirementRecord, RequirementSearchCandidate } from "./types.ts";

function candidateForRecord(
	record: RequirementRecord,
	params: AscetRequirementsParams,
): RequirementSearchCandidate | undefined {
	const entities = extractRequirementQueryEntities(params.query, params.requirementId, params.signal);
	const accumulator: ScoreAccumulator = { score: 0, reasons: [], evidence: [] };
	scoreRequirementId(record, entities.requirementIds, accumulator);
	scoreSignals(record, entities.signals, accumulator);
	scoreExternalIds(record, entities.defects, entities.swims, accumulator);
	scoreText(record, entities.keywords, accumulator);

	if (accumulator.score <= 0) {
		return undefined;
	}

	return {
		record,
		score: accumulator.score,
		reasons: accumulator.reasons,
		evidence: accumulator.evidence,
	};
}

export function searchRequirementRecords(
	records: RequirementRecord[],
	params: AscetRequirementsParams,
	limit: number,
): RequirementSearchCandidate[] {
	return records
		.map((record) => candidateForRecord(record, params))
		.filter((candidate): candidate is RequirementSearchCandidate => candidate !== undefined)
		.sort((left, right) => right.score - left.score || left.record.rowNumber - right.record.rowNumber)
		.slice(0, limit);
}

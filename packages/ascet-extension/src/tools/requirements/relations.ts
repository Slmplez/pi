import { signalFamily } from "./entities.ts";
import type {
	RequirementEvidence,
	RequirementRecord,
	RequirementRelationRiskItem,
	RequirementSearchCandidate,
} from "./types.ts";

function intersects(left: string[], right: string[]): string | undefined {
	const rightSet = new Set(right.map((value) => value.toLowerCase()));
	return left.find((value) => rightSet.has(value.toLowerCase()));
}

function inferEvidence(evidence: RequirementEvidence | undefined, reason: string): RequirementEvidence | undefined {
	if (!evidence) {
		return undefined;
	}
	return {
		...evidence,
		reason,
		evidenceKind: "inferred",
	};
}

function relationItem(
	record: RequirementRecord,
	relationType: RequirementRelationRiskItem["relationType"],
	field: RequirementRelationRiskItem["field"],
	value: string,
	reason: string,
	evidence: RequirementEvidence | undefined,
): RequirementRelationRiskItem | undefined {
	if (!evidence) {
		return undefined;
	}
	return {
		field,
		value,
		reason,
		evidence,
		relatedRequirementId: record.requirementId,
		relatedTitle: record.title,
		relationType,
	};
}

function reusedReferencesRequirement(record: RequirementRecord, requirementId: string | undefined): string | undefined {
	if (!requirementId) {
		return undefined;
	}
	return record.reusedSignals.find((reference) => reference.requirementIds.includes(requirementId))?.raw;
}

function riskKeyword(value: string | undefined): string | undefined {
	if (!value) {
		return undefined;
	}
	const lower = value.toLowerCase();
	for (const keyword of ["deviation", "defect", "fallback", "quality", "accepted", "rejected"]) {
		if (lower.includes(keyword)) {
			return keyword;
		}
	}
	return undefined;
}

function containsRequirementReference(
	record: RequirementRecord,
	requirementId: string | undefined,
): RequirementEvidence | undefined {
	if (!requirementId) {
		return undefined;
	}
	for (const field of ["description", "supplier_comments", "reused_signal", "lesson_learned"] as const) {
		const value = record.rawCells[field];
		if (value?.includes(requirementId)) {
			return record.evidenceByField[field];
		}
	}
	return undefined;
}

function hasWheelPositionToken(signal: string): boolean {
	return /\.(?:Frnt|Front|Rear|Re|Le|Ri|Left|Right)/i.test(signal);
}

export function expandRequirementRelations(
	targets: RequirementSearchCandidate[],
	records: RequirementRecord[],
	relationDepth: 0 | 1 | 2,
	limit: number,
): RequirementRelationRiskItem[] {
	if (relationDepth === 0) {
		return [];
	}

	const targetIds = new Set(targets.map((target) => target.record.requirementId).filter((id): id is string => !!id));
	const targetRecords = targets.map((target) => target.record);
	const relationRisks: RequirementRelationRiskItem[] = [];

	for (const record of records) {
		if (record.requirementId && targetIds.has(record.requirementId)) {
			continue;
		}

		for (const target of targetRecords) {
			const sameSignal = intersects(target.signals, record.signals);
			if (sameSignal) {
				const item = relationItem(
					record,
					"same_signal",
					"signal",
					sameSignal,
					`Related by same signal: ${sameSignal}`,
					record.evidenceByField.signal,
				);
				if (item) relationRisks.push(item);
			}

			const targetReuse = reusedReferencesRequirement(target, record.requirementId);
			const recordReuse = reusedReferencesRequirement(record, target.requirementId);
			const reusedValue = targetReuse ?? recordReuse;
			if (reusedValue) {
				const item = relationItem(
					record,
					"same_reused_signal",
					"reused_signal",
					reusedValue,
					"Related by reused signal requirement reference.",
					record.evidenceByField.reused_signal ?? target.evidenceByField.reused_signal,
				);
				if (item) relationRisks.push(item);
			}

			const crossReferenceEvidence =
				containsRequirementReference(record, target.requirementId) ??
				containsRequirementReference(target, record.requirementId);
			if (crossReferenceEvidence) {
				const item = relationItem(
					record,
					"requirement_cross_reference",
					"description",
					record.requirementId ?? crossReferenceEvidence.value,
					"Related by explicit requirement ID cross-reference.",
					crossReferenceEvidence,
				);
				if (item) relationRisks.push(item);
			}

			if (target.feature && record.feature && target.feature.toLowerCase() === record.feature.toLowerCase()) {
				const item = relationItem(
					record,
					"same_feature",
					"feature",
					record.feature,
					`Related by same feature: ${record.feature}`,
					record.evidenceByField.feature,
				);
				if (item) relationRisks.push(item);
			}

			const sameCcp = intersects(target.ccps, record.ccps);
			if (sameCcp) {
				const item = relationItem(
					record,
					"same_ccp",
					"ccp",
					sameCcp,
					`Related by same CCP: ${sameCcp}`,
					record.evidenceByField.ccp,
				);
				if (item) relationRisks.push(item);
			}

			const sameDefect = intersects(target.defects, record.defects);
			if (sameDefect) {
				const item = relationItem(
					record,
					"same_defect",
					"defect",
					sameDefect,
					`Related by same defect: ${sameDefect}`,
					record.evidenceByField.defect,
				);
				if (item) relationRisks.push(item);
			}

			const sameSwim = intersects(target.swims, record.swims);
			if (sameSwim) {
				const item = relationItem(
					record,
					"same_swim",
					"swim",
					sameSwim,
					`Related by same SWIM: ${sameSwim}`,
					record.evidenceByField.swim,
				);
				if (item) relationRisks.push(item);
			}

			for (const targetSignal of target.signals) {
				for (const recordSignal of record.signals) {
					if (targetSignal !== recordSignal && signalFamily(targetSignal) === signalFamily(recordSignal)) {
						const item = relationItem(
							record,
							"signal_family",
							"signal",
							recordSignal,
							`Potentially related by signal family: ${signalFamily(recordSignal)}`,
							inferEvidence(record.evidenceByField.signal, "Signal family inferred from shared prefix."),
						);
						if (item) relationRisks.push(item);

						if (hasWheelPositionToken(targetSignal) && hasWheelPositionToken(recordSignal)) {
							const wheelItem = relationItem(
								record,
								"wheel_position_family",
								"signal",
								recordSignal,
								`Potentially related by wheel-position signal family: ${signalFamily(recordSignal)}`,
								inferEvidence(
									record.evidenceByField.signal,
									"Wheel-position relation inferred from signal family.",
								),
							);
							if (wheelItem) relationRisks.push(wheelItem);
						}
					}
				}
			}

			const targetKeyword = riskKeyword(target.supplierComments);
			const recordKeyword = riskKeyword(record.supplierComments);
			if (targetKeyword && recordKeyword && targetKeyword === recordKeyword) {
				const item = relationItem(
					record,
					"risk_keyword",
					"supplier_comments",
					record.supplierComments ?? recordKeyword,
					`Potentially related by risk keyword: ${recordKeyword}`,
					inferEvidence(record.evidenceByField.supplier_comments, "Risk keyword relation inferred from comments."),
				);
				if (item) relationRisks.push(item);
			}
		}
	}

	const seen = new Set<string>();
	return relationRisks
		.filter((risk) => {
			const key = `${risk.relatedRequirementId}:${risk.relationType}:${risk.value}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		})
		.slice(0, Math.max(0, limit));
}

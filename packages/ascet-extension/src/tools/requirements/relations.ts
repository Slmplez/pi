import { signalFamily } from "./entities.ts";
import type {
	RelationLead,
	RelationType,
	RequirementEvidence,
	RequirementRecord,
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

function sanitizeIdPart(value: string | undefined): string {
	return (value ?? "unknown").replace(/[^A-Za-z0-9_.-]+/g, "_");
}

function makeLeadId(
	target: RequirementRecord,
	record: RequirementRecord,
	relationType: RelationType,
	value: string,
): string {
	return `${sanitizeIdPart(target.requirementId)}->${sanitizeIdPart(record.requirementId)}:${relationType}:${sanitizeIdPart(value)}`;
}

function relationLead(
	target: RequirementRecord,
	record: RequirementRecord,
	relationType: RelationType,
	value: string,
	sourceField: string,
	targetEvidence: RequirementEvidence | undefined,
	relatedEvidence: RequirementEvidence | undefined,
	confidence: RelationLead["confidence"] = "high",
): RelationLead {
	return {
		leadId: makeLeadId(target, record, relationType, value),
		targetRequirementId: target.requirementId,
		relatedRequirementId: record.requirementId,
		relatedRequirementTitle: record.title,
		relationType,
		relationEvidence: {
			value,
			targetCell: targetEvidence?.cellAddress,
			relatedCell: relatedEvidence?.cellAddress,
			sourceField,
		},
		confidence,
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
): RelationLead[] {
	if (relationDepth === 0) {
		return [];
	}

	const targetIds = new Set(targets.map((target) => target.record.requirementId).filter((id): id is string => !!id));
	const targetRecords = targets.map((target) => target.record);
	const relationLeads: RelationLead[] = [];

	for (const record of records) {
		if (record.requirementId && targetIds.has(record.requirementId)) {
			continue;
		}

		for (const target of targetRecords) {
			const sameSignal = intersects(target.signals, record.signals);
			if (sameSignal) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_signal",
						sameSignal,
						"signal",
						target.evidenceByField.signal,
						record.evidenceByField.signal,
					),
				);
			}

			const targetReuse = reusedReferencesRequirement(target, record.requirementId);
			const recordReuse = reusedReferencesRequirement(record, target.requirementId);
			const reusedValue = targetReuse ?? recordReuse;
			if (reusedValue) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_reused_signal",
						reusedValue,
						"reused_signal",
						target.evidenceByField.reused_signal,
						record.evidenceByField.reused_signal,
					),
				);
			}

			const crossReferenceEvidence =
				containsRequirementReference(record, target.requirementId) ??
				containsRequirementReference(target, record.requirementId);
			if (crossReferenceEvidence) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"requirement_cross_reference",
						record.requirementId ?? crossReferenceEvidence.value,
						"description",
						target.evidenceByField.description,
						crossReferenceEvidence,
					),
				);
			}

			if (target.feature && record.feature && target.feature.toLowerCase() === record.feature.toLowerCase()) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_feature",
						record.feature,
						"feature",
						target.evidenceByField.feature,
						record.evidenceByField.feature,
					),
				);
			}

			const sameCcp = intersects(target.ccps, record.ccps);
			if (sameCcp) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_ccp",
						sameCcp,
						"ccp",
						target.evidenceByField.ccp,
						record.evidenceByField.ccp,
					),
				);
			}

			const sameDefect = intersects(target.defects, record.defects);
			if (sameDefect) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_defect",
						sameDefect,
						"defect",
						target.evidenceByField.defect,
						record.evidenceByField.defect,
					),
				);
			}

			const sameSwim = intersects(target.swims, record.swims);
			if (sameSwim) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"same_swim",
						sameSwim,
						"swim",
						target.evidenceByField.swim,
						record.evidenceByField.swim,
					),
				);
			}

			for (const targetSignal of target.signals) {
				for (const recordSignal of record.signals) {
					if (targetSignal !== recordSignal && signalFamily(targetSignal) === signalFamily(recordSignal)) {
						relationLeads.push(
							relationLead(
								target,
								record,
								"signal_family",
								recordSignal,
								"signal",
								target.evidenceByField.signal,
								inferEvidence(record.evidenceByField.signal, "Signal family inferred from shared prefix."),
								"medium",
							),
						);

						if (hasWheelPositionToken(targetSignal) && hasWheelPositionToken(recordSignal)) {
							relationLeads.push(
								relationLead(
									target,
									record,
									"wheel_position_family",
									recordSignal,
									"signal",
									target.evidenceByField.signal,
									inferEvidence(
										record.evidenceByField.signal,
										"Wheel-position relation inferred from signal family.",
									),
									"medium",
								),
							);
						}
					}
				}
			}

			const targetKeyword = riskKeyword(target.supplierComments);
			const recordKeyword = riskKeyword(record.supplierComments);
			if (targetKeyword && recordKeyword && targetKeyword === recordKeyword) {
				relationLeads.push(
					relationLead(
						target,
						record,
						"risk_keyword",
						record.supplierComments ?? recordKeyword,
						"supplier_comments",
						target.evidenceByField.supplier_comments,
						inferEvidence(
							record.evidenceByField.supplier_comments,
							"Risk keyword relation inferred from comments.",
						),
						"low",
					),
				);
			}
		}
	}

	const seen = new Set<string>();
	return relationLeads
		.filter((lead) => {
			const key = `${lead.relatedRequirementId}:${lead.relationType}:${lead.relationEvidence.value}`;
			if (seen.has(key)) {
				return false;
			}
			seen.add(key);
			return true;
		})
		.slice(0, Math.max(0, limit));
}

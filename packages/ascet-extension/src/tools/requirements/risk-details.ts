import { paginate } from "./pagination.ts";
import type {
	AscetRequirementsParams,
	DetailCompletion,
	RelationLead,
	RequirementRecord,
	RequirementRiskDetail,
	RiskPriorityMode,
	RiskType,
} from "./types.ts";

const RISK_TYPE_PRIORITY: RiskType[] = [
	"bosch_defect",
	"coem_swim",
	"lesson_learned",
	"deviation",
	"accepted_exception",
	"supplier_comments",
];

function evidenceRef(sheetName: string, cellAddress: string): string {
	return `${sheetName}!${cellAddress}`;
}

function summarizeRisk(raw: string): string {
	const normalized = raw.replace(/\s+/g, " ").trim();
	return normalized.length > 160 ? `${normalized.slice(0, 157)}...` : normalized;
}

function impactBasisFor(sourceLead: RelationLead | undefined): RequirementRiskDetail["impactBasis"] {
	return sourceLead ? "relation_inference" : "direct_evidence";
}

function impactConfidenceFor(sourceLead: RelationLead | undefined): RequirementRiskDetail["impactConfidence"] {
	return sourceLead?.confidence ?? "high";
}

function makeRiskId(params: {
	targetRequirementId?: string;
	relatedRequirementId?: string;
	riskType: RiskType;
	evidenceRef: string;
	identifier?: string;
}): string {
	const evidenceKey = params.identifier ?? params.evidenceRef;
	return [
		params.targetRequirementId ?? "target",
		params.relatedRequirementId ?? params.targetRequirementId ?? "self",
		params.riskType,
		evidenceKey,
	]
		.join(":")
		.replace(/\s+/g, "_");
}

function toRiskDetail(
	target: RequirementRecord | undefined,
	record: RequirementRecord,
	sourceLead: RelationLead | undefined,
): RequirementRiskDetail[] {
	return record.riskCells.map((cell) => {
		const ref = evidenceRef(cell.evidence.sheetName, cell.evidence.cellAddress);
		const relatedRequirementId = sourceLead ? record.requirementId : undefined;
		const firstIdentifier = cell.identifiers[0];
		return {
			riskId: makeRiskId({
				targetRequirementId: target?.requirementId ?? record.requirementId,
				relatedRequirementId,
				riskType: cell.riskType,
				evidenceRef: ref,
				identifier: firstIdentifier,
			}),
			riskKey: {
				targetRequirementId: target?.requirementId ?? record.requirementId,
				relatedRequirementId,
				riskType: cell.riskType,
				evidenceRef: ref,
			},
			sourceLeadId: sourceLead?.leadId,
			targetRequirementId: target?.requirementId ?? record.requirementId,
			relatedRequirementId,
			relatedRequirementTitle: sourceLead ? record.title : undefined,
			relationType: sourceLead?.relationType,
			riskType: cell.riskType,
			riskContentRaw: cell.contentRaw,
			riskIdentifiers: cell.identifiers,
			riskSummary: summarizeRisk(cell.contentRaw),
			evidence: cell.evidence,
			ascetImpactHint: sourceLead
				? `Risk may affect ASCET design through ${sourceLead.relationType}: ${sourceLead.relationEvidence.value}.`
				: "Risk is directly attached to the target requirement.",
			impactBasis: impactBasisFor(sourceLead),
			impactConfidence: impactConfidenceFor(sourceLead),
			confidence: sourceLead?.confidence ?? "high",
		};
	});
}

function selectRelatedRecords(
	records: RequirementRecord[],
	leads: RelationLead[],
): Array<{
	record: RequirementRecord;
	lead: RelationLead;
}> {
	const byId = new Map(records.map((record) => [record.requirementId, record]));
	return leads
		.map((lead) => {
			const record = byId.get(lead.relatedRequirementId);
			return record ? { record, lead } : undefined;
		})
		.filter((item): item is { record: RequirementRecord; lead: RelationLead } => !!item);
}

function filterLeads(leads: RelationLead[], params: AscetRequirementsParams): RelationLead[] {
	return leads.filter((lead) => {
		if (params.leadId && lead.leadId !== params.leadId) {
			return false;
		}
		if (params.relatedRequirementId && lead.relatedRequirementId !== params.relatedRequirementId) {
			return false;
		}
		if (params.relationTypes?.length && !params.relationTypes.includes(lead.relationType)) {
			return false;
		}
		return true;
	});
}

function sortRisks(risks: RequirementRiskDetail[], priorityMode: RiskPriorityMode): RequirementRiskDetail[] {
	const copy = [...risks];
	if (priorityMode === "source_order") {
		return copy.sort((left, right) => left.evidence.rowNumber - right.evidence.rowNumber);
	}
	return copy.sort((left, right) => {
		const typeDelta = RISK_TYPE_PRIORITY.indexOf(left.riskType) - RISK_TYPE_PRIORITY.indexOf(right.riskType);
		if (priorityMode === "risk_severity_first" && typeDelta !== 0) {
			return typeDelta;
		}
		const relationDelta = Number(Boolean(right.sourceLeadId)) - Number(Boolean(left.sourceLeadId));
		if (priorityMode === "ascet_relevant_first" && relationDelta !== 0) {
			return relationDelta;
		}
		return left.evidence.rowNumber - right.evidence.rowNumber;
	});
}

function dedupeRisks(risks: RequirementRiskDetail[]): RequirementRiskDetail[] {
	const seen = new Set<string>();
	const result: RequirementRiskDetail[] = [];
	for (const risk of risks) {
		const key = `${risk.relatedRequirementId ?? risk.targetRequirementId}:${risk.riskType}:${risk.riskKey.evidenceRef}`;
		if (seen.has(key)) {
			continue;
		}
		seen.add(key);
		result.push(risk);
	}
	return result;
}

export function buildAllRiskDetails(
	targets: RequirementRecord[],
	records: RequirementRecord[],
	relationLeads: RelationLead[],
	params: AscetRequirementsParams,
): RequirementRiskDetail[] {
	const scope = params.scope ?? "target";
	const filteredLeads = filterLeads(relationLeads, params);
	const targetDetails =
		scope === "target" || scope === "all" ? targets.flatMap((target) => toRiskDetail(target, target, undefined)) : [];
	const relatedDetails =
		scope === "related" || scope === "all"
			? selectRelatedRecords(records, filteredLeads).flatMap(({ record, lead }) =>
					toRiskDetail(targets[0], record, lead),
				)
			: [];
	const risks = dedupeRisks([...targetDetails, ...relatedDetails]).filter((risk) =>
		params.riskTypes?.length ? params.riskTypes.includes(risk.riskType) : true,
	);
	return sortRisks(risks, params.priorityMode ?? "ascet_relevant_first");
}

export function paginateRiskDetails(risks: RequirementRiskDetail[], params: AscetRequirementsParams) {
	const page = paginate(risks, params);
	const detailCompletion: DetailCompletion = {
		targetDetailsComplete: true,
		relationDetailsComplete: !page.hasMore,
		allPagesRetrieved: !page.hasMore,
		evidenceComplete: page.items.every((risk) => Boolean(risk.evidence.value)),
		truncated: false,
	};
	return {
		...page,
		detailCompletion,
	};
}

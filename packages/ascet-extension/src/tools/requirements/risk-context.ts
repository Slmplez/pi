import { discoverRequirementsWorkbook } from "./discovery.ts";
import { AscetRequirementsError, readRequirementsWorkbook } from "./excel-reader.ts";
import { writeRequirementIndex } from "./index-store.ts";
import { normalizeRequirementRecords } from "./normalizer.ts";
import { expandRequirementRelations } from "./relations.ts";
import { buildAllRiskDetails, paginateRiskDetails } from "./risk-details.ts";
import { searchRequirementRecords } from "./search.ts";
import { computeRiskGateState } from "./state.ts";
import type {
	AscetRequirementsAction,
	AscetRequirementsParams,
	AscetRequirementsResult,
	ClarificationItem,
	DetailCompletion,
	RequirementCanonicalField,
	RequirementEvidence,
	RequirementRecord,
	RequirementRiskContext,
	RequirementRiskItem,
	RequirementSearchCandidate,
	RiskType,
} from "./types.ts";

export interface RunAscetRequirementsOptions {
	cwd: string;
}

function emptyContext(relationDepth: 0 | 1 | 2): RequirementRiskContext {
	const detailCompletion: DetailCompletion = {
		targetDetailsComplete: false,
		relationDetailsComplete: false,
		allPagesRetrieved: false,
		evidenceComplete: false,
		truncated: false,
	};
	const gate = computeRiskGateState({
		riskContextStage: "summary_only",
		evidenceStatus: "missing",
		readiness: "not_ready",
		detailCompletion,
		blockingClarificationCount: 0,
	});
	return {
		rowCount: 0,
		relationDepth,
		needsClarification: false,
		confidence: "low",
		riskContextStage: gate.riskContextStage,
		evidenceStatus: gate.evidenceStatus,
		readiness: gate.readiness,
		designGateReady: gate.designGateReady,
		design_gate_ready: gate.design_gate_ready,
		stateValid: gate.stateValid,
		stateErrors: gate.stateErrors,
		blockingReasons: gate.blockingReasons,
		blockingClarifications: [],
		nonBlockingClarifications: [],
		detailCompletion,
		targetFound: false,
		selfRiskCount: 0,
		relationLeadCount: 0,
		relatedRequirementCount: 0,
		riskDetailCount: 0,
		riskSummaryByType: {},
		riskSummaryByRequirement: [],
		targets: [],
		candidates: [],
		relationLeads: [],
		risks: [],
		selfRisks: [],
		relationRisks: [],
		potentialRisks: [],
		defectSignals: [],
		swimSignals: [],
		lessonsLearned: [],
		designImplications: [],
		suggestedQuestions: [],
		diagnostics: {},
	};
}

function errorResult(
	action: AscetRequirementsAction,
	error: AscetRequirementsError,
	relationDepth: 0 | 1 | 2,
): AscetRequirementsResult {
	return {
		ok: false,
		tool: "ascet_requirements",
		action,
		summary: error.message,
		data: emptyContext(relationDepth),
		error: {
			code: error.code,
			message: error.message,
			recoveryActions: error.recoveryActions,
		},
	};
}

function toRiskItem(
	field: RequirementCanonicalField,
	value: string,
	reason: string,
	evidence: RequirementEvidence | undefined,
): RequirementRiskItem | undefined {
	if (!evidence || value.trim().length === 0) {
		return undefined;
	}
	return { field, value, reason, evidence };
}

function collectSelfRisks(targets: RequirementSearchCandidate[]): RequirementRiskItem[] {
	const risks: RequirementRiskItem[] = [];
	for (const target of targets) {
		const record = target.record;
		const supplier = toRiskItem(
			"supplier_comments",
			record.supplierComments ?? "",
			"Historical supplier comment can indicate acceptance caveat, deviation, or implementation risk.",
			record.evidenceByField.supplier_comments,
		);
		if (supplier) risks.push(supplier);
		for (const defect of record.defects) {
			const item = toRiskItem(
				"defect",
				defect,
				"Requirement has Bosch defect evidence.",
				record.evidenceByField.defect,
			);
			if (item) risks.push(item);
		}
		for (const swim of record.swims) {
			const item = toRiskItem("swim", swim, "Requirement has COEM SWIM evidence.", record.evidenceByField.swim);
			if (item) risks.push(item);
		}
		for (const lesson of record.lessons) {
			const item = toRiskItem(
				"lesson_learned",
				lesson,
				"Requirement has lesson-learned evidence.",
				record.evidenceByField.lesson_learned,
			);
			if (item) risks.push(item);
		}
	}
	return risks;
}

function collectFieldRisks(
	targets: RequirementSearchCandidate[],
	field: "defect" | "swim" | "lesson_learned",
): RequirementRiskItem[] {
	const risks: RequirementRiskItem[] = [];
	for (const target of targets) {
		const record = target.record;
		const values = field === "defect" ? record.defects : field === "swim" ? record.swims : record.lessons;
		for (const value of values) {
			const item = toRiskItem(
				field,
				value,
				`Target requirement has ${field} evidence.`,
				record.evidenceByField[field],
			);
			if (item) risks.push(item);
		}
	}
	return risks;
}

function candidateSummary(candidate: RequirementSearchCandidate) {
	return {
		requirementId: candidate.record.requirementId,
		title: candidate.record.title,
		rowNumber: candidate.record.rowNumber,
		signals: candidate.record.signals,
		feature: candidate.record.feature,
		score: candidate.score,
		reasons: candidate.reasons,
	};
}

function isAmbiguous(candidates: RequirementSearchCandidate[], params: AscetRequirementsParams): boolean {
	if (params.requirementId || candidates.length <= 1) {
		return false;
	}
	const first = candidates[0];
	const second = candidates[1];
	if (!first || !second) {
		return false;
	}
	if (params.query?.trim() && params.query.trim().split(/\s+/).length === 1 && candidates.length > 1) {
		return true;
	}
	return first.score - second.score < 200;
}

function buildDesignImplications(context: {
	selfRisks: RequirementRiskItem[];
	relationLeads: RequirementRiskContext["relationLeads"];
}): string[] {
	const implications: string[] = [];
	if (context.selfRisks.some((risk) => risk.field === "supplier_comments")) {
		implications.push("Review Supplier Comments before selecting ASCET implementation details.");
	}
	if (
		context.selfRisks.some((risk) => risk.field === "defect") ||
		context.relationLeads.some((lead) => lead.relationType === "same_defect")
	) {
		implications.push("Check defect-linked behavior before reusing existing signal or quality logic.");
	}
	if (context.relationLeads.some((lead) => lead.relationType === "same_reused_signal")) {
		implications.push("Validate reused-signal producer and quality propagation before design changes.");
	}
	if (context.relationLeads.some((lead) => lead.confidence !== "high")) {
		implications.push("Treat inferred relation risks as search leads and confirm them with direct ASCET evidence.");
	}
	return implications;
}

async function loadRecords(params: AscetRequirementsParams, options: RunAscetRequirementsOptions) {
	const sourceFile =
		params.sourceFile ?? (params.workspaceSearch === false ? undefined : discoverRequirementsWorkbook(options.cwd));
	if (!sourceFile) {
		throw new AscetRequirementsError("REQUIREMENTS_EXCEL_NOT_FOUND", "No requirements Excel source was provided.", [
			"Pass sourceFile.",
			"Enable workspaceSearch or place a .xlsx requirements workbook in the workspace.",
		]);
	}
	const worksheet = await readRequirementsWorkbook(sourceFile);
	const records = normalizeRequirementRecords(worksheet);
	writeRequirementIndex(options.cwd, worksheet, records);
	return {
		worksheet,
		records,
	};
}

function selectTargets(candidates: RequirementSearchCandidate[], ambiguous: boolean): RequirementSearchCandidate[] {
	if (ambiguous) {
		return candidates.slice(0, 1);
	}
	return candidates.slice(0, 1);
}

function makeContext(
	params: AscetRequirementsParams,
	worksheet: Awaited<ReturnType<typeof loadRecords>>["worksheet"],
	records: RequirementRecord[],
	candidates: RequirementSearchCandidate[],
): RequirementRiskContext {
	const relationDepth = params.relationDepth ?? 1;
	const limit = params.limit ?? 10;
	const ambiguous = isAmbiguous(candidates, params);
	const targets = selectTargets(candidates, ambiguous);
	const targetRecords = targets.map((target) => target.record);
	const relationLeads = expandRequirementRelations(targets, records, relationDepth, 50);
	const selfRisks = collectSelfRisks(targets);
	const allRisks = buildAllRiskDetails(targetRecords, records, relationLeads, { ...params, scope: "all", limit: 50 });
	const riskSummaryByType = summarizeRisksByType(allRisks);
	const riskSummaryByRequirement = summarizeRisksByRequirement(allRisks);
	const blockingClarifications = buildBlockingClarifications(ambiguous, candidates);
	const detailCompletion: DetailCompletion = {
		targetDetailsComplete: false,
		relationDetailsComplete: false,
		allPagesRetrieved: false,
		evidenceComplete: allRisks.length > 0,
		truncated: false,
	};
	const gate = computeRiskGateState({
		riskContextStage: "summary_only",
		evidenceStatus: allRisks.length > 0 ? "partial" : "missing",
		readiness: blockingClarifications.length > 0 ? "needs_clarification" : "not_ready",
		detailCompletion,
		blockingClarificationCount: blockingClarifications.length,
		force: params.debugForceGateState,
	});
	const context = {
		sourceFile: worksheet.sourceFile,
		sheetName: worksheet.sheetName,
		rowCount: worksheet.rowCount,
		relationDepth,
		needsClarification: blockingClarifications.length > 0,
		confidence: !candidates[0] ? "low" : ambiguous ? "medium" : "high",
		riskContextStage: gate.riskContextStage,
		evidenceStatus: gate.evidenceStatus,
		readiness: gate.readiness,
		designGateReady: gate.designGateReady,
		design_gate_ready: gate.design_gate_ready,
		stateValid: gate.stateValid,
		stateErrors: gate.stateErrors,
		blockingReasons: gate.blockingReasons,
		blockingClarifications,
		nonBlockingClarifications: [],
		detailCompletion,
		nextAction: targets[0]?.record.requirementId
			? {
					tool: "ascet_requirements",
					action: "risk_details",
					requirementId: targets[0].record.requirementId,
					offset: 0,
					limit,
					priorityMode: "ascet_relevant_first",
				}
			: undefined,
		targetFound: targets.length > 0,
		selfRiskCount: targetRecords.reduce((count, record) => count + record.riskCells.length, 0),
		relationLeadCount: relationLeads.length,
		relatedRequirementCount: new Set(relationLeads.map((lead) => lead.relatedRequirementId).filter(Boolean)).size,
		riskDetailCount: allRisks.length,
		riskSummaryByType,
		riskSummaryByRequirement,
		targets: targets.map(candidateSummary),
		candidates: candidates.map(candidateSummary),
		relationLeads: [],
		risks: [],
		selfRisks,
		relationRisks: [],
		potentialRisks: [],
		defectSignals: collectFieldRisks(targets, "defect"),
		swimSignals: collectFieldRisks(targets, "swim"),
		lessonsLearned: collectFieldRisks(targets, "lesson_learned"),
		designImplications: buildDesignImplications({ selfRisks, relationLeads }),
		suggestedQuestions: blockingClarifications.map((item) => item.question),
		diagnostics: {
			totalCandidates: candidates.length,
			searchLimit: limit,
		},
	} satisfies RequirementRiskContext;
	return context;
}

function summarizeRisksByType(risks: Array<{ riskType: RiskType }>): Partial<Record<RiskType, number>> {
	const summary: Partial<Record<RiskType, number>> = {};
	for (const risk of risks) {
		summary[risk.riskType] = (summary[risk.riskType] ?? 0) + 1;
	}
	return summary;
}

function summarizeRisksByRequirement(
	risks: Array<{
		relatedRequirementId?: string;
		targetRequirementId?: string;
		relatedRequirementTitle?: string;
		riskType: RiskType;
	}>,
): RequirementRiskContext["riskSummaryByRequirement"] {
	const byRequirement = new Map<string, { title?: string; riskCount: number; riskTypes: Set<RiskType> }>();
	for (const risk of risks) {
		const requirementId = risk.relatedRequirementId ?? risk.targetRequirementId ?? "<unknown>";
		const current = byRequirement.get(requirementId) ?? {
			title: risk.relatedRequirementTitle,
			riskCount: 0,
			riskTypes: new Set<RiskType>(),
		};
		current.riskCount += 1;
		current.riskTypes.add(risk.riskType);
		byRequirement.set(requirementId, current);
	}
	return Array.from(byRequirement.entries()).map(([requirementId, value]) => ({
		requirementId,
		title: value.title,
		riskCount: value.riskCount,
		topRiskTypes: Array.from(value.riskTypes),
	}));
}

function buildBlockingClarifications(
	ambiguous: boolean,
	candidates: RequirementSearchCandidate[],
): ClarificationItem[] {
	if (!ambiguous) {
		return [];
	}
	return [
		{
			id: "target_requirement_confirm",
			question: "Which requirement should drive the ASCET design? Choose one candidate by requirement ID or signal.",
			reason: `Search returned ${candidates.length} close requirement candidates.`,
			requiredBeforeAscetDesign: true,
		},
	];
}

function makeRiskDetailsContext(
	base: RequirementRiskContext,
	records: RequirementRecord[],
	targets: RequirementSearchCandidate[],
	params: AscetRequirementsParams,
): RequirementRiskContext {
	const targetRecords = targets.map((target) => target.record);
	const relationLeads = expandRequirementRelations(targets, records, params.relationDepth ?? 1, 50);
	const allRisks = buildAllRiskDetails(targetRecords, records, relationLeads, params);
	const page = paginateRiskDetails(allRisks, params);
	const evidenceStatus = page.detailCompletion.evidenceComplete ? "complete" : "partial";
	const gate = computeRiskGateState({
		riskContextStage: page.hasMore ? "detail_partial" : "detail_complete",
		evidenceStatus,
		readiness: page.hasMore ? "not_ready" : "ready",
		detailCompletion: page.detailCompletion,
		blockingClarificationCount: base.blockingClarifications.length,
	});
	return {
		...base,
		riskContextStage: gate.riskContextStage,
		evidenceStatus: gate.evidenceStatus,
		readiness: gate.readiness,
		designGateReady: gate.designGateReady,
		design_gate_ready: gate.design_gate_ready,
		stateValid: gate.stateValid,
		stateErrors: gate.stateErrors,
		blockingReasons: gate.blockingReasons,
		detailCompletion: page.detailCompletion,
		relationLeads: params.scope === "target" ? [] : relationLeads,
		risks: page.items,
		totalCount: page.totalCount,
		returnedCount: page.returnedCount,
		offset: page.offset,
		limit: page.limit,
		hasMore: page.hasMore,
		nextOffset: page.nextOffset,
		riskDetailCount: allRisks.length,
		nextAction: page.hasMore
			? {
					tool: "ascet_requirements",
					action: "risk_details",
					requirementId: targetRecords[0]?.requirementId,
					offset: page.nextOffset,
					limit: page.limit,
					priorityMode: params.priorityMode ?? "ascet_relevant_first",
				}
			: undefined,
	};
}

export async function runAscetRequirements(
	params: AscetRequirementsParams,
	options: RunAscetRequirementsOptions,
): Promise<AscetRequirementsResult> {
	const relationDepth = params.relationDepth ?? 1;
	const limit = params.limit ?? 10;
	try {
		if (params.action === "status" && !params.sourceFile && params.workspaceSearch === false) {
			return {
				ok: true,
				tool: "ascet_requirements",
				action: params.action,
				summary: "ASCET requirements tool is available; no workbook selected.",
				data: emptyContext(relationDepth),
			};
		}

		const { worksheet, records } = await loadRecords(params, options);
		if (params.action === "status" || params.action === "index") {
			const data = emptyContext(relationDepth);
			data.sourceFile = worksheet.sourceFile;
			data.sheetName = worksheet.sheetName;
			data.rowCount = worksheet.rowCount;
			data.diagnostics = { headers: worksheet.headers.map((header) => header.name) };
			return {
				ok: true,
				tool: "ascet_requirements",
				action: params.action,
				summary: `Indexed ${worksheet.rowCount} requirement rows from ${worksheet.sheetName}.`,
				data,
			};
		}

		const candidates =
			params.action === "get_record" && params.requirementId
				? records
						.filter((record) => record.requirementId === params.requirementId)
						.map((record) => ({
							record,
							score: 1000,
							reasons: [`Exact requirement ID match: ${params.requirementId}`],
							evidence: record.evidenceByField.requirement_id ? [record.evidenceByField.requirement_id] : [],
						}))
				: searchRequirementRecords(records, params, limit);
		let data = makeContext(params, worksheet, records, candidates);
		if (params.action === "relation_leads") {
			data = {
				...data,
				relationLeads: expandRequirementRelations(
					candidates.slice(0, 1),
					records,
					params.relationDepth ?? 1,
					limit,
				),
			};
		}
		if (params.action === "risk_details") {
			data = makeRiskDetailsContext(data, records, candidates.slice(0, 1), params);
		}
		return {
			ok: true,
			tool: "ascet_requirements",
			action: params.action,
			summary: summarizeResult(data, params.action),
			data,
		};
	} catch (error) {
		if (error instanceof AscetRequirementsError) {
			return errorResult(params.action, error, relationDepth);
		}
		const message = error instanceof Error ? error.message : String(error);
		return errorResult(
			params.action,
			new AscetRequirementsError("REQUIREMENTS_TOOL_FAILED", message, ["Check the workbook path and schema."]),
			relationDepth,
		);
	}
}

function summarizeResult(data: RequirementRiskContext, action: AscetRequirementsAction): string {
	if (action === "risk_details") {
		return `${data.returnedCount ?? 0}/${data.totalCount ?? 0} risk detail(s), design_gate_ready=${data.design_gate_ready}.`;
	}
	if (action === "relation_leads") {
		return `${data.relationLeads.length} relation lead(s), ${data.relatedRequirementCount} related requirement(s).`;
	}
	return `${data.targets.length} target requirement(s), ${data.relationLeadCount} relation lead(s), design_gate_ready=${data.design_gate_ready}.`;
}

export function formatAscetRequirementsResult(result: AscetRequirementsResult): string {
	if (!result.ok) {
		return result.summary;
	}
	const lines = [result.summary];
	if (!result.data.designGateReady) {
		lines.push("Current result cannot enter /ascet-design.");
		if (result.data.blockingReasons.length > 0) {
			lines.push(`Blocking reasons: ${result.data.blockingReasons.join(", ")}`);
		}
		if (result.data.nextAction) {
			lines.push(
				`Next action: ascet_requirements(action="${result.data.nextAction.action}", requirementId="${result.data.nextAction.requirementId ?? ""}", offset=${result.data.nextAction.offset ?? 0}, limit=${result.data.nextAction.limit ?? 10})`,
			);
		}
	}
	for (const target of result.data.targets) {
		lines.push(`- target ${target.requirementId ?? "<unknown>"} ${target.title ?? ""}`.trim());
	}
	if (result.data.needsClarification) {
		lines.push("Clarification needed before ASCET design.");
	}
	return lines.join("\n");
}

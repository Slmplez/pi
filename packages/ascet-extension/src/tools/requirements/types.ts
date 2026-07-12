export type AscetRequirementsAction =
	| "status"
	| "index"
	| "search"
	| "get_record"
	| "relation_leads"
	| "risk_context"
	| "risk_details";

export type RiskContextStage = "summary_only" | "detail_partial" | "detail_complete";
export type EvidenceStatus = "missing" | "partial" | "complete";
export type Readiness = "not_ready" | "needs_clarification" | "ready";
export type BlockingReason =
	| "summary_only"
	| "detail_partial"
	| "evidence_missing"
	| "evidence_partial"
	| "pagination_incomplete"
	| "truncated_output"
	| "blocking_clarification"
	| "relation_leads_not_expanded";

export type RiskType =
	| "supplier_comments"
	| "bosch_defect"
	| "coem_swim"
	| "lesson_learned"
	| "deviation"
	| "accepted_exception";

export type RelationType =
	| "same_signal"
	| "same_reused_signal"
	| "same_feature"
	| "same_ccp"
	| "requirement_cross_reference"
	| "same_defect"
	| "same_swim"
	| "signal_family"
	| "wheel_position_family"
	| "risk_keyword";

export type RequirementScope = "target" | "related" | "all";
export type RiskPriorityMode = "ascet_relevant_first" | "risk_severity_first" | "source_order";

export type RequirementCanonicalField =
	| "title"
	| "requirement_id"
	| "description"
	| "supplier_comments"
	| "rb_top_fnid"
	| "feature"
	| "ccp"
	| "signal_group"
	| "signal"
	| "reused_signal"
	| "defect"
	| "swim"
	| "lesson_learned";

export type RequirementEvidenceKind = "direct" | "inferred";

export interface AscetRequirementsParams {
	action: AscetRequirementsAction;
	query?: string;
	requirementId?: string;
	relatedRequirementId?: string;
	leadId?: string;
	signal?: string;
	sourceFile?: string;
	workspaceSearch?: boolean;
	relationDepth?: 0 | 1 | 2;
	relationTypes?: RelationType[];
	riskTypes?: RiskType[];
	scope?: RequirementScope;
	priorityMode?: RiskPriorityMode;
	offset?: number;
	limit?: number;
	format?: "concise" | "detailed" | "json";
	includeRelationEvidence?: boolean;
	includeRiskEvidence?: boolean;
	includeAscetImpact?: boolean;
	debugForceGateState?: Partial<RiskGateState>;
}

export interface RequirementEvidence {
	sourceFile: string;
	sheetName: string;
	rowNumber: number;
	column: string;
	columnHeader?: string;
	columnLetter?: string;
	cellAddress: string;
	value: string;
	reason: string;
	evidenceKind: RequirementEvidenceKind;
}

export interface ReusedSignalReference {
	signal?: string;
	requirementIds: string[];
	raw: string;
}

export interface RequirementRecord {
	sourceFile: string;
	sheetName: string;
	rowNumber: number;
	requirementId?: string;
	title?: string;
	description?: string;
	supplierComments?: string;
	rbTopFnid?: string;
	feature?: string;
	ccps: string[];
	signalGroups: string[];
	signals: string[];
	reusedSignals: ReusedSignalReference[];
	defects: string[];
	swims: string[];
	lessons: string[];
	deviations: string[];
	acceptedExceptions: string[];
	riskCells: RequirementRiskCell[];
	rawCells: Partial<Record<RequirementCanonicalField, string>>;
	evidenceByField: Partial<Record<RequirementCanonicalField, RequirementEvidence>>;
}

export interface RequirementSearchCandidate {
	record: RequirementRecord;
	score: number;
	reasons: string[];
	evidence: RequirementEvidence[];
}

export interface RequirementRiskItem {
	field: RequirementCanonicalField;
	value: string;
	reason: string;
	evidence: RequirementEvidence;
}

export interface RequirementRiskCell {
	riskType: RiskType;
	field: RequirementCanonicalField;
	contentRaw: string;
	identifiers: string[];
	evidence: RequirementEvidence;
}

export interface RelationLead {
	leadId: string;
	targetRequirementId?: string;
	relatedRequirementId?: string;
	relatedRequirementTitle?: string;
	relationType: RelationType;
	relationEvidence: {
		value: string;
		targetCell?: string;
		relatedCell?: string;
		sourceField?: string;
	};
	confidence: "high" | "medium" | "low";
}

export interface RequirementRiskDetail {
	riskId: string;
	riskKey: {
		targetRequirementId?: string;
		relatedRequirementId?: string;
		riskType: RiskType;
		evidenceRef: string;
	};
	sourceLeadId?: string;
	targetRequirementId?: string;
	relatedRequirementId?: string;
	relatedRequirementTitle?: string;
	relationType?: RelationType;
	riskType: RiskType;
	riskContentRaw: string;
	riskIdentifiers: string[];
	riskSummary?: string;
	evidence: RequirementEvidence;
	ascetImpactHint?: string;
	impactBasis: "direct_evidence" | "relation_inference" | "engineering_inference";
	impactConfidence: "high" | "medium" | "low";
	confidence: "high" | "medium" | "low";
}

export interface DetailCompletion {
	targetDetailsComplete: boolean;
	relationDetailsComplete: boolean;
	allPagesRetrieved: boolean;
	evidenceComplete: boolean;
	truncated: boolean;
}

export interface ClarificationItem {
	id: string;
	question: string;
	reason: string;
	requiredBeforeAscetDesign: boolean;
}

export interface RiskGateState {
	riskContextStage: RiskContextStage;
	evidenceStatus: EvidenceStatus;
	readiness: Readiness;
	designGateReady: boolean;
	design_gate_ready: boolean;
	stateValid: boolean;
	stateErrors: string[];
	blockingReasons: BlockingReason[];
}

export interface NextRequirementsAction {
	tool: "ascet_requirements";
	action: "relation_leads" | "risk_details";
	requirementId?: string;
	offset?: number;
	limit?: number;
	priorityMode?: RiskPriorityMode;
}

export interface RequirementRiskContext {
	sourceFile?: string;
	sheetName?: string;
	rowCount: number;
	relationDepth: 0 | 1 | 2;
	needsClarification: boolean;
	confidence: "high" | "medium" | "low";
	riskContextStage: RiskContextStage;
	evidenceStatus: EvidenceStatus;
	readiness: Readiness;
	designGateReady: boolean;
	design_gate_ready: boolean;
	stateValid: boolean;
	stateErrors: string[];
	blockingReasons: BlockingReason[];
	blockingClarifications: ClarificationItem[];
	nonBlockingClarifications: ClarificationItem[];
	detailCompletion: DetailCompletion;
	nextAction?: NextRequirementsAction;
	targetFound: boolean;
	selfRiskCount: number;
	relationLeadCount: number;
	relatedRequirementCount: number;
	riskDetailCount: number;
	riskSummaryByType: Partial<Record<RiskType, number>>;
	riskSummaryByRequirement: Array<{
		requirementId?: string;
		title?: string;
		riskCount: number;
		topRiskTypes: RiskType[];
	}>;
	targets: Array<{
		requirementId?: string;
		title?: string;
		rowNumber: number;
		signals: string[];
		feature?: string;
		score: number;
		reasons: string[];
	}>;
	candidates: Array<{
		requirementId?: string;
		title?: string;
		rowNumber: number;
		signals: string[];
		feature?: string;
		score: number;
		reasons: string[];
	}>;
	relationLeads: RelationLead[];
	risks: RequirementRiskDetail[];
	totalCount?: number;
	returnedCount?: number;
	offset?: number;
	limit?: number;
	hasMore?: boolean;
	nextOffset?: number;
	selfRisks: RequirementRiskItem[];
	relationRisks: RequirementRiskItem[];
	potentialRisks: RequirementRiskItem[];
	defectSignals: RequirementRiskItem[];
	swimSignals: RequirementRiskItem[];
	lessonsLearned: RequirementRiskItem[];
	designImplications: string[];
	suggestedQuestions: string[];
	diagnostics: Record<string, unknown>;
}

export interface AscetRequirementsResult {
	ok: boolean;
	tool: "ascet_requirements";
	action: AscetRequirementsAction;
	summary: string;
	data: RequirementRiskContext;
	error?: {
		code: string;
		message: string;
		recoveryActions?: string[];
	};
}

export interface RequirementWorksheetRow {
	rowNumber: number;
	cells: Array<{
		header: string;
		columnNumber: number;
		address: string;
		value: string;
	}>;
}

export interface RequirementWorksheetData {
	sourceFile: string;
	sheetName: string;
	headers: Array<{ name: string; columnNumber: number }>;
	rows: RequirementWorksheetRow[];
	rowCount: number;
}

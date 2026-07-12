export type AscetRequirementsAction = "status" | "index" | "search" | "risk_context" | "get_record";

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
	signal?: string;
	sourceFile?: string;
	workspaceSearch?: boolean;
	relationDepth?: 0 | 1 | 2;
	limit?: number;
	format?: "concise" | "detailed" | "json";
}

export interface RequirementEvidence {
	sourceFile: string;
	sheetName: string;
	rowNumber: number;
	column: string;
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

export interface RequirementRelationRiskItem extends RequirementRiskItem {
	relatedRequirementId?: string;
	relatedTitle?: string;
	relationType:
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
}

export interface RequirementRiskContext {
	sourceFile?: string;
	sheetName?: string;
	rowCount: number;
	relationDepth: 0 | 1 | 2;
	needsClarification: boolean;
	confidence: "high" | "medium" | "low";
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
	selfRisks: RequirementRiskItem[];
	relationRisks: RequirementRelationRiskItem[];
	potentialRisks: RequirementRelationRiskItem[];
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

import { discoverRequirementsWorkbook } from "./discovery.ts";
import { AscetRequirementsError, readRequirementsWorkbook } from "./excel-reader.ts";
import { writeRequirementIndex } from "./index-store.ts";
import { normalizeRequirementRecords } from "./normalizer.ts";
import { expandRequirementRelations } from "./relations.ts";
import { searchRequirementRecords } from "./search.ts";
import type {
	AscetRequirementsAction,
	AscetRequirementsParams,
	AscetRequirementsResult,
	RequirementCanonicalField,
	RequirementEvidence,
	RequirementRecord,
	RequirementRiskContext,
	RequirementRiskItem,
	RequirementSearchCandidate,
} from "./types.ts";

export interface RunAscetRequirementsOptions {
	cwd: string;
}

function emptyContext(relationDepth: 0 | 1 | 2): RequirementRiskContext {
	return {
		rowCount: 0,
		relationDepth,
		needsClarification: false,
		confidence: "low",
		targets: [],
		candidates: [],
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
	return first.score - second.score < 200;
}

function buildDesignImplications(context: {
	selfRisks: RequirementRiskItem[];
	relationRisks: RequirementRiskContext["relationRisks"];
}): string[] {
	const implications: string[] = [];
	if (context.selfRisks.some((risk) => risk.field === "supplier_comments")) {
		implications.push("Review Supplier Comments before selecting ASCET implementation details.");
	}
	if (
		context.selfRisks.some((risk) => risk.field === "defect") ||
		context.relationRisks.some((risk) => risk.field === "defect")
	) {
		implications.push("Check defect-linked behavior before reusing existing signal or quality logic.");
	}
	if (context.relationRisks.some((risk) => risk.relationType === "same_reused_signal")) {
		implications.push("Validate reused-signal producer and quality propagation before design changes.");
	}
	if (context.relationRisks.some((risk) => risk.evidence.evidenceKind === "inferred")) {
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
	const relationRisks = expandRequirementRelations(targets, records, relationDepth, limit);
	const selfRisks = collectSelfRisks(targets);
	const context = {
		sourceFile: worksheet.sourceFile,
		sheetName: worksheet.sheetName,
		rowCount: worksheet.rowCount,
		relationDepth,
		needsClarification: ambiguous,
		confidence: !candidates[0] ? "low" : ambiguous ? "medium" : "high",
		targets: targets.map(candidateSummary),
		candidates: candidates.map(candidateSummary),
		selfRisks,
		relationRisks,
		potentialRisks: relationRisks.filter((risk) => risk.evidence.evidenceKind === "inferred"),
		defectSignals: collectFieldRisks(targets, "defect"),
		swimSignals: collectFieldRisks(targets, "swim"),
		lessonsLearned: collectFieldRisks(targets, "lesson_learned"),
		designImplications: buildDesignImplications({ selfRisks, relationRisks }),
		suggestedQuestions: ambiguous
			? ["Which requirement should drive the ASCET design? Choose one candidate by requirement ID or signal."]
			: [],
		diagnostics: {
			totalCandidates: candidates.length,
			searchLimit: limit,
		},
	} satisfies RequirementRiskContext;
	return context;
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
		const data = makeContext(params, worksheet, records, candidates);
		return {
			ok: true,
			tool: "ascet_requirements",
			action: params.action,
			summary: `${data.targets.length} target requirement(s), ${data.relationRisks.length} relation risk(s).`,
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

export function formatAscetRequirementsResult(result: AscetRequirementsResult): string {
	if (!result.ok) {
		return result.summary;
	}
	const lines = [result.summary];
	for (const target of result.data.targets) {
		lines.push(`- target ${target.requirementId ?? "<unknown>"} ${target.title ?? ""}`.trim());
	}
	if (result.data.needsClarification) {
		lines.push("Clarification needed before ASCET design.");
	}
	return lines.join("\n");
}

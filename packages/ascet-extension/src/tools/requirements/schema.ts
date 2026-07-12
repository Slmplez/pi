import { Type } from "typebox";
import type { AscetRequirementsParams } from "./types.ts";

export type { AscetRequirementsParams };

export const ascetRequirementsParameters = Type.Object({
	action: Type.Union([
		Type.Literal("status"),
		Type.Literal("index"),
		Type.Literal("search"),
		Type.Literal("get_record"),
		Type.Literal("relation_leads"),
		Type.Literal("risk_context"),
		Type.Literal("risk_details"),
	]),
	query: Type.Optional(Type.String({ minLength: 1 })),
	requirementId: Type.Optional(Type.String({ minLength: 1 })),
	relatedRequirementId: Type.Optional(Type.String({ minLength: 1 })),
	leadId: Type.Optional(Type.String({ minLength: 1 })),
	signal: Type.Optional(Type.String({ minLength: 1 })),
	sourceFile: Type.Optional(Type.String({ minLength: 1 })),
	workspaceSearch: Type.Optional(Type.Boolean()),
	relationDepth: Type.Optional(Type.Union([Type.Literal(0), Type.Literal(1), Type.Literal(2)])),
	relationTypes: Type.Optional(
		Type.Array(
			Type.Union([
				Type.Literal("same_signal"),
				Type.Literal("same_reused_signal"),
				Type.Literal("same_feature"),
				Type.Literal("same_ccp"),
				Type.Literal("requirement_cross_reference"),
				Type.Literal("same_defect"),
				Type.Literal("same_swim"),
				Type.Literal("signal_family"),
				Type.Literal("wheel_position_family"),
				Type.Literal("risk_keyword"),
			]),
		),
	),
	riskTypes: Type.Optional(
		Type.Array(
			Type.Union([
				Type.Literal("supplier_comments"),
				Type.Literal("bosch_defect"),
				Type.Literal("coem_swim"),
				Type.Literal("lesson_learned"),
				Type.Literal("deviation"),
				Type.Literal("accepted_exception"),
			]),
		),
	),
	scope: Type.Optional(Type.Union([Type.Literal("target"), Type.Literal("related"), Type.Literal("all")])),
	priorityMode: Type.Optional(
		Type.Union([
			Type.Literal("ascet_relevant_first"),
			Type.Literal("risk_severity_first"),
			Type.Literal("source_order"),
		]),
	),
	offset: Type.Optional(Type.Number({ minimum: 0 })),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
	format: Type.Optional(Type.Union([Type.Literal("concise"), Type.Literal("detailed"), Type.Literal("json")])),
	includeRelationEvidence: Type.Optional(Type.Boolean()),
	includeRiskEvidence: Type.Optional(Type.Boolean()),
	includeAscetImpact: Type.Optional(Type.Boolean()),
	debugForceGateState: Type.Optional(Type.Any()),
});

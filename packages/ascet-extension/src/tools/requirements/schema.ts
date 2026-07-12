import { Type } from "typebox";
import type { AscetRequirementsParams } from "./types.ts";

export type { AscetRequirementsParams };

export const ascetRequirementsParameters = Type.Object({
	action: Type.Union([
		Type.Literal("status"),
		Type.Literal("index"),
		Type.Literal("search"),
		Type.Literal("risk_context"),
		Type.Literal("get_record"),
	]),
	query: Type.Optional(Type.String({ minLength: 1 })),
	requirementId: Type.Optional(Type.String({ minLength: 1 })),
	signal: Type.Optional(Type.String({ minLength: 1 })),
	sourceFile: Type.Optional(Type.String({ minLength: 1 })),
	workspaceSearch: Type.Optional(Type.Boolean()),
	relationDepth: Type.Optional(Type.Union([Type.Literal(0), Type.Literal(1), Type.Literal(2)])),
	limit: Type.Optional(Type.Number({ minimum: 1, maximum: 50 })),
	format: Type.Optional(Type.Union([Type.Literal("concise"), Type.Literal("detailed"), Type.Literal("json")])),
});

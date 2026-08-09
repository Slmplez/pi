import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import {
	type AscetObservationCoverage,
	type AscetObservationDelivery,
	type AscetObservationResult,
	AscetObservationStore,
} from "./observation-store.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";
import { openAiObjectUnionSchema } from "./tools/_shared/openai-schema.ts";

export type AscetGetAction =
	| "tree"
	| "elements"
	| "formulas"
	| "component_refs"
	| "bde_edges"
	| "import_binding"
	| "dbitem_refs";

export type AscetGetTarget =
	| { oid: string; path?: string; targetPathPrefix?: string }
	| { oid?: string; path: string; targetPathPrefix?: string }
	| { oid?: string; path?: string; targetPathPrefix: string };

export type AscetGetIdentityTarget = { oid: string; path?: string } | { oid?: string; path: string };
export type AscetGetProvider = { oid: string; path?: string } | { oid?: string; path: string };

export interface AscetGetFilters {
	name?: string;
	scope?: Array<"local" | "imported" | "exported">;
}

export interface AscetGetTraversal {
	depth?: number;
	maxFolders?: number;
	maxComponents?: number;
}

interface AscetGetBaseParams {
	target?: AscetGetTarget;
	filters?: AscetGetFilters;
	traversal?: AscetGetTraversal;
	delivery?: AscetObservationDelivery;
}

type AscetTargetedGetParams = AscetGetBaseParams & { target: AscetGetTarget };

export type AscetGetParams =
	| (AscetGetBaseParams & { action: "tree" })
	| (AscetTargetedGetParams & { action: "elements"; elementName?: string })
	| (AscetTargetedGetParams & { action: "formulas"; formulaName?: string })
	| (AscetTargetedGetParams & { action: "component_refs" })
	| (AscetTargetedGetParams & { action: "bde_edges"; diagramName?: string })
	| (AscetTargetedGetParams & {
			action: "import_binding";
			elementName: string;
			provider: AscetGetProvider;
	  })
	| (AscetGetBaseParams & { action: "dbitem_refs"; target: AscetGetIdentityTarget });
export interface RunAscetGetOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

const identityTargetSchema = Type.Union([
	Type.Object(
		{
			oid: Type.String({ minLength: 1 }),
			path: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			oid: Type.Optional(Type.String({ minLength: 1 })),
			path: Type.String({ minLength: 1 }),
		},
		{ additionalProperties: false },
	),
]);
const targetSchema = Type.Union([
	Type.Object(
		{
			oid: Type.String({ minLength: 1 }),
			path: Type.Optional(Type.String({ minLength: 1 })),
			targetPathPrefix: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			oid: Type.Optional(Type.String({ minLength: 1 })),
			path: Type.String({ minLength: 1 }),
			targetPathPrefix: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			oid: Type.Optional(Type.String({ minLength: 1 })),
			path: Type.Optional(Type.String({ minLength: 1 })),
			targetPathPrefix: Type.String({ minLength: 1 }),
		},
		{ additionalProperties: false },
	),
]);
const providerSchema = identityTargetSchema;
const filtersSchema = Type.Object(
	{
		name: Type.Optional(Type.String({ minLength: 1 })),
		scope: Type.Optional(
			Type.Array(Type.Union([Type.Literal("local"), Type.Literal("imported"), Type.Literal("exported")])),
		),
	},
	{ additionalProperties: false },
);
const traversalSchema = Type.Object(
	{
		depth: Type.Optional(Type.Number({ minimum: 0 })),
		maxFolders: Type.Optional(Type.Number({ minimum: 1 })),
		maxComponents: Type.Optional(Type.Number({ minimum: 1 })),
	},
	{ additionalProperties: false },
);
const deliverySchema = Type.Optional(
	Type.Union([Type.Literal("auto"), Type.Literal("inline"), Type.Literal("stored")]),
);
const commonProperties = {
	filters: Type.Optional(filtersSchema),
	traversal: Type.Optional(traversalSchema),
	delivery: deliverySchema,
};
const targetedProperties = {
	target: targetSchema,
	...commonProperties,
};

export const ascetGetParameters = openAiObjectUnionSchema<AscetGetParams>([
	Type.Object(
		{ action: Type.Literal("tree"), target: Type.Optional(targetSchema), ...commonProperties },
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("elements"),
			...targetedProperties,
			elementName: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("formulas"),
			...targetedProperties,
			formulaName: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object({ action: Type.Literal("component_refs"), ...targetedProperties }, { additionalProperties: false }),
	Type.Object(
		{
			action: Type.Literal("bde_edges"),
			...targetedProperties,
			diagramName: Type.Optional(Type.String({ minLength: 1 })),
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("import_binding"),
			...targetedProperties,
			elementName: Type.String({ minLength: 1 }),
			provider: providerSchema,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			action: Type.Literal("dbitem_refs"),
			...commonProperties,
			target: identityTargetSchema,
		},
		{ additionalProperties: false },
	),
]);
function operationForAction(action: AscetGetAction): string {
	return `get_${action}`;
}

function buildPayload(params: AscetGetParams): Record<string, unknown> {
	const target = params.target ?? {};
	const filters = params.filters ?? {};
	const traversal = params.traversal ?? {};
	const payload: Record<string, unknown> = {
		oid: target.oid,
		path: target.path,
		targetPathPrefix: target.targetPathPrefix,
		name: filters.name,
		scopes: filters.scope,
		depth: traversal.depth,
		maxFolders: traversal.maxFolders,
		maxComponents: traversal.maxComponents,
	};

	switch (params.action) {
		case "elements":
			payload.elementName = params.elementName;
			break;
		case "formulas":
			payload.formulaName = params.formulaName;
			break;
		case "bde_edges":
			payload.diagramName = params.diagramName;
			break;
		case "import_binding":
			payload.elementName = params.elementName;
			payload.providerOid = params.provider.oid;
			payload.providerPath = params.provider.path;
			break;
	}

	return Object.fromEntries(Object.entries(payload).filter(([, value]) => value !== undefined));
}

export function buildAscetGetArgs(params: AscetGetParams): string[] {
	return ["exec", operationForAction(params.action), "--request-json", JSON.stringify(buildPayload(params)), "--json"];
}

export async function runAscetGet(params: AscetGetParams, options: RunAscetGetOptions): Promise<AscetCliJsonResult> {
	const defaultTimeoutMs = params.action === "elements" || params.action === "component_refs" ? 180_000 : 120_000;
	return runAscetCliJson(buildAscetGetArgs(params), {
		cwd: options.cwd,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs ?? defaultTimeoutMs,
		executeCli: options.executeCli,
		toolName: "ascet_get",
		commandId: operationForAction(params.action),
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
}

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function getGetPayload(data: unknown): JsonRecord | undefined {
	const unwrapped = unwrapToolSuccessPayload(data);
	return isRecord(unwrapped) ? unwrapped : undefined;
}

function getItems(payload: JsonRecord): unknown[] {
	return Array.isArray(payload.items) ? payload.items : [];
}

function getCoverage(payload: JsonRecord): AscetObservationCoverage {
	const coverage = payload.coverage;
	if (isRecord(coverage) && typeof coverage.status === "string") {
		return coverage as AscetObservationCoverage;
	}
	return { status: "complete_for_scope" };
}

function getSource(payload: JsonRecord): string {
	return typeof payload.source === "string" && payload.source.length > 0 ? payload.source : "live";
}

function getTruncated(payload: JsonRecord): boolean {
	return payload.truncated === true;
}

function createToolOutput(params: AscetGetParams, result: AscetCliJsonResult): string {
	if (!result.ok) {
		return formatAscetCliJsonResult(operationForAction(params.action), result);
	}

	const payload = getGetPayload(result.data);
	if (!payload) {
		return formatAscetCliJsonResult(operationForAction(params.action), result);
	}

	const store = new AscetObservationStore();
	const observation = store.create({
		domain: params.action,
		target: buildPayload(params),
		items: getItems(payload),
		coverage: getCoverage(payload),
		source: getSource(payload),
		delivery: params.delivery,
	});
	return JSON.stringify(buildGetOutput(observation, payload), null, 2);
}

function buildGetOutput(observation: AscetObservationResult, payload: JsonRecord): JsonRecord {
	const coverage = getCoverage(payload);
	const source = getSource(payload);
	const truncated = getTruncated(payload);
	if (observation.delivery === "inline") {
		return {
			delivery: "inline",
			items: observation.items,
			coverage,
			truncated,
			source,
		};
	}

	return {
		delivery: "stored",
		observation: {
			resultId: observation.observation.metadata.resultId,
			domain: observation.observation.metadata.domain,
			format: "ndjson",
			dataPath: observation.observation.dataPath,
			metaPath: observation.observation.metaPath,
			itemCount: observation.observation.metadata.itemCount,
		},
		coverage,
		truncated,
		source,
	};
}

export function formatAscetGetResult(params: AscetGetParams, result: AscetCliJsonResult): string {
	return createToolOutput(params, result);
}

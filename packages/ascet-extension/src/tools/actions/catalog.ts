import { createHash } from "node:crypto";
import { compactExamplesForAction } from "../_shared/action-examples.ts";
import { listAscetActionContracts } from "./contract-registry.ts";
import type { AscetActionContract } from "./contracts/types.ts";
import { listAscetPublicSchemaVariants } from "./schema-registry.ts";

export type AscetActionFamily = "ops" | "search" | "get" | "read" | "diff" | "write";
export type AscetActionRisk = "read" | "diff" | "write" | "ops";

export interface AscetActionCatalogEntry {
	id: string;
	tool: string;
	action: string;
	family: AscetActionFamily;
	risk: AscetActionRisk;
	visibility: AscetActionContract["visibility"];
	supportedObjectKinds: readonly string[];
	profiles: readonly string[];
	featureFlag?: string;
	deprecatedBy?: string;
	compact: string;
	miniFewShot: string;
	intent: string;
	useWhen: readonly string[];
	avoidWhen: readonly string[];
	aliases: readonly string[];
	tags: readonly string[];
	nextActions?: readonly string[];
	schemaFingerprint: string;
	rulesFingerprint: string;
	resultFingerprint: string;
	schema: {
		required: readonly string[];
		optional: readonly string[];
		enums?: Readonly<Record<string, readonly string[]>>;
		variants?: ReadonlyArray<{
			required: readonly string[];
			optional: readonly string[];
			when?: Readonly<Record<string, readonly string[]>>;
		}>;
	};
	rules: readonly string[];
	fewShots: ReadonlyArray<{
		args: Readonly<Record<string, unknown>>;
	}>;
	result: {
		shape: string;
		fields: readonly string[];
	};
}

export interface AscetActionCatalogSnapshot {
	version: 1;
	catalogFingerprint: string;
	actions: ReadonlyArray<{
		id: string;
		schemaFingerprint: string;
		rulesFingerprint: string;
		resultFingerprint: string;
		schema: AscetActionCatalogEntry["schema"];
		supportedObjectKinds: readonly string[];
		result: AscetActionCatalogEntry["result"];
	}>;
}

export interface AscetActionCatalogChange {
	id: string;
	classification: "added" | "removed" | "changed";
	breaking: boolean;
	reasons: readonly string[];
}

export interface AscetActionCatalogDiff {
	catalogDrift: boolean;
	breakingSchemaChange: boolean;
	changes: readonly AscetActionCatalogChange[];
}

function canonicalize(value: unknown): string {
	if (value === null || typeof value === "string" || typeof value === "boolean" || typeof value === "number") {
		return JSON.stringify(value);
	}
	if (Array.isArray(value)) {
		return `[${value.map(canonicalize).join(",")}]`;
	}
	if (typeof value === "object") {
		const record = value as Record<string, unknown>;
		return `{${Object.keys(record)
			.sort()
			.map((key) => `${JSON.stringify(key)}:${canonicalize(record[key])}`)
			.join(",")}}`;
	}
	return JSON.stringify(String(value));
}

function fingerprint(value: unknown): string {
	return createHash("sha256").update(canonicalize(value)).digest("hex");
}

function sortedUnique(values: readonly string[]): string[] {
	return [...new Set(values)].sort();
}

function schemaVariantKey(variant: NonNullable<AscetActionCatalogEntry["schema"]["variants"]>[number]): string {
	return canonicalize(variant.when ?? {});
}

function hasRemovedValues(previous: readonly string[] | undefined, current: readonly string[] | undefined): boolean {
	if (!previous) return false;
	const currentValues = new Set(current ?? []);
	return previous.some((value) => !currentValues.has(value));
}

function variantBreakingReasons(
	previous: NonNullable<AscetActionCatalogEntry["schema"]["variants"]>[number],
	current: NonNullable<AscetActionCatalogEntry["schema"]["variants"]>[number],
	key: string,
): string[] {
	const previousRequired = new Set(previous.required);
	return current.required
		.filter((field) => !previousRequired.has(field))
		.map((field) => `variant_required_added:${key}:${field}`);
}

function schemaBreakingReasons(
	previous: AscetActionCatalogSnapshot["actions"][number],
	current: AscetActionCatalogSnapshot["actions"][number],
): string[] {
	const reasons: string[] = [];
	const previousRequired = new Set(previous.schema.required);
	for (const field of current.schema.required) {
		if (!previousRequired.has(field)) reasons.push(`required_added:${field}`);
	}
	for (const [key, values] of Object.entries(previous.schema.enums ?? {})) {
		if (hasRemovedValues(values, current.schema.enums?.[key])) reasons.push(`enum_value_removed:${key}`);
	}
	const previousVariants = new Map(
		(previous.schema.variants ?? []).map((variant) => [schemaVariantKey(variant), variant]),
	);
	const currentVariants = new Map(
		(current.schema.variants ?? []).map((variant) => [schemaVariantKey(variant), variant]),
	);
	for (const [key, previousVariant] of previousVariants) {
		const currentVariant = currentVariants.get(key);
		if (!currentVariant) {
			reasons.push(`variant_removed:${key}`);
			continue;
		}
		reasons.push(...variantBreakingReasons(previousVariant, currentVariant, key));
	}
	if (hasRemovedValues(previous.supportedObjectKinds, current.supportedObjectKinds))
		reasons.push("object_kind_removed");
	if (previous.result.shape !== current.result.shape) reasons.push("result_shape_changed");
	if (hasRemovedValues(previous.result.fields, current.result.fields)) reasons.push("result_field_removed");
	return sortedUnique(reasons);
}

export function createActionCatalogSnapshot(options: { includeHidden?: boolean } = {}): AscetActionCatalogSnapshot {
	const actions = listActionCatalogEntries(options)
		.map((entry) => ({
			id: entry.id,
			schemaFingerprint: entry.schemaFingerprint,
			rulesFingerprint: entry.rulesFingerprint,
			resultFingerprint: entry.resultFingerprint,
			schema: entry.schema,
			supportedObjectKinds: entry.supportedObjectKinds,
			result: entry.result,
		}))
		.sort((left, right) => left.id.localeCompare(right.id));
	return {
		version: 1,
		catalogFingerprint: fingerprint(actions),
		actions,
	};
}

export function diffActionCatalogSnapshots(
	previous: AscetActionCatalogSnapshot,
	current: AscetActionCatalogSnapshot,
): AscetActionCatalogDiff {
	const previousById = new Map(previous.actions.map((action) => [action.id, action]));
	const currentById = new Map(current.actions.map((action) => [action.id, action]));
	const changes: AscetActionCatalogChange[] = [];
	for (const [id, action] of currentById) {
		const before = previousById.get(id);
		if (!before) {
			changes.push({ id, classification: "added", breaking: false, reasons: [] });
			continue;
		}
		if (
			before.schemaFingerprint === action.schemaFingerprint &&
			before.rulesFingerprint === action.rulesFingerprint &&
			before.resultFingerprint === action.resultFingerprint
		)
			continue;
		const reasons = schemaBreakingReasons(before, action);
		changes.push({ id, classification: "changed", breaking: reasons.length > 0, reasons });
	}
	for (const id of previousById.keys()) {
		if (!currentById.has(id)) {
			changes.push({ id, classification: "removed", breaking: true, reasons: ["action_removed"] });
		}
	}
	changes.sort((left, right) => left.id.localeCompare(right.id));
	return {
		catalogDrift: changes.length > 0,
		breakingSchemaChange: changes.some((change) => change.breaking),
		changes,
	};
}

function resolveFamily(tool: string): AscetActionFamily {
	if (tool === "ascet_search") {
		return "search";
	}
	if (tool === "ascet_get") {
		return "get";
	}
	if (tool === "ascet_read") {
		return "read";
	}
	if (tool === "ascet_diff") {
		return "diff";
	}
	if (tool === "ascet_edit" || tool === "ascet_batch_write") {
		return "write";
	}
	return "ops";
}

function resolveRisk(family: AscetActionFamily): AscetActionRisk {
	if (family === "diff") {
		return "diff";
	}
	if (family === "write") {
		return "write";
	}
	if (family === "ops") {
		return "ops";
	}
	return "read";
}

function splitActionWords(value: string): string[] {
	return value.split(/[_\-.]+/u).filter(Boolean);
}

function unique(values: readonly string[]): string[] {
	return [...new Set(values.filter((value) => value.length > 0))];
}

interface JsonSchemaNode {
	properties?: Record<string, JsonSchemaNode>;
	required?: string[];
	anyOf?: JsonSchemaNode[];
	oneOf?: JsonSchemaNode[];
	enum?: unknown[];
}

function enumValuesFromSchema(schema: JsonSchemaNode | undefined): string[] {
	if (!schema) {
		return [];
	}
	const direct = Array.isArray(schema.enum) ? schema.enum : [];
	const nested = Array.isArray(schema.anyOf) ? schema.anyOf.flatMap((variant) => enumValuesFromSchema(variant)) : [];
	return unique([...direct, ...nested].filter((value): value is string => typeof value === "string"));
}

function fieldsFromSchema(schema: JsonSchemaNode): AscetActionCatalogEntry["schema"] {
	const properties = schema.properties ?? {};
	const required = unique(schema.required ?? []);
	const optional = Object.keys(properties).filter((key) => !required.includes(key));
	const enums: Record<string, readonly string[]> = {};
	for (const [key, value] of Object.entries(properties)) {
		const values = enumValuesFromSchema(value);
		if (values.length > 0) {
			enums[key] = values;
		}
	}
	if (required.length === 0 && optional.length === 0) {
		return { required: [], optional: ["action"] };
	}
	return {
		required,
		optional,
		...(Object.keys(enums).length > 0 ? { enums } : {}),
	};
}

function schemaVariantsForContract(contract: AscetActionContract): JsonSchemaNode[] {
	return listAscetPublicSchemaVariants(contract.parameters).map((variant) => variant.schema as JsonSchemaNode);
}

function schemaFromContract(contract: AscetActionContract): AscetActionCatalogEntry["schema"] {
	const variants = schemaVariantsForContract(contract);
	const variantSchemas = variants.map(fieldsFromSchema);
	const required = unique(
		variantSchemas.length === 1
			? variantSchemas[0].required
			: variantSchemas[0].required.filter((field) =>
					variantSchemas.every((variant) => variant.required.includes(field)),
				),
	);
	const optional = unique(
		variantSchemas.flatMap((variant) => variant.optional).filter((field) => !required.includes(field)),
	);
	const enums: Record<string, readonly string[]> = {};
	for (const variant of variantSchemas) {
		for (const [key, values] of Object.entries(variant.enums ?? {}))
			enums[key] = unique([...(enums[key] ?? []), ...values]);
	}
	const conditionalVariants =
		variants.length > 1
			? variants.map((variant) => {
					const fields = fieldsFromSchema(variant);
					const when: Record<string, readonly string[]> = {};
					for (const key of ["phase", "mode", "intent", "scope", "objectKind"]) {
						const values = enumValuesFromSchema(variant.properties?.[key]);
						if (values.length > 0) when[key] = values;
					}
					return {
						required: fields.required,
						optional: fields.optional,
						...(Object.keys(when).length > 0 ? { when } : {}),
					};
				})
			: undefined;
	return {
		required,
		optional,
		...(Object.keys(enums).length > 0 ? { enums } : {}),
		...(conditionalVariants ? { variants: conditionalVariants } : {}),
	};
}

function resultFromContract(contract: AscetActionContract): AscetActionCatalogEntry["result"] {
	if (contract.guidance?.result) return contract.guidance.result;
	const fields = unique(
		listAscetPublicSchemaVariants(contract.result).flatMap((variant) =>
			Object.keys((variant.schema as JsonSchemaNode).properties ?? {}),
		),
	);
	return { shape: "result", fields: fields.length > 0 ? fields : ["value"] };
}

function buildAliases(contract: AscetActionContract): string[] {
	return unique([
		...(contract.guidance?.aliases ?? []),
		contract.id,
		contract.action,
		...splitActionWords(contract.action),
		...(contract.guidance?.tags ?? []),
		contract.guidance?.summary ?? "",
	]);
}

function toCatalogEntry(contract: AscetActionContract): AscetActionCatalogEntry {
	const family = resolveFamily(contract.tool);
	const fewShots = (contract.guidance?.fewShots ?? []).map((fewShot) => ({ args: { ...fewShot.args } }));
	const compact = contract.guidance?.compact ?? contract.guidance?.summary ?? contract.id;
	const schema = schemaFromContract(contract);
	const rules = contract.guidance?.rules ? [...contract.guidance.rules] : [];
	const result = resultFromContract(contract);
	const miniFewShot =
		compactExamplesForAction(contract.tool, contract.action, { includeHidden: true })[0] ??
		`${contract.tool}({action:${JSON.stringify(contract.action)}})`;
	return {
		id: contract.id,
		tool: contract.tool,
		action: contract.action,
		family,
		risk: resolveRisk(family),
		visibility: contract.visibility,
		supportedObjectKinds: [...(contract.supportedObjectKinds ?? [])],
		profiles: [...contract.profiles],
		featureFlag: contract.featureFlag,
		deprecatedBy: contract.deprecatedBy,
		compact,
		miniFewShot,
		intent: contract.guidance?.intent ?? contract.guidance?.summary ?? contract.id,
		useWhen: contract.guidance?.useWhen ?? [contract.guidance?.summary ?? contract.id],
		avoidWhen: contract.guidance?.avoidWhen ?? [],
		aliases: buildAliases(contract),
		tags: contract.guidance?.tags ? [...contract.guidance.tags] : [],
		nextActions: contract.guidance?.nextActions,
		schemaFingerprint: fingerprint(schema),
		rulesFingerprint: fingerprint(rules),
		resultFingerprint: fingerprint(result),
		schema,
		rules,
		fewShots,
		result,
	};
}

export function listActionCatalogEntries(options: { includeHidden?: boolean } = {}): AscetActionCatalogEntry[] {
	return listAscetActionContracts()
		.filter((contract) => options.includeHidden === true || contract.visibility === "public")
		.map(toCatalogEntry);
}

export function getActionCatalogEntry(
	tool: string,
	action: string,
	options: { includeHidden?: boolean } = {},
): AscetActionCatalogEntry | undefined {
	return listActionCatalogEntries(options).find((entry) => entry.tool === tool && entry.action === action);
}

export function getActionCatalogEntryById(
	id: string,
	options: { includeHidden?: boolean } = {},
): AscetActionCatalogEntry | undefined {
	return listActionCatalogEntries(options).find((entry) => entry.id === id);
}

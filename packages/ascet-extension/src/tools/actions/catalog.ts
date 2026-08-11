import { createHash } from "node:crypto";
import type { TSchema } from "typebox";
import { ascetGetParameters } from "../../get.ts";
import { compactExamplesForAction } from "../_shared/action-examples.ts";
import { ascetCapabilitiesParameters } from "../capabilities/schema.ts";
import { ascetDiffParameters } from "../diff/schema.ts";
import { ascetEditParameters } from "../edit/schema.ts";
import { ascetReadParameters } from "../read/schema.ts";
import { ascetRecoverParameters } from "../recover/schema.ts";
import { ascetRequirementsParameters } from "../requirements/schema.ts";
import { ascetSchedulerStatusParameters } from "../scheduler-status/schema.ts";
import { ascetStatusParameters } from "../status/schema.ts";
import { type AscetActionDescriptor, listActionDescriptors } from "./descriptors.ts";
import { listAscetPublicSchemaVariants } from "./schema-registry.ts";

export type AscetActionFamily = "ops" | "get" | "read" | "diff" | "write";
export type AscetActionRisk = "read" | "diff" | "write" | "ops";

export interface AscetActionCatalogEntry {
	id: string;
	tool: string;
	action: string;
	family: AscetActionFamily;
	risk: AscetActionRisk;
	visibility: AscetActionDescriptor["visibility"];
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

interface ActionOverride {
	family?: AscetActionFamily;
	risk?: AscetActionRisk;
	compact?: string;
	intent?: string;
	useWhen?: readonly string[];
	avoidWhen?: readonly string[];
	aliases?: readonly string[];
	nextActions?: readonly string[];
	schema?: AscetActionCatalogEntry["schema"];
	result?: AscetActionCatalogEntry["result"];
}

const actionOverrides: Readonly<Record<string, ActionOverride>> = {
	"ascet_capabilities.search_actions": {
		compact: "search ASCET tool actions and return full schema/rules/fewShot",
		intent: "Find the correct ASCET tool action and retrieve precise calling details.",
		useWhen: ["Action choice, parameters, result shape, or usage rules are unclear."],
		avoidWhen: ["The exact action and required parameters are already known."],
		aliases: ["tool action search", "which ascet tool", "action schema", "few-shot", "capability action"],
		schema: {
			required: ["action"],
			optional: ["query", "tool", "name", "limit", "includeHidden", "detailLevel"],
			enums: {
				action: ["search_actions"],
				detailLevel: ["summary", "full"],
			},
		},
		result: { shape: "actionMatches", fields: ["total", "items"] },
	},
	"ascet_read.read_code": {
		compact: "read complete live code; not global code search",
		intent: "Read complete current code text from a resolved ASCET component or method.",
		useWhen: ["Need complete live code for a known component, method, C header, or external C section."],
		avoidWhen: ["Need offline text filtering over a stored observation; use Pi grep after ascet_get."],
		aliases: ["complete code", "full code", "method body", "live code", "read code", "open code"],
		nextActions: ["ascet_edit.set_method_code", "ascet_diff.diff_method"],
		schema: {
			required: ["action", "componentPath"],
			optional: ["methodName", "section", "detailLevel"],
			enums: {
				action: ["read_code"],
				section: ["body", "header", "external-c", "all"],
				detailLevel: ["summary", "topology", "full"],
			},
		},
		result: { shape: "codeText", fields: ["component", "name", "section", "text"] },
	},
	"ascet_read.read_dependent_chain": {
		compact: "read one exact local/imported/exported dependency chain; provider path is optional explicit evidence",
		intent:
			"Read the dependency chain for a known Local Parameter, optionally constrained to one exact provider component.",
		useWhen: [
			"The consumer component and dependent Element are already known.",
			"A provider path is known exactly and must be verified as the exporter.",
		],
		avoidWhen: [
			"Need to discover an unknown provider component; use ascet_get.tree and ascet_get.elements first.",
			"Need to create or modify dependency state; use ascet_edit.apply_element_spec then ascet_edit.set_element_dependency.",
		],
		aliases: [
			"dependent chain",
			"dependency provider",
			"exported parameter provider",
			"local imported exported parameter",
		],
		nextActions: ["ascet_get.elements", "ascet_get.import_binding", "ascet_edit.set_element_dependency"],
		schema: {
			required: ["action", "componentPath", "dependentElement"],
			optional: ["exporterComponentPath"],
			enums: { action: ["read_dependent_chain"] },
		},
		result: { shape: "dependentChain", fields: ["consumer", "provider", "items", "issues"] },
	},
	"ascet_read.read_block_diagram": {
		aliases: ["read block diagram", "BDE", "diagram content", "block diagram"],
		result: { shape: "blockDiagram", fields: ["component", "name", "items", "counts"] },
	},
	"ascet_edit.set_method_code": {
		aliases: ["write method code", "set method body", "update method code", "modify code"],
		nextActions: ["ascet_read.read_code"],
		result: { shape: "writePreflightOrResult", fields: ["status", "changed", "verification", "observations"] },
	},
	"ascet_edit.set_element_dependency": {
		compact:
			"set dependency flag/formula on an existing local parameter only; successful writes invalidate matching observations",
		intent: "Set or clear dependency state and formula for an existing local parameter through guarded write flow.",
		useWhen: [
			"The local parameter already exists and the user wants dependency=dependent or dependency=independent applied.",
			"Need to set the local dependent parameter formula after local/imported elements were created with apply_element_spec.",
		],
		avoidWhen: [
			"Need to create local, imported, or exported elements; use apply_element_spec first.",
			"Need to discover provider evidence before writing; use read_dependent_chain first.",
		],
		aliases: [
			"set dependency",
			"dependent parameter write",
			"dependency formula",
			"make local parameter dependent",
			"clear dependency",
		],
		nextActions: ["ascet_read.read_element_dependency", "ascet_read.read_dependent_chain"],
		result: {
			shape: "writeResult",
			fields: ["changed", "verification", "observations.invalidated"],
		},
	},
};

// Keep schema resolution lazy. Several action implementations import the
// catalog for their search path, so eagerly reading a schema that re-exports
// one of those implementations creates a circular-initialization failure on
// the first extension import.
const actionParameterSchemas: Readonly<Record<string, unknown>> = {
	get ascet_capabilities() {
		return ascetCapabilitiesParameters;
	},
	get ascet_diff() {
		return ascetDiffParameters;
	},
	get ascet_edit() {
		return ascetEditParameters;
	},
	get ascet_get() {
		return ascetGetParameters;
	},
	get ascet_read() {
		return ascetReadParameters;
	},
	get ascet_recover() {
		return ascetRecoverParameters;
	},
	get ascet_requirements() {
		return ascetRequirementsParameters;
	},
	get ascet_scheduler_status() {
		return ascetSchedulerStatusParameters;
	},
	get ascet_status() {
		return ascetStatusParameters;
	},
};

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
	return canonicalize(variant);
}

function hasRemovedValues(previous: readonly string[] | undefined, current: readonly string[] | undefined): boolean {
	if (!previous) return false;
	const currentValues = new Set(current ?? []);
	return previous.some((value) => !currentValues.has(value));
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
	const previousVariants = new Set((previous.schema.variants ?? []).map(schemaVariantKey));
	const currentVariants = new Set((current.schema.variants ?? []).map(schemaVariantKey));
	for (const variant of previousVariants) {
		if (!currentVariants.has(variant)) reasons.push("variant_removed");
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

function schemaVariantsForAction(schema: JsonSchemaNode, action: string): JsonSchemaNode[] {
	const variants = listAscetPublicSchemaVariants(schema as TSchema);
	const matching = variants.filter((variant) => variant.discriminators.action?.includes(action) === true);
	return (matching.length > 0 ? matching : variants).map((variant) => variant.schema as JsonSchemaNode);
}

function inferSchemaFromRegistry(descriptor: AscetActionDescriptor): AscetActionCatalogEntry["schema"] | undefined {
	const rawSchema = actionParameterSchemas[descriptor.tool] as JsonSchemaNode | undefined;
	if (!rawSchema) {
		return undefined;
	}
	const variants = schemaVariantsForAction(rawSchema, descriptor.action);
	if (variants.length === 0) {
		return undefined;
	}
	const variantSchemas = variants.map(fieldsFromSchema);
	const required = unique(
		variantSchemas.length === 1
			? variantSchemas[0].required
			: variantSchemas[0].required.filter((field) =>
					variantSchemas.every((variant) => variant.required.includes(field)),
				),
	);
	const optional = unique(
		variantSchemas.flatMap((variant) => [...variant.optional]).filter((field) => !required.includes(field)),
	);
	const enums: Record<string, readonly string[]> = {};
	for (const variant of variantSchemas) {
		for (const [key, values] of Object.entries(variant.enums ?? {})) {
			enums[key] = unique([...(enums[key] ?? []), ...values]);
		}
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

function inferSchema(descriptor: AscetActionDescriptor): AscetActionCatalogEntry["schema"] {
	return (
		inferSchemaFromRegistry(descriptor) ?? {
			required: descriptor.action ? ["action"] : [],
			optional: [],
		}
	);
}

function inferResult(descriptor: AscetActionDescriptor): AscetActionCatalogEntry["result"] {
	if (descriptor.tool === "ascet_get") {
		return { shape: "observation", fields: ["delivery", "items", "observation", "coverage", "truncated"] };
	}
	if (descriptor.tool === "ascet_read") {
		return { shape: "liveRead", fields: ["component", "items"] };
	}
	if (descriptor.tool === "ascet_edit") {
		return { shape: "writePreflightOrResult", fields: ["status", "changed", "verification", "observations"] };
	}
	if (descriptor.tool === "ascet_diff") {
		return { shape: "diff", fields: ["left", "right", "items"] };
	}
	return { shape: "result", fields: ["items"] };
}

function buildAliases(descriptor: AscetActionDescriptor, override?: ActionOverride): string[] {
	return unique([
		...(override?.aliases ?? []),
		descriptor.id,
		descriptor.action,
		...splitActionWords(descriptor.action),
		...(descriptor.prompt?.tags ?? []),
		descriptor.prompt?.summary ?? "",
	]);
}

function toCatalogEntry(descriptor: AscetActionDescriptor): AscetActionCatalogEntry {
	const override = actionOverrides[descriptor.id];
	const family = override?.family ?? resolveFamily(descriptor.tool);
	const fewShots = (descriptor.prompt?.fewShots ?? []).map((fewShot) => ({ args: { ...fewShot.args } }));
	const compact = override?.compact ?? descriptor.prompt?.summary ?? descriptor.id;
	const schema = override?.schema ?? inferSchema(descriptor);
	const rules = descriptor.prompt?.rules ? [...descriptor.prompt.rules] : [];
	const result = override?.result ?? inferResult(descriptor);
	const miniFewShot =
		compactExamplesForAction(descriptor.tool, descriptor.action, { includeHidden: true })[0] ??
		`${descriptor.tool}({action:${JSON.stringify(descriptor.action)}})`;
	return {
		id: descriptor.id,
		tool: descriptor.tool,
		action: descriptor.action,
		family,
		risk: override?.risk ?? resolveRisk(family),
		visibility: descriptor.visibility,
		supportedObjectKinds: [...(descriptor.supportedObjectKinds ?? [])],
		profiles: [...descriptor.profiles],
		featureFlag: descriptor.featureFlag,
		deprecatedBy: descriptor.deprecatedBy,
		compact,
		miniFewShot,
		intent: override?.intent ?? descriptor.prompt?.summary ?? descriptor.id,
		useWhen: override?.useWhen ?? [descriptor.prompt?.summary ?? descriptor.id],
		avoidWhen: override?.avoidWhen ?? [],
		aliases: buildAliases(descriptor, override),
		tags: descriptor.prompt?.tags ? [...descriptor.prompt.tags] : [],
		nextActions: override?.nextActions,
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
	return listActionDescriptors()
		.filter((descriptor) => options.includeHidden === true || descriptor.visibility === "public")
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

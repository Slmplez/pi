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
import { ascetVerifyParameters } from "../verify.ts";
import { type AscetActionDescriptor, listActionDescriptors } from "./descriptors.ts";

export type AscetActionFamily = "ops" | "get" | "read" | "diff" | "write" | "verify";
export type AscetActionRisk = "read" | "diff" | "write" | "ops";

export interface AscetActionCatalogEntry {
	id: string;
	tool: string;
	action: string;
	family: AscetActionFamily;
	risk: AscetActionRisk;
	visibility: AscetActionDescriptor["visibility"];
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
		nextActions: ["ascet_verify.readback", "ascet_read.read_code"],
		result: { shape: "writePreflightOrResult", fields: ["status", "component", "name", "diff"] },
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
		schema: {
			required: ["action", "targetPath", "elementName", "dependency"],
			optional: [
				"dependencyFormula",
				"dependencyMappings",
				"clearDependencyFormula",
				"targetKind",
				"match",
				"dryRun",
				"backupDir",
				"verifyReadback",
				"executeWrite",
			],
			enums: {
				action: ["set_element_dependency"],
				dependency: ["dependent", "independent"],
				targetKind: ["auto", "component", "folder", "project"],
				match: ["exact", "all"],
			},
		},
		result: {
			shape: "writeResult",
			fields: ["changed", "readback", "observations.invalidated"],
		},
	},
	"ascet_verify.readback": {
		aliases: ["verify write result", "readback", "verify current state", "check live state"],
		result: { shape: "readback", fields: ["component", "kind", "items"] },
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
	get ascet_verify() {
		return ascetVerifyParameters;
	},
};

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
	if (tool === "ascet_verify") {
		return "verify";
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

function actionNameFromSchema(schema: JsonSchemaNode | undefined): string | undefined {
	const values = schema?.enum;
	return Array.isArray(values) && values.length === 1 && typeof values[0] === "string" ? values[0] : undefined;
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
	const variants = Array.isArray(schema.anyOf) ? schema.anyOf : [schema];
	const matching = variants.filter((variant) => {
		const variantAction = actionNameFromSchema(variant.properties?.action);
		return variantAction === action;
	});
	if (matching.length > 0) {
		return matching;
	}
	return variants;
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
					const whenValue = enumValuesFromSchema(variant.properties?.objectKind);
					return {
						required: fields.required,
						optional: fields.optional,
						...(whenValue.length > 0 ? { when: { objectKind: whenValue } } : {}),
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
		return { shape: "writePreflightOrResult", fields: ["status", "component", "diff"] };
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
		schema: override?.schema ?? inferSchema(descriptor),
		rules: descriptor.prompt?.rules ? [...descriptor.prompt.rules] : [],
		fewShots,
		result: override?.result ?? inferResult(descriptor),
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

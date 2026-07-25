import { compactExamplesForAction } from "../_shared/action-examples.ts";
import { type AscetActionDescriptor, listActionDescriptors } from "./descriptors.ts";

export type AscetActionFamily = "ops" | "explore" | "search" | "read" | "reference" | "diff" | "write" | "verify";
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
	requiresPartitions?: readonly string[];
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
		avoidWhen: ["Need global occurrence search; use ascet_search.text_in_code."],
		aliases: ["complete code", "full code", "method body", "live code", "read code", "open code"],
		nextActions: ["ascet_write.set_method_code", "ascet_diff.diff_method"],
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
	"ascet_search.text_in_code": {
		compact: "search indexed ESDL/C snippets; not complete live code",
		intent: "Find where text appears in indexed ESDL or C code and return snippet evidence.",
		useWhen: ["Need to find occurrences of a code fragment, method call, symbol, or text across code."],
		avoidWhen: ["Need the complete code body for one known target; use ascet_read.read_code."],
		aliases: ["code search", "text in code", "ESDL search", "C code search", "where code appears", "snippet"],
		nextActions: ["ascet_read.read_code", "ascet_search.references_to_element"],
		schema: {
			required: ["action", "query"],
			optional: ["componentPath", "scopePath", "match", "limit", "cursor", "detailLevel"],
			enums: {
				action: ["text_in_code"],
				match: ["exact", "contains"],
				detailLevel: ["summary", "topology", "full"],
			},
		},
		result: { shape: "textOccurrences", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_search.declarations_of_element": {
		aliases: ["element declaration", "declarations of element", "find element", "where element declared"],
		result: { shape: "elementDeclarations", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_search.references_to_element": {
		aliases: ["element reference", "references to element", "where element used", "element usage"],
		result: { shape: "elementReferences", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_search.references_to_component": {
		aliases: ["component reference", "references to component", "who calls component", "component usage"],
		result: { shape: "componentReferences", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_search.declarations_of_method_process": {
		aliases: ["method declaration", "process declaration", "declarations of method", "declarations of process"],
		result: { shape: "methodDeclarations", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_search.declarations_of_method_process_element": {
		aliases: ["method local variables", "process arguments", "method process element", "local elements"],
		result: { shape: "methodProcessElements", fields: ["total", "items", "nextCursor", "searchComplete"] },
	},
	"ascet_explore.list_diagrams": {
		aliases: ["list diagrams", "diagram metadata", "available diagrams", "diagram list"],
		nextActions: ["ascet_read.read_block_diagram"],
		result: { shape: "diagramList", fields: ["component", "total", "items"] },
	},
	"ascet_read.read_block_diagram": {
		aliases: ["read block diagram", "BDE", "diagram content", "block diagram"],
		result: { shape: "blockDiagram", fields: ["component", "name", "items", "counts"] },
	},
	"ascet_write.set_method_code": {
		aliases: ["write method code", "set method body", "update method code", "modify code"],
		nextActions: ["ascet_verify.readback", "ascet_read.read_code"],
		result: { shape: "writePreflightOrResult", fields: ["status", "component", "name", "diff"] },
	},
	"ascet_verify.readback": {
		aliases: ["verify write result", "readback", "verify current state", "check live state"],
		result: { shape: "readback", fields: ["component", "kind", "items"] },
	},
};

function resolveFamily(tool: string): AscetActionFamily {
	if (tool === "ascet_explore") {
		return "explore";
	}
	if (tool === "ascet_search") {
		return "search";
	}
	if (tool === "ascet_read") {
		return "read";
	}
	if (tool === "ascet_reference") {
		return "reference";
	}
	if (tool === "ascet_diff") {
		return "diff";
	}
	if (tool === "ascet_write" || tool === "ascet_component_editable" || tool === "ascet_batch_write") {
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

function inferSchema(descriptor: AscetActionDescriptor): AscetActionCatalogEntry["schema"] {
	const firstArgs = descriptor.prompt?.fewShots?.[0]?.args ?? {};
	const keys = Object.keys(firstArgs);
	if (keys.length === 0) {
		return { required: [], optional: ["action"] };
	}
	const required = keys.includes("action") ? ["action"] : [];
	const optional = keys.filter((key) => key !== "action");
	return {
		required,
		optional,
	};
}

function inferResult(descriptor: AscetActionDescriptor): AscetActionCatalogEntry["result"] {
	if (descriptor.tool === "ascet_search") {
		return { shape: "pagedItems", fields: ["total", "items", "nextCursor"] };
	}
	if (descriptor.tool === "ascet_read") {
		return { shape: "liveRead", fields: ["component", "items"] };
	}
	if (descriptor.tool === "ascet_write") {
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
		requiresPartitions: descriptor.requiresPartitions ? [...descriptor.requiresPartitions] : undefined,
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

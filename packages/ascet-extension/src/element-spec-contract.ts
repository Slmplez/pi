import { type TProperties, Type } from "typebox";
import { type AscetPublicWriteControl, ascetWriteControlProperties } from "./edit/write-control-contract.ts";
import {
	type ascetApplyElementIntentValues,
	ascetElementKindValues,
	ascetElementRoleContract,
	ascetElementRoleValues,
	ascetElementScopeValues,
	ascetNormalizedElementSpecFields,
} from "./generated/ascet-element-write-contract.generated.ts";

export {
	ascetApplyElementIntentValues,
	ascetElementKindValues,
	ascetElementRoleContract,
	ascetElementRoleValues,
	ascetElementScopeValues,
	ascetElementWriteContractHash,
	ascetElementWriteContractMetadata,
	ascetElementWriteContractVersion,
} from "./generated/ascet-element-write-contract.generated.ts";

export type AscetElementRole = (typeof ascetElementRoleValues)[number];
export type AscetApplyElementIntent = (typeof ascetApplyElementIntentValues)[number];
export type AscetElementInput = Record<string, unknown>;
export type AscetParameterRangeDecision =
	| { mode: "none" }
	| { mode: "physical"; min: unknown; max: unknown }
	| { mode: "implementation"; min: unknown; max: unknown };
export type AscetParameterDataDecision = { mode: "explicit"; value: unknown } | { mode: "ascetDefault" };
export type AscetParameterImplementationDecision =
	| { mode: "ascetDefault" }
	| {
			mode: "explicit";
			valueType: string;
			memoryLocation: string;
			formula: string;
			limitAssignments: boolean | null;
	  };
export interface AscetProviderExportedParameterCreateInput {
	[key: string]: unknown;
	role: "providerExportedParameter";
	name: string;
	modelType: string;
	unit: string;
	comment: string;
	calibration: boolean;
	range: AscetParameterRangeDecision;
	data: AscetParameterDataDecision;
	implementation: AscetParameterImplementationDecision;
}
export interface AscetConsumerImportedParameterCreateInput {
	[key: string]: unknown;
	role: "consumerImportedParameter";
	name: string;
	modelType: string;
	unit?: string;
}
export interface AscetLocalDependentParameterCreateInput {
	[key: string]: unknown;
	role: "localDependentParameter";
	name: string;
	modelType: string;
	unit: string;
	comment: string;
	calibration: boolean;
	range: AscetParameterRangeDecision;
	implementation: AscetParameterImplementationDecision;
}
export interface AscetDataTarget {
	mode: "default";
}
export interface AscetImplementationTarget {
	mode: "default";
}

export interface AscetApplyElementPlanParams extends AscetPublicWriteControl {
	action: "apply_element_spec";
	componentPath: string;
	elementIntent: AscetApplyElementIntent;
	elements: AscetElementInput[];
	projectPath?: string;
	dataTarget?: AscetDataTarget;
	implementationTarget?: AscetImplementationTarget;
	deleteMissing?: boolean;
	recreateIncompatible?: boolean;
}

const strictObject = <T extends TProperties>(properties: T) => Type.Object(properties, { additionalProperties: false });

const scalarValueSchema = Type.Unknown();
const rangeSchema = strictObject({ min: scalarValueSchema, max: scalarValueSchema });
const dataSchema = strictObject({ value: scalarValueSchema });
const implementationSchema = strictObject({
	memoryLocation: Type.Optional(Type.String({ minLength: 1 })),
	valueType: Type.Optional(Type.String({ minLength: 1 })),
	implementationRange: Type.Optional(rangeSchema),
	formula: Type.Optional(Type.String()),
	limitAssignments: Type.Optional(Type.Boolean()),
});
export const ascetParameterRangeDecisionSchema = Type.Union([
	strictObject({ mode: Type.Literal("none") }),
	strictObject({ mode: Type.Literal("physical"), min: scalarValueSchema, max: scalarValueSchema }),
	strictObject({ mode: Type.Literal("implementation"), min: scalarValueSchema, max: scalarValueSchema }),
]);
export const ascetParameterDataDecisionSchema = Type.Union([
	strictObject({ mode: Type.Literal("explicit"), value: scalarValueSchema }),
	strictObject({ mode: Type.Literal("ascetDefault") }),
]);
export const ascetParameterImplementationDecisionSchema = Type.Union([
	strictObject({ mode: Type.Literal("ascetDefault") }),
	strictObject({
		mode: Type.Literal("explicit"),
		valueType: Type.String({ minLength: 1 }),
		memoryLocation: Type.String({ minLength: 1 }),
		formula: Type.String(),
		limitAssignments: Type.Union([Type.Boolean(), Type.Null()]),
	}),
]);
const kindSchema = Type.Union(ascetElementKindValues.map((value) => Type.Literal(value)));
const scopeSchema = Type.Union(ascetElementScopeValues.map((value) => Type.Literal(value)));
const commonElementProperties = {
	name: Type.String({ minLength: 1 }),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(scopeSchema),
	unit: Type.Optional(Type.String()),
	comment: Type.Optional(Type.String()),
	calibration: Type.Optional(Type.Boolean()),
	physicalRange: Type.Optional(rangeSchema),
	length: Type.Optional(Type.Integer({ minimum: 1 })),
	enumerationPath: Type.Optional(Type.String({ minLength: 1 })),
	tableDimension: Type.Optional(Type.Union([Type.Literal("1d"), Type.Literal("2d")])),
	xValues: Type.Optional(Type.Array(scalarValueSchema)),
	yValues: Type.Optional(Type.Array(scalarValueSchema)),
	values: Type.Optional(Type.Array(scalarValueSchema)),
	referencedComponentPath: Type.Optional(Type.String({ minLength: 1 })),
};

const standardPrimitiveSchema = strictObject({
	role: Type.Literal("standardPrimitive"),
	...commonElementProperties,
	kind: kindSchema,
	modelType: Type.String({ minLength: 1 }),
	scope: scopeSchema,
	data: Type.Optional(dataSchema),
	impl: Type.Optional(implementationSchema),
});

export const ascetProviderExportedParameterCreateSchema = strictObject({
	role: Type.Literal("providerExportedParameter"),
	name: Type.String({ minLength: 1 }),
	modelType: Type.String({ minLength: 1 }),
	unit: Type.String(),
	comment: Type.String(),
	calibration: Type.Boolean(),
	range: ascetParameterRangeDecisionSchema,
	data: ascetParameterDataDecisionSchema,
	implementation: ascetParameterImplementationDecisionSchema,
});

export const ascetConsumerImportedParameterCreateSchema = strictObject({
	role: Type.Literal("consumerImportedParameter"),
	name: Type.String({ minLength: 1 }),
	modelType: Type.String({ minLength: 1 }),
	unit: Type.Optional(Type.String()),
});

export const ascetLocalDependentParameterCreateSchema = strictObject({
	role: Type.Literal("localDependentParameter"),
	name: Type.String({ minLength: 1 }),
	modelType: Type.String({ minLength: 1 }),
	unit: Type.String(),
	comment: Type.String(),
	calibration: Type.Boolean(),
	range: ascetParameterRangeDecisionSchema,
	implementation: ascetParameterImplementationDecisionSchema,
});

const arraySchema = strictObject({
	role: Type.Literal("array"),
	...commonElementProperties,
	kind: Type.Optional(Type.Literal("array")),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(scopeSchema),
	data: Type.Optional(dataSchema),
	impl: Type.Optional(implementationSchema),
});

const enumerationSchema = strictObject({
	role: Type.Literal("enumeration"),
	...commonElementProperties,
	kind: Type.Optional(Type.Literal("enumeration")),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(scopeSchema),
	enumerationPath: Type.String({ minLength: 1 }),
	data: Type.Optional(dataSchema),
	impl: Type.Optional(implementationSchema),
});

const tableSchema = strictObject({
	role: Type.Literal("table"),
	...commonElementProperties,
	kind: Type.Optional(Type.Literal("table")),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(scopeSchema),
	tableDimension: Type.Union([Type.Literal("1d"), Type.Literal("2d")]),
	xValues: Type.Optional(Type.Array(scalarValueSchema)),
	yValues: Type.Optional(Type.Array(scalarValueSchema)),
	values: Type.Optional(Type.Array(scalarValueSchema)),
	impl: Type.Optional(implementationSchema),
});

const componentReferenceSchema = strictObject({
	role: Type.Literal("componentReference"),
	...commonElementProperties,
	kind: Type.Optional(Type.Literal("component")),
	scope: Type.Optional(scopeSchema),
	referencedComponentPath: Type.String({ minLength: 1 }),
});

export const ascetElementCreateSchema = Type.Union([
	standardPrimitiveSchema,
	ascetProviderExportedParameterCreateSchema,
	ascetConsumerImportedParameterCreateSchema,
	ascetLocalDependentParameterCreateSchema,
	arraySchema,
	enumerationSchema,
	tableSchema,
	componentReferenceSchema,
]);

const patchCommonElementProperties = {
	name: Type.String({ minLength: 1 }),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(scopeSchema),
	unit: Type.Optional(Type.String()),
	comment: Type.Optional(Type.String()),
	calibration: Type.Optional(Type.Boolean()),
	physicalRange: Type.Optional(rangeSchema),
	length: Type.Optional(Type.Integer({ minimum: 1 })),
	enumerationPath: Type.Optional(Type.String({ minLength: 1 })),
	tableDimension: Type.Optional(Type.Union([Type.Literal("1d"), Type.Literal("2d")])),
	xValues: Type.Optional(Type.Array(scalarValueSchema)),
	yValues: Type.Optional(Type.Array(scalarValueSchema)),
	values: Type.Optional(Type.Array(scalarValueSchema)),
	referencedComponentPath: Type.Optional(Type.String({ minLength: 1 })),
};

const patchImportedElementProperties = {
	name: Type.String({ minLength: 1 }),
	modelType: Type.Optional(Type.String({ minLength: 1 })),
	scope: Type.Optional(Type.Literal("imported")),
	unit: Type.Optional(Type.String()),
	length: Type.Optional(Type.Integer({ minimum: 1 })),
};

const genericElementPatchSchema = strictObject({
	...patchCommonElementProperties,
	kind: Type.Optional(kindSchema),
	data: Type.Optional(dataSchema),
	impl: Type.Optional(implementationSchema),
});

const rolePatchSchemas = [
	strictObject({
		role: Type.Literal("standardPrimitive"),
		...patchCommonElementProperties,
		kind: Type.Optional(kindSchema),
		data: Type.Optional(dataSchema),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("providerExportedParameter"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("parameter")),
		scope: Type.Optional(Type.Literal("exported")),
		data: Type.Optional(dataSchema),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("consumerImportedParameter"),
		...patchImportedElementProperties,
		kind: Type.Optional(Type.Literal("parameter")),
	}),
	strictObject({
		role: Type.Literal("localDependentParameter"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("parameter")),
		scope: Type.Optional(Type.Literal("local")),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("array"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("array")),
		data: Type.Optional(dataSchema),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("enumeration"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("enumeration")),
		enumerationPath: Type.Optional(Type.String({ minLength: 1 })),
		data: Type.Optional(dataSchema),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("table"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("table")),
		tableDimension: Type.Optional(Type.Union([Type.Literal("1d"), Type.Literal("2d")])),
		impl: Type.Optional(implementationSchema),
	}),
	strictObject({
		role: Type.Literal("componentReference"),
		...patchCommonElementProperties,
		kind: Type.Optional(Type.Literal("component")),
		referencedComponentPath: Type.Optional(Type.String({ minLength: 1 })),
	}),
] as const;

export const ascetElementPatchSchema = Type.Union([genericElementPatchSchema, ...rolePatchSchemas]);

export const ascetDataTargetSchema = Type.Union([strictObject({ mode: Type.Literal("default") })]);
export const ascetImplementationTargetSchema = Type.Union([strictObject({ mode: Type.Literal("default") })]);

const planCommonProperties = {
	action: Type.Literal("apply_element_spec"),
	componentPath: Type.String({ minLength: 1 }),
	projectPath: Type.Optional(Type.String({ minLength: 1 })),
	dataTarget: Type.Optional(ascetDataTargetSchema),
	implementationTarget: Type.Optional(ascetImplementationTargetSchema),
	deleteMissing: Type.Optional(Type.Boolean()),
	recreateIncompatible: Type.Optional(Type.Boolean()),
	...ascetWriteControlProperties,
};

export const ascetApplyElementSpecPlanSchema = Type.Union([
	strictObject({
		...planCommonProperties,
		elementIntent: Type.Literal("create"),
		elements: Type.Array(ascetElementCreateSchema),
	}),
	strictObject({
		...planCommonProperties,
		elementIntent: Type.Literal("patch"),
		elements: Type.Array(ascetElementPatchSchema),
	}),
	strictObject({
		...planCommonProperties,
		elementIntent: Type.Literal("upsert"),
		elements: Type.Array(Type.Union([ascetElementCreateSchema, ascetElementPatchSchema])),
	}),
	strictObject({
		...planCommonProperties,
		elementIntent: Type.Literal("restore"),
		elements: Type.Array(ascetElementCreateSchema),
	}),
]);

export const ascetApplyElementSpecParameters = ascetApplyElementSpecPlanSchema;

export interface NormalizedElementSpecResult {
	spec: { elements: Record<string, unknown>[] };
	resolvedIntent: "create" | "patch" | "upsert" | "restore";
	resolvedOperations: Array<{ name: string; operation: "create" | "patch" }>;
	warnings: string[];
}

const canonicalSpecKeys = ascetNormalizedElementSpecFields;

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function cloneJsonValue(value: unknown): unknown {
	if (Array.isArray(value)) return value.map(cloneJsonValue);
	if (isRecord(value))
		return Object.fromEntries(Object.entries(value).map(([key, entry]) => [key, cloneJsonValue(entry)]));
	return value;
}

function validateRequiredCreateFields(input: Record<string, unknown>, role: AscetElementRole): void {
	const name = typeof input.name === "string" ? input.name : "";
	const missing = ascetElementRoleContract[role].requiredCreateFields.filter((field) => !Object.hasOwn(input, field));
	if (missing.length > 0) {
		throw semanticError(`${name}: ${role} requires explicit create fields: ${missing.join(", ")}.`);
	}
}

function expandParameterDecisions(input: Record<string, unknown>, role: AscetElementRole): Record<string, unknown> {
	if (role !== "providerExportedParameter" && role !== "localDependentParameter") {
		return cloneJsonValue(input) as Record<string, unknown>;
	}
	const expanded = cloneJsonValue(input) as Record<string, unknown>;
	const range = isRecord(expanded.range) ? expanded.range : undefined;
	const implementation = isRecord(expanded.implementation) ? expanded.implementation : undefined;
	delete expanded.range;
	delete expanded.implementation;
	if (range?.mode === "physical") {
		expanded.physicalRange = { min: cloneJsonValue(range.min), max: cloneJsonValue(range.max) };
	}
	const normalizedImplementation: Record<string, unknown> = {};
	if (implementation?.mode === "explicit") {
		normalizedImplementation.valueType = implementation.valueType;
		normalizedImplementation.memoryLocation = implementation.memoryLocation;
		if (typeof implementation.formula === "string" && implementation.formula.length > 0) {
			normalizedImplementation.formula = implementation.formula;
		}
		if (typeof implementation.limitAssignments === "boolean") {
			normalizedImplementation.limitAssignments = implementation.limitAssignments;
		}
	}
	if (range?.mode === "implementation") {
		normalizedImplementation.implementationRange = {
			min: cloneJsonValue(range.min),
			max: cloneJsonValue(range.max),
		};
	}
	if (Object.keys(normalizedImplementation).length > 0) {
		expanded.impl = normalizedImplementation;
	}
	if (role === "providerExportedParameter") {
		const data = isRecord(expanded.data) ? expanded.data : undefined;
		if (data?.mode === "explicit") {
			expanded.data = { value: cloneJsonValue(data.value) };
		} else if (data?.mode === "ascetDefault") {
			delete expanded.data;
		}
	}
	return expanded;
}

function canonicalizeSnapshotElement(value: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of canonicalSpecKeys) {
		if (Object.hasOwn(value, key)) result[key] = cloneJsonValue(value[key]);
	}
	if (!Object.hasOwn(result, "kind") && typeof value.type === "string") result.kind = value.type;
	if (!Object.hasOwn(result, "scope") && typeof value.displayScope === "string") result.scope = value.displayScope;
	if (!Object.hasOwn(result, "modelType") && typeof value.typeName === "string") result.modelType = value.typeName;
	return result;
}

function mergeNested(base: unknown, patch: unknown): unknown {
	if (!isRecord(base) || !isRecord(patch)) return cloneJsonValue(patch);
	return {
		...(cloneJsonValue(base) as Record<string, unknown>),
		...(cloneJsonValue(patch) as Record<string, unknown>),
	};
}

function mergeElement(base: Record<string, unknown>, patch: Record<string, unknown>): Record<string, unknown> {
	const merged: Record<string, unknown> = { ...(cloneJsonValue(base) as Record<string, unknown>) };
	for (const [key, value] of Object.entries(patch)) {
		if (key === "role") continue;
		if (key === "data" || key === "impl" || key === "physicalRange") {
			merged[key] = mergeNested(merged[key], value);
		} else {
			merged[key] = cloneJsonValue(value);
		}
	}
	return merged;
}

function inferRole(element: Record<string, unknown>): AscetElementRole | undefined {
	const kind = element.kind;
	const scope = element.scope;
	if (kind === "parameter" && scope === "exported") return "providerExportedParameter";
	if (kind === "parameter" && scope === "imported") return "consumerImportedParameter";
	if (kind === "parameter" && scope === "local" && isRecord(element.data) === false && isRecord(element.impl)) {
		return "localDependentParameter";
	}
	if (kind === "array") return "array";
	if (kind === "enumeration") return "enumeration";
	if (kind === "table") return "table";
	if (kind === "component") return "componentReference";
	if (kind === "variable" || kind === "parameter") return "standardPrimitive";
	return undefined;
}

function semanticError(message: string): Error {
	return new Error(message);
}

function validateRoleElement(element: Record<string, unknown>, role: AscetElementRole, complete: boolean): void {
	const name = typeof element.name === "string" ? element.name : "";
	if (name.length === 0) throw semanticError("Element name is required.");
	const kind = element.kind;
	const scope = element.scope;
	const requireMatch = (field: string, expected: string, actual: unknown): void => {
		if (actual !== undefined && actual !== expected)
			throw semanticError(`${name}: ${field} must be '${expected}' for role '${role}'.`);
		if (complete && actual === undefined) element[field] = expected;
	};
	if (role === "localDependentParameter" && Object.hasOwn(element, "data")) {
		throw semanticError(`${name}: localDependentParameter forbids 'data.value'.`);
	}
	if (role === "enumeration" && Object.hasOwn(element, "physicalRange")) {
		throw semanticError(`${name}: enumeration forbids physicalRange.`);
	}
	const roleContract = ascetElementRoleContract[role];
	for (const field of roleContract.forbiddenFields) {
		if (Object.hasOwn(element, field)) throw semanticError(`${name}: ${role} forbids '${field}'.`);
	}
	if (roleContract.requiredKind !== null) requireMatch("kind", roleContract.requiredKind, kind);
	if (roleContract.requiredScope !== null) requireMatch("scope", roleContract.requiredScope, scope);
	if (role === "enumeration") {
		if (complete && typeof element.enumerationPath !== "string")
			throw semanticError(`${name}: enumerationPath is required.`);
	} else if (role === "table") {
		if (complete && element.tableDimension !== "1d" && element.tableDimension !== "2d") {
			throw semanticError(`${name}: tableDimension must be '1d' or '2d'.`);
		}
	} else if (role === "componentReference") {
		if (complete && typeof element.referencedComponentPath !== "string") {
			throw semanticError(`${name}: referencedComponentPath is required.`);
		}
	} else if (
		role === "providerExportedParameter" ||
		role === "consumerImportedParameter" ||
		role === "localDependentParameter"
	) {
		if (complete && typeof element.modelType !== "string") throw semanticError(`${name}: modelType is required.`);
	} else if (role === "standardPrimitive") {
		if (complete && typeof kind !== "string") throw semanticError(`${name}: kind is required.`);
		if (complete && typeof element.modelType !== "string") throw semanticError(`${name}: modelType is required.`);
		if (complete && typeof scope !== "string") throw semanticError(`${name}: scope is required.`);
	}
}

function stripRole(element: Record<string, unknown>): Record<string, unknown> {
	const result: Record<string, unknown> = {};
	for (const key of canonicalSpecKeys) {
		if (Object.hasOwn(element, key)) result[key] = cloneJsonValue(element[key]);
	}
	return result;
}

export function requiresExplicitProjectContext(elements: readonly AscetElementInput[]): boolean {
	const isCustomFormula = (value: unknown): boolean => {
		if (typeof value !== "string") return false;
		const formula = value.trim();
		return formula.length > 0 && formula.toLowerCase() !== "ident";
	};
	return elements.some((element) => {
		const implementation = isRecord(element.implementation) ? element.implementation : undefined;
		const impl = isRecord(element.impl) ? element.impl : undefined;
		return isCustomFormula(implementation?.formula) || isCustomFormula(impl?.formula);
	});
}
export function normalizeAscetElementSpec(
	intent: AscetApplyElementIntent,
	inputs: readonly Record<string, unknown>[],
	liveElements: readonly Record<string, unknown>[],
): NormalizedElementSpecResult {
	const liveByName = new Map<string, Record<string, unknown>>();
	for (const live of liveElements) {
		const normalized = canonicalizeSnapshotElement(live);
		if (typeof normalized.name === "string") liveByName.set(normalized.name, normalized);
	}
	const output: Record<string, unknown>[] = [];
	const resolvedOperations: Array<{ name: string; operation: "create" | "patch" }> = [];
	const warnings: string[] = [];
	const errors: string[] = [];
	const seen = new Set<string>();
	for (const input of inputs) {
		const inputName = typeof input.name === "string" ? input.name : "";
		try {
			if (seen.has(inputName)) throw semanticError(`Duplicate element '${inputName}'.`);
			seen.add(inputName);
			const live = liveByName.get(inputName);
			const isExisting = live !== undefined;
			if (intent === "create" && isExisting)
				throw semanticError(`Element '${inputName}' already exists; create is not allowed.`);
			if (intent === "patch" && !isExisting)
				throw semanticError(`Element '${inputName}' does not exist; patch is not allowed.`);
			const inputRole = typeof input.role === "string" ? (input.role as AscetElementRole) : undefined;
			if (inputRole && !ascetElementRoleValues.includes(inputRole)) {
				throw semanticError(`${inputName}: unsupported role '${inputRole}'.`);
			}
			if (inputRole && (intent === "create" || intent === "restore" || (intent === "upsert" && !isExisting))) {
				validateRequiredCreateFields(input, inputRole);
			}
			const expandedInput = inputRole ? expandParameterDecisions(input, inputRole) : input;
			const base = isExisting ? live : {};
			const merged =
				intent === "patch" || (intent === "upsert" && isExisting)
					? mergeElement(base, expandedInput)
					: { ...(cloneJsonValue(expandedInput) as Record<string, unknown>) };
			const role = (inputRole ?? inferRole(merged)) as AscetElementRole | undefined;
			if (!role || !ascetElementRoleValues.includes(role))
				throw semanticError(`${inputName}: role is required or cannot be inferred from the live snapshot.`);
			validateRoleElement(merged, role, true);
			const normalized = stripRole(merged);
			output.push(normalized);
			resolvedOperations.push({ name: inputName, operation: isExisting ? "patch" : "create" });
			const requestedData = isRecord(input.data) ? input.data : undefined;
			if (role === "providerExportedParameter" && requestedData?.mode === "ascetDefault") {
				warnings.push(`${inputName}: data.mode=ascetDefault explicitly selects ASCET default data.`);
			} else if (role === "standardPrimitive" && !Object.hasOwn(input, "data")) {
				warnings.push(`${inputName}: data.value omitted; ASCET default data will be used.`);
			}
			const requestedImplementation = isRecord(input.implementation) ? input.implementation : undefined;
			if (
				(role === "providerExportedParameter" || role === "localDependentParameter") &&
				requestedImplementation?.mode === "ascetDefault"
			) {
				warnings.push(
					`${inputName}: implementation.mode=ascetDefault explicitly selects ASCET default implementation.`,
				);
			} else if (
				!Object.hasOwn(input, "impl") &&
				role !== "consumerImportedParameter" &&
				role !== "localDependentParameter" &&
				role !== "providerExportedParameter"
			) {
				warnings.push(`${inputName}: implementation omitted; ASCET default implementation will be used.`);
			}
		} catch (error) {
			errors.push(error instanceof Error ? error.message : String(error));
		}
	}
	if (errors.length > 0) {
		throw semanticError(`Element spec validation failed:\n${errors.map((error) => `- ${error}`).join("\n")}`);
	}
	return { spec: { elements: output }, resolvedIntent: intent, resolvedOperations, warnings };
}

export function inferAscetElementRoleFromSnapshot(element: Record<string, unknown>): AscetElementRole | undefined {
	return inferRole(canonicalizeSnapshotElement(element));
}

export function canonicalizeAscetElementSnapshot(element: Record<string, unknown>): Record<string, unknown> {
	return canonicalizeSnapshotElement(element);
}

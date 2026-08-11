import type { TSchema } from "typebox";

export const ascetSchemaDiscriminatorKeys = ["action", "mode", "phase", "intent", "scope", "objectKind"] as const;

export type AscetSchemaDiscriminatorKey = (typeof ascetSchemaDiscriminatorKeys)[number];

type JsonSchemaNode = {
	anyOf?: unknown[];
	oneOf?: unknown[];
	properties?: Record<string, JsonSchemaNode>;
	required?: unknown[];
	enum?: unknown[];
	const?: unknown;
};

export interface AscetPublicSchemaVariant {
	schema: TSchema;
	discriminators: Readonly<Partial<Record<AscetSchemaDiscriminatorKey, readonly string[]>>>;
	required: readonly string[];
}

export type AscetSchemaVariantSelection =
	| {
			status: "selected";
			variants: readonly AscetPublicSchemaVariant[];
	  }
	| {
			status: "unknown_discriminator";
			field: "action" | "mode";
			value: string;
			expected: readonly string[];
	  }
	| {
			status: "invalid_variant";
			field: Exclude<AscetSchemaDiscriminatorKey, "action">;
			value: string;
			expected: readonly string[];
	  };

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function flattenSchemaVariants(schema: unknown): TSchema[] {
	if (!isRecord(schema)) {
		return [];
	}
	const unions = [
		...(Array.isArray(schema.anyOf) ? schema.anyOf : []),
		...(Array.isArray(schema.oneOf) ? schema.oneOf : []),
	];
	if (unions.length === 0) {
		return [schema as TSchema];
	}
	return unions.flatMap((variant) => flattenSchemaVariants(variant));
}

function stringValues(schema: JsonSchemaNode | undefined): string[] {
	if (!schema) {
		return [];
	}
	const values = [
		...(Array.isArray(schema.enum) ? schema.enum : []),
		...(typeof schema.const === "string" ? [schema.const] : []),
	];
	return [...new Set(values.filter((value): value is string => typeof value === "string"))];
}

function requiredFields(schema: JsonSchemaNode): string[] {
	return Array.isArray(schema.required)
		? schema.required.filter((value): value is string => typeof value === "string")
		: [];
}

function toPublicSchemaVariant(schema: TSchema): AscetPublicSchemaVariant {
	const node = schema as JsonSchemaNode;
	const properties = node.properties ?? {};
	const discriminators: Partial<Record<AscetSchemaDiscriminatorKey, readonly string[]>> = {};
	for (const key of ascetSchemaDiscriminatorKeys) {
		const values = stringValues(properties[key]);
		if (values.length > 0) {
			discriminators[key] = values;
		}
	}
	return { schema, discriminators, required: requiredFields(node) };
}

export function listAscetPublicSchemaVariants(schema: TSchema): AscetPublicSchemaVariant[] {
	return flattenSchemaVariants(schema).map(toPublicSchemaVariant);
}

function sortedUnique(values: readonly string[]): string[] {
	return [...new Set(values)].sort();
}

function expectedValues(variants: readonly AscetPublicSchemaVariant[], field: AscetSchemaDiscriminatorKey): string[] {
	return sortedUnique(variants.flatMap((variant) => variant.discriminators[field] ?? []));
}

function variantsMatching(
	variants: readonly AscetPublicSchemaVariant[],
	field: AscetSchemaDiscriminatorKey,
	value: string,
): AscetPublicSchemaVariant[] {
	return variants.filter((variant) => variant.discriminators[field]?.includes(value) === true);
}

export function selectAscetPublicSchemaVariants(schema: TSchema, params: unknown): AscetSchemaVariantSelection {
	const variants = listAscetPublicSchemaVariants(schema);
	if (!isRecord(params)) {
		return { status: "selected", variants };
	}

	let selected = variants;
	const primaryField =
		typeof params.action === "string" ? "action" : typeof params.mode === "string" ? "mode" : undefined;
	if (primaryField) {
		const primaryValue = params[primaryField] as string;
		const matching = variantsMatching(selected, primaryField, primaryValue);
		if (matching.length === 0) {
			return {
				status: "unknown_discriminator",
				field: primaryField,
				value: primaryValue,
				expected: expectedValues(selected, primaryField),
			};
		}
		selected = matching;
	}

	for (const field of ascetSchemaDiscriminatorKeys) {
		if (field === primaryField || field === "action") {
			continue;
		}
		const value = params[field];
		const declared = selected.filter((variant) => (variant.discriminators[field]?.length ?? 0) > 0);
		if (typeof value === "string" && declared.length > 0) {
			const matching = variantsMatching(selected, field, value);
			if (matching.length === 0) {
				return {
					status: "invalid_variant",
					field: field as Exclude<AscetSchemaDiscriminatorKey, "action">,
					value,
					expected: expectedValues(selected, field),
				};
			}
			selected = matching;
			continue;
		}
		if (value === undefined && declared.length > 0) {
			const optional = selected.filter((variant) => !variant.required.includes(field));
			if (optional.length > 0) {
				selected = optional;
			}
		}
	}

	return { status: "selected", variants: selected };
}

export function describeAscetPublicSchemaVariant(variant: AscetPublicSchemaVariant): string | undefined {
	const parts = ascetSchemaDiscriminatorKeys.flatMap((key) =>
		(variant.discriminators[key] ?? []).map((value) => `${key}=${value}`),
	);
	return parts.length > 0 ? parts.join("|") : undefined;
}

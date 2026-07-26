import { type TSchema, type TUnsafe, Type } from "typebox";

type JsonRecord = Record<string, unknown>;
type OpenAiObjectJsonSchema<T> = TUnsafe<T> & { type: "object" };

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toOpenAiCompatibleSchema(value: unknown): unknown {
	if (Array.isArray(value)) {
		return value.map(toOpenAiCompatibleSchema);
	}
	if (!isRecord(value)) {
		return value;
	}
	const converted: JsonRecord = {};
	for (const [key, child] of Object.entries(value)) {
		if (key === "const") {
			continue;
		}
		converted[key] = toOpenAiCompatibleSchema(child);
	}
	if (Object.hasOwn(value, "const") && !Object.hasOwn(converted, "enum")) {
		converted.enum = [(value as { const: unknown }).const];
	}
	return converted;
}

function toOpenAiCompatibleObjectSchema(schema: unknown): TSchema & { type: "object" } {
	const converted = toOpenAiCompatibleSchema(schema);
	if (!isRecord(converted) || converted.type !== "object") {
		throw new Error("OpenAI tool parameters must be a JSON Schema object");
	}
	return converted as unknown as TSchema & { type: "object" };
}

export function openAiObjectSchema<T>(schema: unknown): OpenAiObjectJsonSchema<T> {
	return Type.Unsafe<T>(toOpenAiCompatibleObjectSchema(schema)) as OpenAiObjectJsonSchema<T>;
}

export function openAiObjectUnionSchema<T>(schemas: readonly unknown[]): OpenAiObjectJsonSchema<T> {
	return Type.Unsafe<T>({
		type: "object",
		anyOf: schemas.map(toOpenAiCompatibleSchema),
	} as TSchema & { type: "object" }) as OpenAiObjectJsonSchema<T>;
}

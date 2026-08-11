import { unwrapToolSuccessPayload } from "../tool-response-contract.ts";

export interface AscetEnumerationReadback {
	enumerators: string[];
}

export interface AscetEnumerationReadbackComparison {
	matches: boolean;
	expected: string[];
	actual: string[];
	mismatchIndex?: number;
}

function isRecord(value: unknown): value is Record<string, unknown> {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function normalizeEnumeratorList(value: unknown): string[] | undefined {
	if (!Array.isArray(value)) return undefined;
	const result: string[] = [];
	for (const entry of value) {
		if (typeof entry !== "string" || entry.trim().length === 0) return undefined;
		result.push(entry.trim());
	}
	return result;
}

function findPayload(value: unknown): Record<string, unknown> | undefined {
	const payload = unwrapToolSuccessPayload(value);
	if (!isRecord(payload)) return undefined;
	if (isRecord(payload.result)) return findPayload(payload.result);
	return payload;
}

export function parseAscetAutomaticEnumerationReadback(value: unknown): AscetEnumerationReadback | undefined {
	const payload = findPayload(value);
	const enumerators = normalizeEnumeratorList(payload?.enumerators);
	return enumerators ? { enumerators } : undefined;
}

export function parseAscetIndependentEnumerationReadback(value: unknown): AscetEnumerationReadback | undefined {
	const payload = findPayload(value);
	const typeDefinitionValue = payload?.typeDefinition ?? payload?.TypeDefinition;
	const typeDefinition = isRecord(typeDefinitionValue) ? typeDefinitionValue : undefined;
	const enumerators = normalizeEnumeratorList(typeDefinition?.enumerators ?? typeDefinition?.Enumerators);
	return enumerators ? { enumerators } : undefined;
}

export function compareAscetEnumerationReadback(
	expectedValue: readonly string[],
	actualValue: readonly string[],
): AscetEnumerationReadbackComparison {
	const expected = expectedValue.map((entry) => entry.trim());
	const actual = actualValue.map((entry) => entry.trim());
	const length = Math.max(expected.length, actual.length);
	for (let index = 0; index < length; index++) {
		if (expected[index] !== actual[index]) {
			return { matches: false, expected, actual, mismatchIndex: index };
		}
	}
	return { matches: true, expected, actual };
}

import assert from "node:assert/strict";
import { describe, test } from "node:test";
import {
	compareAscetEnumerationReadback,
	parseAscetAutomaticEnumerationReadback,
	parseAscetIndependentEnumerationReadback,
} from "./enumeration-readback.ts";

describe("Enumeration readback normalization", () => {
	test("normalizes automatic and independent readbacks to the same ordered names", () => {
		const automatic = parseAscetAutomaticEnumerationReadback({
			ok: true,
			result: { enumerators: [" OFF ", "ON"], verifyReadbackRequested: true, readbackVerified: true },
		});
		const independent = parseAscetIndependentEnumerationReadback({
			ok: true,
			result: { typeDefinition: { name: "Switch", enumerators: ["OFF", "ON"] } },
		});

		assert.deepEqual(automatic, { enumerators: ["OFF", "ON"] });
		assert.deepEqual(independent, { enumerators: ["OFF", "ON"] });
		assert.deepEqual(compareAscetEnumerationReadback(automatic!.enumerators, independent!.enumerators), {
			matches: true,
			expected: ["OFF", "ON"],
			actual: ["OFF", "ON"],
		});
	});

	test("parses the PascalCase TypeDefinition shape returned by the live Bridge", () => {
		assert.deepEqual(
			parseAscetIndependentEnumerationReadback({
				type: "response",
				protocolVersion: 1,
				ok: true,
				result: { TypeDefinition: { Name: "Switch", Enumerators: ["OFF", "ON"] } },
			}),
			{ enumerators: ["OFF", "ON"] },
		);
	});

	test("reports the first order mismatch without sorting either readback", () => {
		assert.deepEqual(compareAscetEnumerationReadback(["OFF", "ON"], ["ON", "OFF"]), {
			matches: false,
			expected: ["OFF", "ON"],
			actual: ["ON", "OFF"],
			mismatchIndex: 0,
		});
	});

	test("rejects missing, non-string, and empty enumerator evidence", () => {
		assert.equal(parseAscetAutomaticEnumerationReadback({ enumerators: ["OFF", 1] }), undefined);
		assert.equal(parseAscetIndependentEnumerationReadback({ typeDefinition: { enumerators: [""] } }), undefined);
		assert.equal(parseAscetIndependentEnumerationReadback({ typeDefinition: {} }), undefined);
	});
});

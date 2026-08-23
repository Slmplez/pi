import assert from "node:assert/strict";
import { describe, test } from "node:test";
import { inspectAiGeneratedMarkers } from "./ai-generated-marker.ts";

describe("AI-generated ESDL markers", () => {
	test("accepts unmarked user code", () => {
		const result = inspectAiGeneratedMarkers("value = input;\n");
		assert.equal(result.issue, undefined);
		assert.deepEqual(result.regions, []);
	});

	test("accepts a full-body marker at the first non-empty line", () => {
		const result = inspectAiGeneratedMarkers("\n//[AI-GEN]\nvalue = input;\n");
		assert.equal(result.issue, undefined);
		assert.deepEqual(result.regions, [{ startLine: 2, endLine: 4, closed: false }]);
	});

	test("accepts multiple non-overlapping local regions", () => {
		const result = inspectAiGeneratedMarkers(
			"before;\n//[AI-GEN]\nfirst;\n//[/AI-GEN]\nafter;\n//[AI-GEN]\nsecond;\n//[/AI-GEN]",
		);
		assert.equal(result.issue, undefined);
		assert.deepEqual(result.regions, [
			{ startLine: 2, endLine: 4, closed: true },
			{ startLine: 6, endLine: 8, closed: true },
		]);
	});

	test("accepts CRLF and indentation", () => {
		const result = inspectAiGeneratedMarkers("  //[AI-GEN]\r\n  value = input;\r\n  //[/AI-GEN]\r\n");
		assert.equal(result.issue, undefined);
		assert.equal(result.regions.length, 1);
	});

	test("rejects an unmatched end marker", () => {
		const result = inspectAiGeneratedMarkers("//[/AI-GEN]\nvalue = input;");
		assert.equal(result.issue?.code, "ai_marker_unmatched_end");
	});

	test("rejects an unclosed local marker that is not the first line", () => {
		const result = inspectAiGeneratedMarkers("before;\n//[AI-GEN]\nvalue = input;");
		assert.equal(result.issue?.code, "ai_marker_unclosed");
	});

	test("rejects nested markers", () => {
		const result = inspectAiGeneratedMarkers("//[AI-GEN]\nfirst;\n//[AI-GEN]\nsecond;\n//[/AI-GEN]\n//[/AI-GEN]");
		assert.equal(result.issue?.code, "ai_marker_nested");
	});

	test("rejects an empty local region", () => {
		const result = inspectAiGeneratedMarkers("//[AI-GEN]\n\n//[/AI-GEN]");
		assert.equal(result.issue?.code, "ai_marker_empty");
	});

	test("rejects markers with trailing code", () => {
		const result = inspectAiGeneratedMarkers("//[AI-GEN] value = input;");
		assert.equal(result.issue?.code, "ai_marker_invalid_line");
	});
});

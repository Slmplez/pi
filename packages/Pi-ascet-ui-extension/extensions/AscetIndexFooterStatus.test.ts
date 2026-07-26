import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAscetIndexFooterStatus } from "./AscetIndexFooterStatus.ts";

test("formatAscetIndexFooterStatus renders checking without a status file", () => {
	assert.equal(formatAscetIndexFooterStatus(undefined), "ASCET index: checking");
});

test("formatAscetIndexFooterStatus renders compact building progress", () => {
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "building",
			phase: "p0",
			elapsedMs: 8_420,
			areas: {
				components: { status: "ready", count: 119 },
				folders: { status: "ready", count: 70 },
				folder_items: { status: "ready", count: 211 },
				elements: { status: "building", count: 1260 },
				methods: { status: "pending" },
				component_refs: { status: "pending" },
				code_blocks: { status: "pending" },
			},
		}),
		"ASCET index: P0 8.4s [ok]cmp [ok]tree [..]elem [ ]meth [ ]refs [ ]code",
	);
});

test("formatAscetIndexFooterStatus renders stale and refreshing states", () => {
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "stale",
			staleAreas: ["element_decls", "element_refs", "text_code"],
		}),
		"ASCET index: stale [x]elem [x]refs [x]code",
	);
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "refreshing",
			refreshingArea: "text_code",
			elapsedMs: 2_100,
		}),
		"ASCET index: refreshing code 2.1s",
	);
});

test("formatAscetIndexFooterStatus renders ready and failed states", () => {
	assert.equal(
		formatAscetIndexFooterStatus({ state: "ready", totalDocs: 6300, elapsedMs: 15100 }),
		"ASCET index: ready 6.3k docs 15.1s",
	);
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "failed",
			currentArea: "element_decls",
			error: { code: "timeout" },
		}),
		"ASCET index: failed elem timeout",
	);
});

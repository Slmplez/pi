import assert from "node:assert/strict";
import { test } from "node:test";
import { formatAscetIndexFooterStatus, formatAscetIndexFooterStatusForTheme } from "./ascet-index-footer-status.ts";

test("formatAscetIndexFooterStatus renders checking without a status file", () => {
	assert.equal(formatAscetIndexFooterStatus(undefined), "ASCET Index ● checking");
});

test("formatAscetIndexFooterStatus renders one-lamp building progress", () => {
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
		"ASCET Index ● building p0 8.4s",
	);
});

test("formatAscetIndexFooterStatus renders stale and refreshing states", () => {
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "stale",
			staleAreas: ["element_decls", "element_refs", "text_code"],
		}),
		"ASCET Index ● stale elem,refs,code",
	);
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "refreshing",
			refreshingArea: "text_code",
			elapsedMs: 2_100,
		}),
		"ASCET Index ● refreshing code 2.1s",
	);
});

test("formatAscetIndexFooterStatus renders ready and failed states", () => {
	assert.equal(
		formatAscetIndexFooterStatus({ state: "ready", totalDocs: 6300, elapsedMs: 15100 }),
		"ASCET Index ● ready 6.3k 15.1s",
	);
	assert.equal(
		formatAscetIndexFooterStatus({
			state: "failed",
			currentArea: "element_decls",
			error: { code: "timeout" },
		}),
		"ASCET Index ● failed elem timeout",
	);
});

test("formatAscetIndexFooterStatusForTheme colors only the lamp state", () => {
	const theme = {
		fg: (color: string, text: string) => `<${color}>${text}</${color}>`,
	};
	assert.equal(
		formatAscetIndexFooterStatusForTheme({ state: "ready", totalDocs: 6300, elapsedMs: 15100 }, theme),
		"ASCET Index <success>● ready</success> 6.3k 15.1s",
	);
	assert.equal(
		formatAscetIndexFooterStatusForTheme(
			{ state: "stale", staleAreas: ["element_decls", "element_refs", "text_code"] },
			theme,
		),
		"ASCET Index <warning>● stale</warning> elem,refs,code",
	);
	assert.equal(
		formatAscetIndexFooterStatusForTheme(
			{ state: "failed", currentArea: "element_decls", error: { code: "timeout" } },
			theme,
		),
		"ASCET Index <error>● failed</error> elem timeout",
	);
});

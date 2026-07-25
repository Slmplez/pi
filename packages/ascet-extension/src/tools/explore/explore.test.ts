import assert from "node:assert/strict";
import { afterEach, describe, test } from "node:test";
import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { resetAscetSearchIndexForTest } from "../../search-index.ts";
import { ascetExploreTool } from "./definition.ts";
import { ascetExploreParameters } from "./schema.ts";

afterEach(() => {
	resetAscetSearchIndexForTest();
});

describe("ascet_explore phase 5 navigation redesign", () => {
	test("uses action-specific parameter schemas", () => {
		const variants =
			(ascetExploreParameters as { anyOf?: Array<{ properties?: Record<string, unknown> }> }).anyOf ?? [];
		const byAction = new Map<string, Record<string, unknown>>();
		for (const variant of variants) {
			const action = (variant.properties?.action as { const?: string } | undefined)?.const;
			if (action) {
				byAction.set(action, variant.properties ?? {});
			}
		}

		assert.deepEqual([...byAction.keys()].sort(), [
			"inspect_target",
			"list_components",
			"list_diagrams",
			"preview_children",
		]);
		assert.ok(byAction.get("list_components")?.folderPath);
		assert.equal(byAction.get("list_components")?.componentPath, undefined);
		assert.ok(byAction.get("list_diagrams")?.componentPath);
		assert.equal(byAction.get("list_diagrams")?.folderPath, undefined);
		assert.ok(byAction.get("preview_children")?.group);
		assert.equal(byAction.get("preview_children")?.diagramKind, undefined);
	});

	test("inspect_target returns an index summary and does not call live read_component_summary", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await ascetExploreTool.execute(
			"call-1",
			{ action: "inspect_target", componentPath: "DEMO\\PID", detailLevel: "topology" },
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd(), executeCli: makeExploreExecution(requests) },
		);

		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index", "warm_search_index"],
		);
		assert.deepEqual(
			requests.map((request) => request.args[request.args.indexOf("--partition") + 1]),
			["components", "element_decls"],
		);
		const rendered = result.content[0]?.text ?? "";
		assert.match(rendered, /quick_search_index/);
		assert.match(rendered, /Common\/Curve1D/);
		assert.doesNotMatch(rendered, /fullCode/);
	});

	test("list_diagrams uses the diagram metadata partition without live fallback", async () => {
		const requests: AscetCliRequest[] = [];

		const result = await ascetExploreTool.execute(
			"call-1",
			{ action: "list_diagrams", componentPath: "DEMO\\PID", diagramKind: "all" },
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd(), executeCli: makeExploreExecution(requests) },
		);

		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index"],
		);
		assert.equal(requests[0]?.args[requests[0].args.indexOf("--partition") + 1], "diagram_metadata");
		const rendered = result.content[0]?.text ?? "";
		assert.match(rendered, /quick_search_index/);
		assert.match(rendered, /Main/);
		assert.doesNotMatch(rendered, /live_fallback/);
		const payload = JSON.parse(rendered) as { component?: string; items?: Array<Record<string, unknown>> };
		assert.equal(payload.component, "DEMO/PID");
		assert.equal(payload.items?.[0]?.component, undefined);
	});

	test("list_diagrams reuses scoped diagram metadata index for the same component", async () => {
		const requests: AscetCliRequest[] = [];

		await ascetExploreTool.execute(
			"call-1",
			{ action: "list_diagrams", componentPath: "DEMO\\PID", diagramKind: "all" },
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd(), executeCli: makeExploreExecution(requests) },
		);
		const result = await ascetExploreTool.execute(
			"call-2",
			{ action: "list_diagrams", componentPath: "DEMO\\PID", diagramKind: "all" },
			new AbortController().signal,
			undefined,
			{ cwd: process.cwd(), executeCli: makeExploreExecution(requests) },
		);

		assert.deepEqual(
			requests.map((request) => request.args[1]),
			["warm_search_index"],
		);
		assert.match(result.content[0]?.text ?? "", /quick_search_index/);
		assert.match(result.content[0]?.text ?? "", /Main/);
	});
});

function makeExploreExecution(requests: AscetCliRequest[]) {
	return async (request: AscetCliRequest): Promise<AscetCliExecutionResult> => {
		requests.push(request);
		if (request.args[1] === "warm_search_index") {
			return okExecution(request, warmupPayload());
		}
		return okExecution(request, {
			componentPath: "DEMO\\PID",
			diagrams: [{ name: "block", kind: "block_diagram" }],
			fullCode: "this must not appear in inspect_target",
		});
	};
}

function warmupPayload() {
	const components = [
		{
			path: "DEMO\\PID",
			name: "PID",
			kind: "module",
			languageKind: "ESDL",
			displayName: "PID",
			parentPath: "DEMO",
			ownerKind: "folder",
			targetKind: "component",
			objectKind: "module",
		},
	];
	const entries = [
		{
			group: "primitive",
			componentPath: "DEMO\\PID",
			componentKind: "module",
			componentLanguageKind: "ESDL",
			elementName: "pidKp",
			elementKind: "cont",
			displayType: "cont",
			displayScope: "exported",
			referencedComponentPath: "",
			path: "DEMO\\PID::pidKp",
		},
		{
			group: "complex",
			componentPath: "DEMO\\PID",
			componentKind: "module",
			componentLanguageKind: "ESDL",
			elementName: "curve",
			elementKind: "component",
			displayType: "component",
			displayScope: "local",
			referencedComponentPath: "Common\\Curve1D",
			path: "DEMO\\PID::curve",
		},
	];
	return {
		operation: "warm_search_index",
		database: { name: "DemoDb", path: "C:\\ASCET\\DemoDb" },
		generatedAtUtc: "2026-07-25T00:00:00.000Z",
		elapsedMs: 2,
		scanComplete: true,
		components,
		entries,
		counts: { entries: entries.length, components: components.length },
		diagramMetadata: [
			{
				componentPath: "DEMO\\PID",
				name: "Main",
				kind: "block_diagram",
				path: "DEMO\\PID::Main",
				isDefault: true,
				supportsReadBlockDiagram: true,
			},
		],
	};
}

function okExecution(request: AscetCliRequest, payload: unknown): AscetCliExecutionResult {
	return {
		exitCode: 0,
		stdout: JSON.stringify({ ok: true, result: payload, error: null, meta: { mode: "exec" } }),
		stderr: "",
		timedOut: false,
		request,
	};
}

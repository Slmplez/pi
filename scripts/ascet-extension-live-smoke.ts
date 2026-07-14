import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

interface ToolResponse {
	content: Array<{ type: string; text?: string }>;
	details: {
		ok: boolean;
		[key: string]: unknown;
		outcome?: {
			status: string;
		};
		data?: {
			result?: Record<string, unknown>;
		};
		error?: {
			code: string;
			message: string;
		};
	};
}

const repoRoot = resolve(process.cwd());
const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const result = await loadExtensions([extensionPath], repoRoot);

if (result.errors.length > 0) {
	console.error(JSON.stringify({ ok: false, stage: "load_extension", errors: result.errors }, null, 2));
	process.exit(1);
}

const extension = result.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension) {
	console.error(JSON.stringify({ ok: false, stage: "find_extension", error: "ASCET extension was not loaded" }, null, 2));
	process.exit(1);
}

async function callTool(name: string, params: Record<string, unknown>) {
	const tool = extension?.tools.get(name)?.definition;
	if (!tool) {
		throw new Error(`Tool is not registered: ${name}`);
	}
	const response = (await tool.execute(
		`ascet-live-smoke-${name}`,
		params,
		new AbortController().signal,
		undefined,
		{ cwd: repoRoot },
	)) as ToolResponse;
	if (!response.details.ok) {
		throw new Error(`${name} failed: ${response.details.error?.code ?? "unknown"} ${response.details.error?.message ?? ""}`);
	}
	return response.details.data?.result ?? response.details.data ?? response.details;
}

async function callToolAllowingError(name: string, params: Record<string, unknown>) {
	const tool = extension?.tools.get(name)?.definition;
	if (!tool) {
		throw new Error(`Tool is not registered: ${name}`);
	}
	const response = (await tool.execute(
		`ascet-live-smoke-${name}`,
		params,
		new AbortController().signal,
		undefined,
		{ cwd: repoRoot },
	)) as ToolResponse;
	return response.details;
}

async function callWriteTool(name: string, params: Record<string, unknown>) {
	const tool = extension?.tools.get(name)?.definition;
	if (!tool) {
		throw new Error(`Tool is not registered: ${name}`);
	}
	const response = (await tool.execute(
		`ascet-live-smoke-${name}`,
		params,
		new AbortController().signal,
		undefined,
		{
			cwd: repoRoot,
			hasUI: true,
			ui: {
				confirm: async () => true,
			},
		},
	)) as ToolResponse;
	const outcome = response.details.outcome;
	if (!outcome || outcome.status !== "ok") {
		throw new Error(`${name} failed: ${response.details.error?.message ?? outcome?.status ?? "unknown"}`);
	}
	return outcome.data ?? response.details;
}

const statusTool = extension.tools.get("ascet_status")?.definition;
if (!statusTool) {
	throw new Error("Tool is not registered: ascet_status");
}
const status = (await statusTool.execute(
	"ascet-live-smoke-status",
	{},
	new AbortController().signal,
	undefined,
	{ cwd: repoRoot },
)) as ToolResponse;
if (!status.details.ok) {
	throw new Error("ascet_status reported unavailable ASCET runtime");
}

const schedulerBefore = await callTool("ascet_scheduler_status", { format: "json" });
const capabilities = await callTool("ascet_capabilities", { family: "read", operationQuery: "component_code" });
const components = await callTool("ascet_explore", { action: "list_components", folderPath: "DEMO", limit: 2 });
const componentSearch = await callTool("ascet_search", {
	action: "search_components",
	query: "PID",
	scopePath: "DEMO",
	match: "exact",
	limit: 5,
});
const search = await callTool("ascet_search", {
	action: "search_elements",
	query: "pid_kp",
	componentPath: "DEMO\\PID",
	match: "exact",
	limit: 5,
});
const occurrences = await callTool("ascet_search", {
	action: "search_occurrences",
	query: "pid_kp",
	target: "element",
	scopePath: "DEMO",
	match: "exact",
	limit: 5,
});
const resolved = await callTool("ascet_search", {
	action: "resolve_component",
	query: "PID",
	scopePath: "DEMO",
	match: "exact",
	limit: 10,
});
const summary = await callTool("ascet_explore", { action: "inspect_target", componentPath: "DEMO\\PID" });
const children = await callTool("ascet_explore", { action: "preview_children", componentPath: "DEMO\\PID", group: "methods" });
const method = await callTool("ascet_read", { action: "read", componentPath: "DEMO\\PID", methodName: "calc" });
const code = await callTool("ascet_read", { action: "read_code", componentPath: "DEMO\\PID", methodName: "calc" });
const diagrams = await callTool("ascet_explore", { action: "list_diagrams", componentPath: "DEMO\\PID" });
const blockDiagram = await callToolAllowingError("ascet_read", {
	action: "read_block_diagram",
	componentPath: "DEMO\\PID",
	diagramName: "Main",
});
if (!blockDiagram.ok && blockDiagram.error?.code !== "ascet_block_diagram_surface_not_supported") {
	throw new Error(
		`ascet_read.read_block_diagram expected ok or unsupported text ESDL surface, got: ${blockDiagram.error?.code ?? "ok"}`,
	);
}
const refs = await callTool("ascet_reference", { action: "element_refs", componentPath: "DEMO\\PID", elementName: "pid_kp" });
const diff = await callTool("ascet_diff", {
	action: "diff_component_snapshot",
	leftPath: "DEMO\\PID",
	rightPath: "DEMO\\PID",
	changesOnly: true,
});
const verify = await callTool("ascet_verify", {
	action: "readback",
	objectKind: "class",
	componentPath: "DEMO\\PID",
});
const importExportMatch = await callTool("ascet_read", {
	action: "read_import_export_match",
	importerComponentPath: "DEMO\\Class_ESDL_1",
	exporterComponentPath: "DEMO\\Class_ESDL_2",
	elementName: "speed",
});
const importExportMatches = await callTool("ascet_read", {
	action: "read_import_export_matches",
	importerComponentPath: "DEMO\\Class_ESDL_1",
	exporterComponentPath: "DEMO\\Class_ESDL_2",
});
const dependencyPlan = await callTool("ascet_read", {
	action: "plan_element_dependency",
	targetPath: "DEMO\\DiscreteRiccatiSolver",
	elementName: "B01",
	targetKind: "component",
});
const dependencyDryRun = await callWriteTool("ascet_write", {
	action: "set_element_dependency",
	targetPath: "DEMO\\DiscreteRiccatiSolver",
	elementName: "B01",
	dependency: "dependent",
	targetKind: "component",
	dryRun: true,
	verifyReadback: true,
	executeWrite: true,
});
const schedulerAfter = await callTool("ascet_scheduler_status", { format: "json" });
const schedulerRecover = await callTool("ascet_scheduler_status", { action: "recover", format: "json" });

console.log(
	JSON.stringify(
		{
			ok: true,
			tools: {
				ascet_status: { mode: status.details.paths.mode, cliPath: status.details.paths.cliPath },
				ascet_scheduler_status_before: {
					scheduler: schedulerBefore.scheduler,
					cliLock: schedulerBefore.cliLock,
					operationHealth: schedulerBefore.operationHealth,
				},
				ascet_capabilities: { matches: capabilities.matches?.length, totalMatches: capabilities.totalMatches },
				ascet_explore_components: { counts: components.counts },
				ascet_search_components: { counts: componentSearch.counts },
				ascet_search_elements: { counts: search.counts },
				ascet_search_occurrences: { counts: occurrences.counts },
				ascet_search_resolve: { component: resolved.component },
				ascet_explore_summary: { counts: summary.counts, summary: summary.summary },
				ascet_explore_children: { selectedGroup: children.selectedGroup, counts: children.counts },
				ascet_read_method: { methodName: method.methodName },
				ascet_read_code: { methodName: code.methodName },
				ascet_explore_diagrams: { items: diagrams.items, filters: diagrams.filters },
				ascet_read_block_diagram: {
					ok: blockDiagram.ok,
					error: blockDiagram.error,
				},
				ascet_reference: { counts: refs.counts, summary: refs.summary },
				ascet_diff: { counts: diff.counts },
				ascet_verify: { counts: verify.counts, summary: verify.summary },
				ascet_read_import_export_match: {
					element: importExportMatch.element,
					summary: importExportMatch.summary,
				},
				ascet_read_import_export_matches: {
					count: importExportMatches.count,
					summary: importExportMatches.summary,
				},
				ascet_read_dependency_plan: {
					count: dependencyPlan.count,
					summary: dependencyPlan.summary,
				},
				ascet_write_dependency_dry_run: {
					ok: dependencyDryRun.ok,
					operationName: dependencyDryRun.result?.operationName,
					verification: dependencyDryRun.result?.verification,
				},
				ascet_scheduler_status_after: {
					scheduler: schedulerAfter.scheduler,
					cliLock: schedulerAfter.cliLock,
					operationHealth: schedulerAfter.operationHealth,
				},
				ascet_scheduler_recover: {
					recovery: schedulerRecover.recovery,
					scheduler: schedulerRecover.scheduler,
					cliLock: schedulerRecover.cliLock,
					operationHealth: schedulerRecover.operationHealth,
				},
			},
		},
		null,
		2,
	),
);

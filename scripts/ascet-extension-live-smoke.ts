import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

interface ToolResponse {
	content: Array<{ type: string; text?: string }>;
	details: {
		ok: boolean;
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
	return response.details.data?.result ?? response.details.data ?? {};
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

const catalog = await callTool("ascet_contract_catalog", {});
const folders = await callTool("ascet_list_folders", { rootPath: "DEMO", depth: 1 });
const components = await callTool("ascet_list_components", { folderPath: "DEMO", limit: 2 });
const componentSearch = await callTool("ascet_search_components", {
	query: "PID",
	scopePath: "DEMO",
	match: "exact",
	limit: 5,
});
const search = await callTool("ascet_search_elements", {
	query: "pid_kp",
	componentPath: "DEMO\\PID",
	match: "exact",
	limit: 5,
});
const occurrences = await callTool("ascet_search_occurrences", {
	query: "pid_kp",
	target: "element",
	scopePath: "DEMO",
	match: "exact",
	limit: 5,
});
const resolved = await callTool("ascet_resolve_component", {
	query: "PID",
	scopePath: "DEMO",
	match: "exact",
	limit: 10,
});
const summary = await callTool("ascet_read_component_summary", { componentPath: "DEMO\\PID" });
const children = await callTool("ascet_read_component_children", { componentPath: "DEMO\\PID", group: "methods" });
const methods = await callTool("ascet_list_methods", { componentPath: "DEMO\\PID" });
const method = await callTool("ascet_read_method_code", { componentPath: "DEMO\\PID", methodName: "calc" });
const formulas = await callTool("ascet_read_project_formulas", { projectPath: "DEMO\\Project" });
const diagrams = await callTool("ascet_list_diagrams", { componentPath: "DEMO\\PID" });
const blockDiagram = await callTool("ascet_read_block_diagram", { componentPath: "DEMO\\PID", diagramName: "Main" });
const refs = await callTool("ascet_read_element_refs", { componentPath: "DEMO\\PID", elementName: "pid_kp" });
const diff = await callTool("ascet_diff_component_snapshot", {
	leftComponentPath: "DEMO\\PID",
	rightComponentPath: "DEMO\\PID",
	changesOnly: true,
});
const verify = await callTool("ascet_verify_readback", {
	action: "readback",
	objectKind: "class",
	componentPath: "DEMO\\PID",
});

console.log(
	JSON.stringify(
		{
			ok: true,
			tools: {
				ascet_status: { mode: status.details.paths.mode, cliPath: status.details.paths.cliPath },
				ascet_contract_catalog: { counts: catalog.counts, families: catalog.families },
				ascet_list_folders: { rootPath: folders.rootPath, counts: folders.counts },
				ascet_list_components: { counts: components.counts },
				ascet_search_components: { counts: componentSearch.counts },
				ascet_search_elements: { counts: search.counts },
				ascet_search_occurrences: { counts: occurrences.counts },
				ascet_resolve_component: { component: resolved.component },
				ascet_read_component_summary: { counts: summary.counts, summary: summary.summary },
				ascet_read_component_children: { selectedGroup: children.selectedGroup, counts: children.counts },
				ascet_list_methods: { counts: methods.counts, methods: methods.methods },
				ascet_read_method_code: { methodName: method.methodName },
				ascet_read_project_formulas: {
					projectPath: formulas.ProjectPath ?? formulas.projectPath,
					formulas: formulas.Formulas?.length ?? formulas.formulas?.length,
				},
				ascet_list_diagrams: { items: diagrams.items, filters: diagrams.filters },
				ascet_read_block_diagram: {
					diagramName: blockDiagram.DiagramName ?? blockDiagram.diagramName,
					elements: blockDiagram.Elements?.length ?? blockDiagram.elements?.length,
					connections: blockDiagram.Connections?.length ?? blockDiagram.connections?.length,
				},
				ascet_read_element_refs: { counts: refs.counts, summary: refs.summary },
				ascet_diff_component_snapshot: { counts: diff.counts },
				ascet_verify_readback: { counts: verify.counts, summary: verify.summary },
			},
		},
		null,
		2,
	),
);

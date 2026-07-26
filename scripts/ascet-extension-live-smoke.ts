import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

interface ToolResponse {
	content: Array<{ type: string; text?: string }>;
	details: {
		ok?: boolean;
		[key: string]: unknown;
		outcome?: {
			status: string;
			data?: unknown;
		};
		data?: {
			result?: Record<string, unknown>;
		};
		error?: {
			code: string;
			message: string;
		};
		artifact?: unknown;
	};
}

type JsonRecord = Record<string, unknown>;

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
	const outcomeStatus = response.details.outcome?.status;
	const ok =
		(response.details.ok !== false && !response.details.error && response.details.data !== undefined) ||
		response.details.artifact !== undefined ||
		response.details.ok === true ||
		outcomeStatus === "ok" ||
		outcomeStatus === "preflight";
	if (!ok) {
		throw new Error(`${name} failed: ${response.details.error?.code ?? "unknown"} ${response.details.error?.message ?? ""}`);
	}
	return response.details.data?.result ?? response.details.data ?? response.details.outcome?.data ?? response.details.outcome ?? response.details;
}

function asRecord(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function findFirstComponentPath(value: unknown): string | undefined {
	const record = asRecord(value);
	if (record) {
		if (typeof record.path === "string") {
			return record.path;
		}
		if (typeof record.componentPath === "string") {
			return record.componentPath;
		}
	}
	if (Array.isArray(value)) {
		for (const item of value) {
			const match = findFirstComponentPath(item);
			if (match) {
				return match;
			}
		}
		return undefined;
	}
	if (record) {
		for (const entry of Object.values(record)) {
			const match = findFirstComponentPath(entry);
			if (match) {
				return match;
			}
		}
	}
	return undefined;
}

async function findSmokeComponentPath(): Promise<{ query: string; path: string; result: unknown }> {
	for (const query of ["AEB", "PID", "Class", "_", "a"]) {
		const result = await callTool("ascet_search", {
			action: "search_components",
			query,
			match: "contains",
			limit: 5,
		});
		const path = findFirstComponentPath(result);
		if (path) {
			return { query, path, result };
		}
	}
	throw new Error("ascet_search.search_components did not return any component for smoke queries.");
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
const capabilities = await callTool("ascet_capabilities", {
	action: "search_actions",
	query: "complete code",
	limit: 3,
});
const componentProbe = await findSmokeComponentPath();
const componentPath = componentProbe.path;
const resolved = await callTool("ascet_search", {
	action: "resolve_component",
	query: componentPath,
	match: "exact",
	limit: 10,
});
const summary = await callTool("ascet_explore", { action: "inspect_target", componentPath });
const children = await callTool("ascet_explore", { action: "preview_children", componentPath, group: "all" });
const diagrams = await callTool("ascet_explore", { action: "list_diagrams", componentPath });
const blockDiagram = await callToolAllowingError("ascet_read", {
	action: "read_block_diagram",
	componentPath,
	diagramName: "Main",
});
if (blockDiagram.error && blockDiagram.error.code !== "ascet_block_diagram_surface_not_supported") {
	throw new Error(
		`ascet_read.read_block_diagram expected ok or unsupported text ESDL surface, got: ${blockDiagram.error?.code ?? "ok"}`,
	);
}
const editable = await callTool("ascet_component_editable", { mode: "check", componentPath });
const diff = await callTool("ascet_diff", {
	action: "diff_component_snapshot",
	leftPath: componentPath,
	rightPath: componentPath,
	changesOnly: true,
});
const verify = await callTool("ascet_verify", {
	action: "readback",
	objectKind: "class",
	componentPath,
});
const writePreflight = await callTool("ascet_write", {
	action: "create_folder",
	folderPath: "__pi_ascet_live_smoke_preflight__",
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
				ascet_capabilities: { items: capabilities.items?.length, total: capabilities.total },
				ascet_search_components: {
					query: componentProbe.query,
					componentPath,
					counts: (componentProbe.result as { counts?: unknown }).counts,
				},
				ascet_search_resolve: { component: resolved.component },
				ascet_explore_summary: { counts: summary.counts, summary: summary.summary },
				ascet_explore_children: { selectedGroup: children.selectedGroup, counts: children.counts },
				ascet_explore_diagrams: { items: diagrams.items, filters: diagrams.filters },
				ascet_read_block_diagram: {
					ok: !blockDiagram.error,
					error: blockDiagram.error,
				},
				ascet_component_editable: { editable },
				ascet_diff: { counts: diff.counts },
				ascet_verify: { counts: verify.counts, summary: verify.summary },
				ascet_write_preflight: {
					status: (writePreflight as { status?: unknown }).status,
					nextStep: (writePreflight as { nextStep?: unknown }).nextStep,
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

import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

type JsonRecord = Record<string, unknown>;
type ComponentKind = "class" | "module" | "statemachine";

interface ToolResponse {
	content: Array<{ type: string; text?: string }>;
	details: Record<string, unknown> & {
		error?: { code?: string; message?: string };
		outcome?: { status?: string; data?: unknown };
	};
}

interface ComponentTarget {
	path: string;
	kind?: ComponentKind;
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const configuredComponentPath = process.env.ASCET_SMOKE_COMPONENT;
const configuredTreePath = process.env.ASCET_SMOKE_TREE_PREFIX;
const preflightFolderPath = process.env.ASCET_SMOKE_PREFLIGHT_FOLDER ?? "__pi_ascet_live_smoke_preflight__";
const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);

if (loadResult.errors.length > 0) {
	throw new Error(`ASCET extension load failed: ${JSON.stringify(loadResult.errors)}`);
}
const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension) throw new Error("ASCET extension was not loaded.");

function asRecord(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function parseContent(response: ToolResponse): unknown {
	const text = response.content.find((entry) => entry.type === "text")?.text;
	if (text === undefined) throw new Error("ASCET tool returned no text content.");
	try {
		return JSON.parse(text) as unknown;
	} catch {
		return text;
	}
}

function errorFrom(value: unknown): { code?: string; message?: string } | undefined {
	const error = asRecord(asRecord(value)?.error);
	return error
		? {
				code: typeof error.code === "string" ? error.code : undefined,
				message: typeof error.message === "string" ? error.message : undefined,
			}
		: undefined;
}

async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResponse> {
	const tool = extension.tools.get(name)?.definition;
	if (!tool) throw new Error(`Tool is not registered: ${name}`);
	return (await tool.execute(
		`ascet-live-smoke-${name}`,
		params,
		new AbortController().signal,
		undefined,
		{ cwd: ascetCwd },
	)) as ToolResponse;
}

async function callTool(name: string, params: Record<string, unknown>): Promise<{ payload: unknown; details: JsonRecord }> {
	const response = await executeTool(name, params);
	const payload = parseContent(response);
	const error = response.details.error ?? errorFrom(payload);
	if (error) throw new Error(`${name} failed: ${error.code ?? "unknown"} ${error.message ?? ""}`.trim());
	return { payload, details: response.details };
}

function itemRecords(payload: unknown): JsonRecord[] {
	const items = asRecord(payload)?.items;
	return Array.isArray(items) ? items.flatMap((item) => (asRecord(item) ? [asRecord(item)!] : [])) : [];
}

function stringField(record: JsonRecord, ...keys: string[]): string | undefined {
	for (const key of keys) {
		const value = record[key];
		if (typeof value === "string" && value.length > 0) return value;
	}
	return undefined;
}

function componentKind(record: JsonRecord): ComponentKind | undefined {
	const value = stringField(record, "kind", "type", "objectKind")?.toLowerCase();
	if (value === "class" || value === "module" || value === "statemachine") return value;
	if (value === "state machine" || value === "state_machine") return "statemachine";
	return undefined;
}

function componentFrom(items: readonly JsonRecord[], exactPath?: string): ComponentTarget | undefined {
	const normalizedExact = exactPath?.replaceAll("/", "\\").toLowerCase();
	for (const item of items) {
		const path = stringField(item, "path", "component", "componentPath");
		if (!path) continue;
		if (normalizedExact && path.replaceAll("/", "\\").toLowerCase() !== normalizedExact) continue;
		const kind = componentKind(item);
		if (kind || normalizedExact) return { path, kind };
	}
	return undefined;
}

const statusResponse = await executeTool("ascet_status", {});
if (statusResponse.details.installationOk !== true) {
	throw new Error(`ascet_status reported unavailable installation: ${JSON.stringify(statusResponse.details)}`);
}
const statusSummary = parseContent(statusResponse);
const schedulerBefore = await callTool("ascet_scheduler_status", { action: "status", format: "json" });
const capabilities = await callTool("ascet_capabilities", {
	action: "search_actions",
	query: "complete code",
	limit: 3,
});

const treeScopes = configuredComponentPath
	? [configuredComponentPath.split(/[\\/]/u).slice(0, -1).join("\\")]
	: [configuredTreePath, "DEMO", undefined];
let treePayload: unknown;
let selectedComponent: ComponentTarget | undefined;
let selectedTreePath: string | undefined;
for (const path of treeScopes) {
	const tree = await callTool("ascet_get", { action: "tree", ...(path ? { path } : {}), depth: path ? 5 : 2 });
	const candidate = componentFrom(itemRecords(tree.payload), configuredComponentPath);
	if (candidate) {
		treePayload = tree.payload;
		selectedComponent = candidate;
		selectedTreePath = path;
		break;
	}
}
if (!selectedComponent) {
	throw new Error("ascet_get.tree found no Class, Module, or StateMachine. Set ASCET_SMOKE_COMPONENT to an exact path.");
}

const componentName = selectedComponent.path.split(/[\\/]/u).at(-1) ?? selectedComponent.path;
const search = await callTool("ascet_search", { action: "search", mode: "comp", q: componentName, limit: 20 });
const summary = await callTool("ascet_read", { action: "read", componentPath: selectedComponent.path });
const editable = await callTool("ascet_edit", { mode: "check", componentPath: selectedComponent.path });
const diff = await callTool("ascet_diff", {
	action: "diff_component_snapshot",
	leftPath: selectedComponent.path,
	rightPath: selectedComponent.path,
	changesOnly: true,
	timeoutMs: 300_000,
});
const writePreview = await callTool("ascet_edit", {
	action: "create_folder",
	folderPath: preflightFolderPath,
	intent: "preview",
});
const schedulerAfter = await callTool("ascet_scheduler_status", { action: "status", format: "json" });

console.log(
	JSON.stringify(
		{
			ok: true,
			readOnly: true,
			ascetCwd,
			selectedTreePath,
			selectedComponent,
			checks: {
				status: { installationOk: true, summary: statusSummary },
				schedulerBefore: schedulerBefore.payload,
				capabilities: capabilities.payload,
				tree: treePayload,
				search: search.payload,
				readSummary: summary.payload,
				editability: editable.payload,
				diffSelf: diff.payload,
				writePreview: writePreview.payload,
				schedulerAfter: schedulerAfter.payload,
			},
		},
		null,
		2,
	),
);

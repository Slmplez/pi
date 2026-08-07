import { readFileSync } from "node:fs";
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
type ComponentKind = "class" | "module" | "statemachine";

interface AscetGetOutput {
	delivery: "inline" | "stored";
	items?: unknown[];
	observation?: {
		resultId: string;
		domain: string;
		format: "ndjson";
		dataPath: string;
		metaPath: string;
		itemCount: number;
	};
	coverage?: unknown;
	truncated?: boolean;
	source?: string;
}

const repoRoot = resolve(process.cwd());
// Keep the extension under test separate from the ASCET project/runtime it targets.
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const configuredComponentPath = process.env.ASCET_SMOKE_COMPONENT;
const treePathPrefix = process.env.ASCET_SMOKE_TREE_PREFIX ?? "PlatformLibrary\\Package";
const preflightFolderPath = process.env.ASCET_SMOKE_PREFLIGHT_FOLDER ?? "__pi_ascet_live_smoke_preflight__";
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

async function executeTool(name: string, params: Record<string, unknown>): Promise<ToolResponse> {
	const tool = extension?.tools.get(name)?.definition;
	if (!tool) {
		throw new Error(`Tool is not registered: ${name}`);
	}
	return (await tool.execute(
		`ascet-live-smoke-${name}`,
		params,
		new AbortController().signal,
		undefined,
		{ cwd: ascetCwd },
	)) as ToolResponse;
}

function assertToolSuccess(name: string, response: ToolResponse): void {
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
}

async function callTool(name: string, params: Record<string, unknown>): Promise<unknown> {
	const response = await executeTool(name, params);
	assertToolSuccess(name, response);
	return response.details.data?.result ?? response.details.data ?? response.details.outcome?.data ?? response.details.outcome ?? response.details;
}

async function callToolAllowingError(name: string, params: Record<string, unknown>) {
	return (await executeTool(name, params)).details;
}

function asRecord(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function getAscetGetOutput(response: ToolResponse): AscetGetOutput {
	const text = response.content.find((entry) => entry.type === "text")?.text;
	if (!text) {
		throw new Error("ascet_get did not return a text observation payload.");
	}
	const parsed = asRecord(JSON.parse(text));
	if (!parsed || (parsed.delivery !== "inline" && parsed.delivery !== "stored")) {
		throw new Error(`ascet_get returned an invalid observation payload: ${text}`);
	}
	return parsed as AscetGetOutput;
}

async function callAscetGet(params: Record<string, unknown>): Promise<AscetGetOutput> {
	const response = await executeTool("ascet_get", params);
	assertToolSuccess("ascet_get", response);
	return getAscetGetOutput(response);
}

function readObservationItems(output: AscetGetOutput): JsonRecord[] {
	if (output.delivery === "inline") {
		if (!Array.isArray(output.items)) {
			throw new Error("Inline ascet_get observation did not include items.");
		}
		return output.items.map((item, index) => {
			const record = asRecord(item);
			if (!record) {
				throw new Error(`Inline ascet_get item ${index} is not a JSON object.`);
			}
			return record;
		});
	}

	const observation = output.observation;
	if (!observation) {
		throw new Error("Stored ascet_get observation did not include file locations.");
	}
	const metadata = asRecord(JSON.parse(readFileSync(observation.metaPath, "utf8")));
	if (metadata?.resultId !== observation.resultId) {
		throw new Error(`Observation metadata does not match result '${observation.resultId}'.`);
	}
	const ndjson = readFileSync(observation.dataPath, "utf8").trim();
	if (!ndjson) {
		return [];
	}
	return ndjson.split(/\r?\n/u).map((line, index) => {
		const record = asRecord(JSON.parse(line));
		if (!record) {
			throw new Error(`Observation NDJSON item ${index} is not a JSON object.`);
		}
		return record;
	});
}

function grepObservationItems(output: AscetGetOutput, query: string): JsonRecord[] {
	const normalizedQuery = query.toLocaleLowerCase();
	return readObservationItems(output).filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(normalizedQuery));
}

function getString(record: JsonRecord, key: string): string | undefined {
	const value = record[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

function getComponentKind(item: JsonRecord): ComponentKind | undefined {
	const kind = getString(item, "kind");
	return kind === "class" || kind === "module" || kind === "statemachine" ? kind : undefined;
}

function getComponentFromTree(items: readonly JsonRecord[]): { path: string; kind: ComponentKind } | undefined {
	for (const item of items) {
		const path = getString(item, "path");
		const kind = getComponentKind(item);
		if (path && kind) {
			return { path, kind };
		}
	}
	return undefined;
}

function summarizeObservation(output: AscetGetOutput): JsonRecord {
	if (output.delivery === "inline") {
		return { delivery: output.delivery, itemCount: output.items?.length ?? 0 };
	}
	return {
		delivery: output.delivery,
		resultId: output.observation?.resultId,
		dataPath: output.observation?.dataPath,
		metaPath: output.observation?.metaPath,
		itemCount: output.observation?.itemCount,
	};
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
	{ cwd: ascetCwd },
)) as ToolResponse;
if (!status.details.installationOk) {
	throw new Error(`ascet_status reported unavailable ASCET installation: ${JSON.stringify(status.details)}`);
}

const schedulerBefore = await callTool("ascet_scheduler_status", { format: "json" });
const capabilities = await callTool("ascet_capabilities", {
	action: "search_actions",
	query: "complete code",
	limit: 3,
});
const tree = await callAscetGet({
	action: "tree",
	target: configuredComponentPath ? { path: configuredComponentPath } : { targetPathPrefix: treePathPrefix },
	traversal: configuredComponentPath ? { depth: 0 } : { depth: 2, maxFolders: 40, maxComponents: 40 },
	delivery: "stored",
});
const treeItems = readObservationItems(tree);
const component = getComponentFromTree(
	configuredComponentPath ? grepObservationItems(tree, configuredComponentPath) : treeItems,
);
if (!component) {
	throw new Error(
		configuredComponentPath
			? `ascet_get.tree did not resolve configured component '${configuredComponentPath}'.`
			: `ascet_get.tree found no Class, Module, or StateMachine below '${treePathPrefix}'. Set ASCET_SMOKE_COMPONENT to an exact path.`,
	);
}
const componentPath = component.path;
const elements = await callAscetGet({
	action: "elements",
	target: { path: componentPath },
	delivery: "stored",
});
const refs = await callAscetGet({
	action: "component_refs",
	target: { path: componentPath },
	delivery: "stored",
});
const elementItems = readObservationItems(elements);
const firstElementName = getString(elementItems[0] ?? {}, "path")?.split("::").at(-1);
const elementMatches = firstElementName ? grepObservationItems(elements, firstElementName) : [];
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
const editable = await callTool("ascet_edit", { mode: "check", componentPath });
const diff = await callTool("ascet_diff", {
	action: "diff_component_snapshot",
	leftPath: componentPath,
	rightPath: componentPath,
	changesOnly: true,
});
const verify = await callTool("ascet_verify", {
	action: "readback",
	objectKind: component.kind,
	componentPath,
});
const writePreflight = await callTool("ascet_edit", {
	action: "create_folder",
	folderPath: preflightFolderPath,
});
const schedulerAfter = await callTool("ascet_scheduler_status", { format: "json" });
const schedulerRecover = await callTool("ascet_scheduler_status", { action: "recover", format: "json" });

console.log(
	JSON.stringify(
		{
			ok: true,
			ascetCwd,
			tools: {
				ascet_status: { installationOk: status.details.installationOk },
				ascet_scheduler_status_before: schedulerBefore,
				ascet_capabilities: capabilities,
				ascet_get_tree: {
					observation: summarizeObservation(tree),
					selectedComponent: component,
				},
				ascet_get_elements: {
					observation: summarizeObservation(elements),
					piGrepRead: { firstElementName, matches: elementMatches.length },
				},
				ascet_get_component_refs: {
					observation: summarizeObservation(refs),
					piRead: { itemCount: readObservationItems(refs).length },
				},
				ascet_read_block_diagram: {
					ok: !blockDiagram.error,
					error: blockDiagram.error,
				},
				ascet_edit_check: { editable },
				ascet_diff: { diff },
				ascet_verify: { verify },
				ascet_edit_preflight: {
					folderPath: preflightFolderPath,
					status: (writePreflight as { status?: unknown }).status,
					nextStep: (writePreflight as { nextStep?: unknown }).nextStep,
				},
				ascet_scheduler_status_after: schedulerAfter,
				ascet_scheduler_recover: schedulerRecover,
			},
		},
		null,
		2,
	),
);

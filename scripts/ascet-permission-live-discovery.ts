import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";
import {
	formatAscetGetResult,
	runAscetGet,
	type AscetGetParams,
} from "../packages/ascet-extension/src/get.ts";

interface ObservationOutput {
	delivery: "inline" | "stored";
	items?: unknown[];
	observation?: { dataPath: string; metaPath: string; itemCount: number; resultId: string };
}

interface Candidate {
	path: string;
	kind: "class" | "module" | "statemachine";
	editable: boolean;
	previewStatus?: string;
	previewErrorCode?: string;
	diagramStatus?: "present" | "missing" | "unsupported" | "unknown";
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_PERMISSION_SMOKE_CWD ?? repoRoot);
const prefix = process.env.ASCET_PERMISSION_DISCOVERY_PREFIX ?? "DEMO";
const candidateLimit = Number.parseInt(process.env.ASCET_PERMISSION_DISCOVERY_LIMIT ?? "40", 10);
const probeMethod = process.env.ASCET_PERMISSION_DISCOVERY_METHOD ?? "__PiPermissionProbe__";
const outputRoot = resolve(
	process.env.ASCET_PERMISSION_DISCOVERY_OUTPUT ??
		join(repoRoot, "artifacts", "ascet-permission-discovery", new Date().toISOString().replaceAll(":", "-")),
);
const artifactRoot = join(outputRoot, "runtime-artifacts");
const env: Record<string, string | undefined> = {
	...process.env,
	PI_ASCET_EXTENSION_ARTIFACT_ROOT: artifactRoot,
	PI_ASCET_WRITE_CLASS: "read_only",
};

if (!Number.isInteger(candidateLimit) || candidateLimit < 1 || candidateLimit > 200) {
	throw new Error("ASCET_PERMISSION_DISCOVERY_LIMIT must be an integer from 1 through 200.");
}
mkdirSync(outputRoot, { recursive: true });
mkdirSync(artifactRoot, { recursive: true });

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readString(value: unknown, ...path: string[]): string | undefined {
	let current = value;
	for (const key of path) current = asRecord(current)?.[key];
	return typeof current === "string" ? current : undefined;
}

function details(response: unknown): Record<string, unknown> {
	const value = asRecord(asRecord(response)?.details);
	if (!value) throw new Error("Tool response did not contain details.");
	return value;
}

function outcome(response: unknown): Record<string, unknown> | undefined {
	return asRecord(details(response).outcome);
}

function textContent(response: unknown): string | undefined {
	const content = asRecord(response)?.content;
	if (!Array.isArray(content)) return undefined;
	for (const item of content) {
		const record = asRecord(item);
		if (record?.type === "text" && typeof record.text === "string") return record.text;
	}
	return undefined;
}

function parseObservation(response: unknown): ObservationOutput {
	const text = textContent(response);
	if (!text) throw new Error("ascet_get did not return observation text.");
	const parsed = asRecord(JSON.parse(text));
	if (!parsed || (parsed.delivery !== "inline" && parsed.delivery !== "stored")) {
		throw new Error(`ascet_get returned an invalid observation: ${text}`);
	}
	return parsed as unknown as ObservationOutput;
}

function observationItems(output: ObservationOutput): Array<Record<string, unknown>> {
	if (output.delivery === "inline") {
		return (output.items ?? []).flatMap((item) => {
			const record = asRecord(item);
			return record ? [record] : [];
		});
	}
	if (!output.observation) throw new Error("Stored observation omitted its artifact paths.");
	const metadata = asRecord(JSON.parse(readFileSync(output.observation.metaPath, "utf8")));
	if (metadata?.resultId !== output.observation.resultId) {
		throw new Error("Stored observation metadata does not match the response resultId.");
	}
	return readFileSync(output.observation.dataPath, "utf8")
		.split(/\r?\n/u)
		.filter(Boolean)
		.map((line) => {
			const record = asRecord(JSON.parse(line));
			if (!record) throw new Error("Stored observation item is not an object.");
			return record;
		});
}

function componentKind(record: Record<string, unknown>): Candidate["kind"] | undefined {
	const value = String(record.kind ?? record.type ?? "").toLocaleLowerCase();
	if (value.includes("state") && value.includes("machine")) return "statemachine";
	if (value.includes("module")) return "module";
	if (value.includes("class")) return "class";
	return undefined;
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);
if (loadResult.errors.length > 0) throw new Error(`ASCET extension failed to load: ${JSON.stringify(loadResult.errors)}`);
const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension) throw new Error("ASCET extension was not loaded.");
const signal = new AbortController().signal;
let callIndex = 0;

async function executeLegacyGet(params: Record<string, unknown>) {
	const typedParams = params as unknown as AscetGetParams;
	const result = await runAscetGet(typedParams, { cwd: ascetCwd, env, signal });
	return {
		content: [{ type: "text", text: formatAscetGetResult(typedParams, result) }],
		details: {
			outcome: result.ok
				? { status: "ok", verified: true, data: result.data }
				: { status: "error", error: result.error },
			data: result.data,
			raw: result,
			error: result.error,
		},
	};
}

async function executeTool(stage: string, toolName: string, params: Record<string, unknown>) {
	const tool = extension.tools.get(toolName)?.definition;
	if (!tool) throw new Error(`ASCET tool is not registered: ${toolName}`);
	const callNumber = ++callIndex;
	const response =
		toolName === "ascet_get"
			? await executeLegacyGet(params)
			: await tool.execute(
					`ascet-permission-discovery-${callNumber}`,
					params,
					signal,
					undefined,
					{ cwd: ascetCwd, env, hasUI: false },
				);
	writeFileSync(
		join(outputRoot, `${String(callNumber).padStart(3, "0")}-${stage.replace(/[^a-z0-9_.-]+/giu, "-")}.json`),
		`${JSON.stringify({ stage, request: { toolName, params }, response }, null, 2)}\n`,
		"utf8",
	);
	return response;
}

async function editable(path: string): Promise<boolean | undefined> {
	const response = await executeTool(`editable-${path}`, "ascet_edit", { mode: "check", componentPath: path });
	const value = outcome(response)?.data;
	return typeof value === "boolean" ? value : undefined;
}

async function previewMethod(
	path: string,
	kind: Candidate["kind"],
	methodKind: "abstract" | "process" | "action",
): Promise<{ status?: string; errorCode?: string; diagramExists?: boolean }> {
	const response = await executeTool(`preview-${path}-${methodKind}`, "ascet_edit", {
		action: "create_method",
		componentPath: path,
		componentKind: kind,
		methodName: probeMethod,
		methodKind,
		ifExists: "fail",
		intent: "preview",
	});
	const result = outcome(response);
	const rawResult = asRecord(asRecord(asRecord(details(response).raw)?.data)?.result);
	return {
		status: readString(result, "status"),
		errorCode: readString(result, "error", "code"),
		diagramExists: typeof rawResult?.diagramExists === "boolean" ? rawResult.diagramExists : undefined,
	};
}

const status = await executeTool("runtime-status", "ascet_status", {});
if (details(status).installationOk !== true) throw new Error("ASCET installation/live status is unavailable.");
const database = await executeTool("database-identity", "ascet_get", { action: "database_identity" });
if (!asRecord(details(database).data)) throw new Error("ASCET database identity is unavailable.");
const databaseText = textContent(database);
const liveDatabaseIdentity = databaseText
	? asRecord(asRecord(JSON.parse(databaseText))?.databaseIdentity)
	: undefined;
if (!liveDatabaseIdentity || typeof liveDatabaseIdentity.fingerprint !== "string") {
	throw new Error("ASCET database identity did not include a fingerprint.");
}
const treeResponse = await executeTool("tree", "ascet_get", {
	action: "tree",
	scope: "database",
	delivery: "stored",
});
const tree = parseObservation(treeResponse);
const treeItems = observationItems(tree);
const topLevelCounts: Record<string, number> = {};
for (const record of treeItems) {
	if (typeof record.path !== "string") continue;
	const topLevel = record.path.split("\\")[0];
	if (topLevel) topLevelCounts[topLevel] = (topLevelCounts[topLevel] ?? 0) + 1;
}
const normalizedPrefix = prefix.replaceAll("/", "\\").replace(/^\\+|\\+$/gu, "").toLocaleLowerCase();
const components = treeItems
	.flatMap((record) => {
		const path = typeof record.path === "string" ? record.path : undefined;
		const kind = componentKind(record);
		const normalizedPath = path?.replaceAll("/", "\\").replace(/^\\+/u, "").toLocaleLowerCase();
		return path && kind && (normalizedPath === normalizedPrefix || normalizedPath?.startsWith(`${normalizedPrefix}\\`))
			? [{ path, kind }]
			: [];
	})
	.sort((left, right) => {
		const priority: Record<Candidate["kind"], number> = { statemachine: 0, class: 1, module: 2 };
		return priority[left.kind] - priority[right.kind];
	})
	.slice(0, candidateLimit);

const inspected: Candidate[] = [];
let readOnlyComponent: Candidate | undefined;
let regressionComponent: Candidate | undefined;
let failureComponent: Candidate | undefined;
for (const component of components) {
	const isEditable = await editable(component.path);
	if (isEditable === undefined) continue;
	const candidate: Candidate = { ...component, editable: isEditable };
	if (!readOnlyComponent && !isEditable && component.kind === "class") {
		const preview = await previewMethod(component.path, component.kind, "abstract");
		candidate.previewStatus = preview.status;
		candidate.previewErrorCode = preview.errorCode;
		if (preview.status === "preflight") readOnlyComponent = { ...candidate };
	}
	if (component.kind === "statemachine" && (!regressionComponent || !failureComponent)) {
		const preview = await previewMethod(component.path, component.kind, "action");
		candidate.previewStatus = preview.status;
		candidate.previewErrorCode = preview.errorCode;
		candidate.diagramStatus = preview.diagramExists === true ? "present" : preview.diagramExists === false ? "missing" : "unknown";
		if (
			!regressionComponent &&
			candidate.diagramStatus === "present" &&
			preview.status === "error" &&
			preview.errorCode === "create_method_capability_not_supported"
		) {
			regressionComponent = { ...candidate };
		}
		if (!failureComponent && !isEditable && candidate.diagramStatus === "missing" && preview.status === "preflight") {
			failureComponent = { ...candidate };
		}
	}
	inspected.push(candidate);
	if (readOnlyComponent && regressionComponent && failureComponent) break;
}

const scheduler = await executeTool("scheduler-status", "ascet_scheduler_status", { action: "status", format: "json" });
const report = {
	ok: true,
	readOnly: true,
	ascetCwd,
	prefix,
	candidateLimit,
	database: details(database),
	tree: {
		delivery: tree.delivery,
		itemCount: tree.delivery === "inline" ? tree.items?.length ?? 0 : tree.observation?.itemCount ?? 0,
		observation: tree.observation,
	},
	selected: { readOnlyComponent, regressionComponent, failureComponent },
	databaseSafetyWarning: "Do not authorize writes until this fingerprint is confirmed to belong to a disposable database.",
	topLevelCounts,
	environmentSuggestion: {
		ASCET_PERMISSION_SMOKE_DATABASE_FINGERPRINT: liveDatabaseIdentity.fingerprint,
		ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT: readOnlyComponent?.path,
		ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT: regressionComponent?.path,
		ASCET_PERMISSION_SMOKE_REGRESSION_CODE: regressionComponent?.previewErrorCode,
		ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT: failureComponent?.path,
		ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT_KIND: failureComponent?.kind,
		ASCET_PERMISSION_SMOKE_FAILURE_METHOD_KIND: failureComponent ? "action" : undefined,
	},
	inspected,
	scheduler: details(scheduler),
};
writeFileSync(join(outputRoot, "summary.json"), `${JSON.stringify(report, null, 2)}\n`, "utf8");
console.log(JSON.stringify({ ...report, outputRoot }, null, 2));

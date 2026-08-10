import { mkdtempSync, readFileSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

type JsonRecord = Record<string, unknown>;

interface ToolResponse {
	content: Array<{ type: string; text?: string }>;
	details: {
		ok?: boolean;
		data?: { result?: unknown };
		error?: { message?: string };
		outcome?: {
			status: string;
			data?: unknown;
			error?: { message?: string };
			message?: string;
		};
	};
}

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
	source?: string;
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const enabled = process.env.ASCET_PROJECT_FORMULA_SMOKE === "1";
const cleanupOnly = process.env.ASCET_PROJECT_FORMULA_SMOKE_CLEANUP_ONLY === "1";
const projectPath = process.env.ASCET_PROJECT_FORMULA_SMOKE_PROJECT;
const formulaName = process.env.ASCET_PROJECT_FORMULA_SMOKE_FORMULA ?? "PiSmokeIdentity";

if (!enabled) {
	console.log(JSON.stringify({
		ok: true,
		skipped: true,
		reason: "Set ASCET_PROJECT_FORMULA_SMOKE=1 and ASCET_PROJECT_FORMULA_SMOKE_PROJECT to run.",
		ascetCwd,
	}, null, 2));
	process.exit(0);
}

if (!projectPath) {
	throw new Error("ASCET_PROJECT_FORMULA_SMOKE_PROJECT is required when ASCET_PROJECT_FORMULA_SMOKE=1.");
}

const tempDir = mkdtempSync(join(tmpdir(), "pi-ascet-project-formula-smoke-"));
const specFile = join(tempDir, "formulas.json");
writeFileSync(
	specFile,
	JSON.stringify({
		formulas: [{ name: formulaName, type: "identity", comment: "PI ASCET project formula smoke" }],
	}),
	"utf8",
);

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);
if (loadResult.errors.length > 0) {
	throw new Error(`ASCET extension failed to load: ${JSON.stringify(loadResult.errors)}`);
}

const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
const editTool = extension?.tools.get("ascet_edit")?.definition;
const getTool = extension?.tools.get("ascet_get")?.definition;
if (!editTool || !getTool) {
	throw new Error("ASCET edit/get tools are not registered");
}

const signal = new AbortController().signal;
const writeContext = {
	cwd: ascetCwd,
	hasUI: true,
	ui: { confirm: async () => true },
};

async function executeTool(toolName: string, params: Record<string, unknown>, ctx: Record<string, unknown>): Promise<ToolResponse> {
	const tool = extension?.tools.get(toolName)?.definition;
	if (!tool) {
		throw new Error(`ASCET tool is not registered: ${toolName}`);
	}
	const response = (await tool.execute(`ascet-project-formula-smoke-${toolName}`, params, signal, undefined, ctx)) as ToolResponse;
	const outcome = response.details.outcome;
	if (outcome) {
		if (outcome.status !== "ok" && outcome.status !== "preflight") {
			throw new Error(`${toolName} failed: ${outcome.error?.message ?? outcome.message ?? outcome.status}`);
		}
		return response;
	}
	if (response.details.ok === false || response.details.error || response.details.data === undefined) {
		throw new Error(`${toolName} failed: ${response.details.error?.message ?? "unknown"}`);
	}
	return response;
}

function toolData(response: ToolResponse): unknown {
	return response.details.outcome?.data ?? response.details.data?.result ?? response.details.data;
}

function asRecord(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function parseAscetGetOutput(response: ToolResponse): AscetGetOutput {
	const text = response.content.find((entry) => entry.type === "text")?.text;
	if (!text) {
		throw new Error("ascet_get did not return an observation payload.");
	}
	const parsed = asRecord(JSON.parse(text));
	if (!parsed || (parsed.delivery !== "inline" && parsed.delivery !== "stored")) {
		throw new Error(`ascet_get returned an invalid observation payload: ${text}`);
	}
	return parsed as AscetGetOutput;
}

function readObservationItems(output: AscetGetOutput): JsonRecord[] {
	if (output.delivery === "inline") {
		if (!Array.isArray(output.items)) {
			throw new Error("Inline formula observation did not contain items.");
		}
		return output.items.map((item, index) => {
			const record = asRecord(item);
			if (!record) {
				throw new Error(`Inline formula item ${index} is not a JSON object.`);
			}
			return record;
		});
	}

	const observation = output.observation;
	if (!observation) {
		throw new Error("Stored formula observation did not include file locations.");
	}
	const metadata = asRecord(JSON.parse(readFileSync(observation.metaPath, "utf8")));
	if (metadata?.resultId !== observation.resultId) {
		throw new Error(`Formula observation metadata does not match result '${observation.resultId}'.`);
	}
	const ndjson = readFileSync(observation.dataPath, "utf8").trim();
	if (!ndjson) {
		return [];
	}
	return ndjson.split(/\r?\n/u).map((line, index) => {
		const record = asRecord(JSON.parse(line));
		if (!record) {
			throw new Error(`Formula observation NDJSON item ${index} is not a JSON object.`);
		}
		return record;
	});
}

function grepObservationItems(output: AscetGetOutput, query: string): JsonRecord[] {
	const normalizedQuery = query.toLocaleLowerCase();
	return readObservationItems(output).filter((item) => JSON.stringify(item).toLocaleLowerCase().includes(normalizedQuery));
}

if (cleanupOnly) {
	const component = await executeTool(
		"ascet_edit",
		{ action: "delete_component", componentPath: projectPath, ifMissing: "ignore", executeWrite: true },
		writeContext,
	);
	console.log(JSON.stringify({
		ok: true,
		cleanupOnly: true,
		ascetCwd,
		projectPath,
		component: component.details.outcome,
		preservedParentFolder: projectPath.split("\\").slice(0, -1).join("\\"),
	}, null, 2));
	process.exit(0);
}

const preflight = await executeTool(
	"ascet_edit",
	{ action: "apply_project_formula", projectPath, specFile },
	writeContext,
);
const preflightData = toolData(preflight);
if (preflight.details.outcome?.status !== "preflight") {
	throw new Error(`Expected formula write preflight, got: ${JSON.stringify(preflight.details.outcome ?? preflightData)}`);
}

const applied = await executeTool(
	"ascet_edit",
	{ action: "apply_project_formula", projectPath, specFile, executeWrite: true },
	writeContext,
);
const formulas = parseAscetGetOutput(await executeTool(
	"ascet_get",
	{ action: "formulas", target: { path: projectPath }, delivery: "stored" },
	{ cwd: ascetCwd },
));
const matchingFormulas = grepObservationItems(formulas, formulaName);
const formula = matchingFormulas.find((item) => item.name === formulaName);
if (!formula) {
	throw new Error(`Formula '${formulaName}' was not present in ascet_get observation: ${JSON.stringify(matchingFormulas)}`);
}

console.log(JSON.stringify({
	ok: true,
	ascetCwd,
	projectPath,
	formulaName,
	specFile,
	preflight: preflight.details.outcome,
	applied: applied.details.outcome,
	getFormulas: {
		delivery: formulas.delivery,
		observation: formulas.observation,
		coverage: formulas.coverage,
		piGrepRead: formula,
	},
}, null, 2));

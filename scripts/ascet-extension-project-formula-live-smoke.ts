import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

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
const readTool = extension?.tools.get("ascet_read")?.definition;
if (!editTool || !readTool) {
	throw new Error("ASCET edit/read tools are not registered");
}

const signal = new AbortController().signal;
const writeContext = {
	cwd: ascetCwd,
	hasUI: true,
	ui: { confirm: async () => true },
};

async function executeTool(toolName: string, params: Record<string, unknown>, ctx: Record<string, unknown>) {
	const tool = extension?.tools.get(toolName)?.definition;
	if (!tool) {
		throw new Error(`ASCET tool is not registered: ${toolName}`);
	}
	const response = await tool.execute(`ascet-project-formula-smoke-${toolName}`, params, signal, undefined, ctx);
	const outcome = response.details?.outcome;
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

function toolData(response: { details: { outcome?: { data?: unknown }; data?: { result?: unknown } } }) {
	return response.details.outcome?.data ?? response.details.data?.result ?? response.details.data;
}

if (cleanupOnly) {
	const component = await executeTool(
		"ascet_edit",
		{ action: "delete_component", componentPath: projectPath, ifMissing: "ignore", verifyReadback: true, executeWrite: true },
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
	{ action: "apply_project_formula", projectPath, specFile, verifyReadback: true, executeWrite: true },
	writeContext,
);
const readback = await executeTool(
	"ascet_read",
	{ action: "read_project_formulas", projectPath },
	{ cwd: ascetCwd },
);
const readbackData = toolData(readback) as { formulas?: Array<{ name?: string }> } | undefined;
if (!readbackData?.formulas?.some((formula) => formula.name === formulaName)) {
	throw new Error(`Formula '${formulaName}' was not present in readback: ${JSON.stringify(readbackData)}`);
}

console.log(JSON.stringify({
	ok: true,
	ascetCwd,
	projectPath,
	formulaName,
	specFile,
	preflight: preflight.details.outcome,
	applied: applied.details.outcome,
	readback: readbackData,
}, null, 2));

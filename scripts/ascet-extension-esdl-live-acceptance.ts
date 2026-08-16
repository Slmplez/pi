import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

type JsonRecord = Record<string, unknown>;

interface EditOutcome {
	status?: unknown;
	error?: { code?: unknown; message?: unknown };
	message?: unknown;
	data?: unknown;
}

interface ToolResponse {
	details?: {
		outcome?: EditOutcome;
		verification?: { status?: unknown };
		error?: { code?: unknown; message?: unknown };
	};
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const enabled = process.env.ASCET_ESDL_ACCEPTANCE === "1";
const cleanupOnly = process.env.ASCET_ESDL_ACCEPTANCE_CLEANUP_ONLY === "1";
const autoCleanup = process.env.ASCET_ESDL_ACCEPTANCE_AUTO_CLEANUP !== "0";
const folderPath = process.env.ASCET_ESDL_ACCEPTANCE_FOLDER ?? "DEMO\\__pi_esdl_acceptance__";
const componentPath = `${folderPath}\\PiSmokeClass`;
const methodName = "calc";
const localParameter = "C_SmokeThreshold";

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_ESDL_ACCEPTANCE=1 after approving the disposable ASCET folder.",
				ascetCwd,
				folderPath,
				componentPath,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);
if (loadResult.errors.length > 0) {
	throw new Error(`ASCET extension failed to load: ${JSON.stringify(loadResult.errors)}`);
}
const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension?.tools.get("ascet_edit")?.definition) {
	throw new Error("ASCET edit tool must be registered.");
}

const signal = new AbortController().signal;
const writeContext = {
	cwd: ascetCwd,
	hasUI: true,
	ui: { confirm: async () => true },
};

async function executeEdit(params: JsonRecord): Promise<ToolResponse> {
	const tool = extension.tools.get("ascet_edit")?.definition;
	if (!tool) throw new Error("ASCET edit tool is not registered.");
	return (await tool.execute(
		"ascet-esdl-acceptance-edit",
		params,
		signal,
		undefined,
		writeContext,
	)) as ToolResponse;
}

function requireOutcome(response: ToolResponse, stage: string): EditOutcome {
	const outcome = response.details?.outcome;
	if (!outcome) throw new Error(`${stage} did not return an outcome: ${JSON.stringify(response.details)}`);
	return outcome;
}

function requireStatus(outcome: EditOutcome, expected: string, stage: string): void {
	if (outcome.status !== expected) {
		throw new Error(`${stage} expected status=${expected}, got ${JSON.stringify(outcome)}`);
	}
}

function requireVerified(response: ToolResponse, stage: string): void {
	if (response.details?.verification?.status !== "passed") {
		throw new Error(`${stage} did not prove automatic readback verification: ${JSON.stringify(response.details)}`);
	}
}

async function preflightAndWrite(params: JsonRecord): Promise<{ preflight: EditOutcome; write: EditOutcome }> {
	const preflightResponse = await executeEdit({ ...params, intent: "preview" });
	const preflight = requireOutcome(preflightResponse, `${String(params.action)} preflight`);
	requireStatus(preflight, "preflight", `${String(params.action)} preflight`);
	const writeResponse = await executeEdit({ ...params, intent: "apply" });
	const write = requireOutcome(writeResponse, `${String(params.action)} write`);
	requireStatus(write, "ok", `${String(params.action)} write`);
	requireVerified(writeResponse, `${String(params.action)} write`);
	return { preflight, write };
}

async function cleanupArtifacts(): Promise<{
	method: { preflight: EditOutcome; write: EditOutcome };
	component: { preflight: EditOutcome; write: EditOutcome };
	folder: { preflight: EditOutcome; write: EditOutcome };
}> {
	const method = await preflightAndWrite({
		action: "delete_method",
		componentPath,
		methodName,
		ifMissing: "ignore",
	});
	const component = await preflightAndWrite({
		action: "delete_component",
		componentPath,
		ifMissing: "ignore",
	});
	const folder = await preflightAndWrite({ action: "delete_folder", folderPath, ifMissing: "ignore" });
	return { method, component, folder };
}

if (cleanupOnly) {
	const cleanup = await cleanupArtifacts();
	console.log(JSON.stringify({ ok: true, cleanupOnly: true, ascetCwd, folderPath, componentPath, cleanup }, null, 2));
	process.exit(0);
}

const setup = {
	folder: await preflightAndWrite({ action: "create_folder", folderPath }),
	component: await preflightAndWrite({
		action: "create_component",
		componentPath,
		kind: "class",
		language: "ESDL",
		ifExists: "return-existing",
	}),
	method: await preflightAndWrite({
		action: "create_method",
		componentPath,
		componentKind: "class",
		methodName,
		methodKind: "abstract",
		ifExists: "return-existing",
	}),
	signature: await preflightAndWrite({
		action: "set_method_signature",
		componentPath,
		methodName,
		returnType: "cont",
		arguments: [{ name: "input", type: "cont", ifExists: "replace" }],
		ifReturnExists: "replace",
	}),
};

const element = await preflightAndWrite({
	action: "apply_element_spec",
	componentPath,
	elementIntent: "create",
	elements: [
		{
			role: "standardPrimitive",
			name: localParameter,
			kind: "parameter",
			modelType: "cont",
			scope: "local",
			unit: "",
			comment: "Fixed smoke threshold 1.0 defined by the ASCET ESDL acceptance fixture.",
			calibration: false,
			data: { value: 1 },
			physicalRange: { min: 0, max: 10 },
			impl: { valueType: "real32" },
		},
	],
});

const code = "// PI ASCET ESDL acceptance: consume the named local parameter.\nreturn input + C_SmokeThreshold;\n";
const methodCode = await preflightAndWrite({
	action: "set_method_code",
	componentPath,
	methodName,
	code,
});

const cleanup = autoCleanup ? await cleanupArtifacts() : undefined;
console.log(
	JSON.stringify(
		{
			ok: true,
			ascetCwd,
			folderPath,
			componentPath,
			methodName,
			implementationPlan: {
				scope: "featureScope on a disposable DEMO acceptance component",
				signalFlow: "input + C_SmokeThreshold -> return value",
				esdlPatch: code,
				localParameter: {
					name: localParameter,
					valueSource: "Acceptance fixture fixed value 1.0",
					modelType: "cont",
					unit: "",
					physicalRange: { min: 0, max: 10 },
					initialValue: 1,
					calibration: false,
					implementation: { valueType: "real32" },
					usagePoint: "calc return expression",
				},
			},
			setup,
			element,
			methodCode,
			cleanup,
		},
		null,
		2,
	),
);
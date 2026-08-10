import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

type JsonRecord = Record<string, unknown>;

interface VerificationDetails {
	status?: unknown;
}

interface EditOutcome {
	status?: unknown;
	data?: unknown;
	error?: { code?: unknown; message?: unknown };
	message?: unknown;
}

interface ChainStage {
	stage?: unknown;
	status?: unknown;
	readbackVerified?: unknown;
}

interface ChainOutcome extends EditOutcome {
	planId?: unknown;
	fingerprint?: unknown;
	stages?: ChainStage[];
}

interface ToolResponse {
	details?: {
		outcome?: EditOutcome | ChainOutcome;
		verification?: VerificationDetails;
		error?: { code?: unknown; message?: unknown };
	};
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const enabled = process.env.ASCET_PARAMETER_CHAIN_SMOKE === "1";
const cleanupOnly = process.env.ASCET_PARAMETER_CHAIN_SMOKE_CLEANUP_ONLY === "1";
const autoCleanup = process.env.ASCET_PARAMETER_CHAIN_SMOKE_AUTO_CLEANUP !== "0";
const folderPath = process.env.ASCET_PARAMETER_CHAIN_SMOKE_FOLDER ?? "DEMO\\__pi_parameter_chain_smoke__";
const providerPath = `${folderPath}\\PiSmokeProvider`;
const consumerPath = `${folderPath}\\PiSmokeConsumer`;
const providerParameter = "P_SmokeThreshold";
const localParameter = "C_SmokeThreshold";

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_PARAMETER_CHAIN_SMOKE=1 after approving the disposable ASCET folder.",
				ascetCwd,
				folderPath,
				providerPath,
				consumerPath,
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
if (!extension?.tools.get("ascet_edit")?.definition || !extension.tools.get("configure_parameter_dependency_chain")?.definition) {
	throw new Error("ASCET edit and dependency-chain tools must be registered.");
}

const signal = new AbortController().signal;
const writeContext = {
	cwd: ascetCwd,
	hasUI: true,
	ui: { confirm: async () => true },
};

async function executeTool(toolName: string, params: JsonRecord): Promise<ToolResponse> {
	const tool = extension.tools.get(toolName)?.definition;
	if (!tool) throw new Error(`ASCET tool is not registered: ${toolName}`);
	return (await tool.execute(
		`ascet-parameter-chain-smoke-${toolName}`,
		params,
		signal,
		undefined,
		writeContext,
	)) as ToolResponse;
}

function requireOutcome(response: ToolResponse, toolName: string): EditOutcome | ChainOutcome {
	const outcome = response.details?.outcome;
	if (!outcome) {
		throw new Error(`${toolName} did not return an outcome: ${JSON.stringify(response.details)}`);
	}
	return outcome;
}

function requireStatus(outcome: EditOutcome | ChainOutcome, expected: string, stage: string): void {
	if (outcome.status !== expected) {
		throw new Error(`${stage} expected status=${expected}, got ${JSON.stringify(outcome)}`);
	}
}

async function preflightAndWrite(params: JsonRecord): Promise<{ preflight: EditOutcome; write: EditOutcome }> {
	const preflightResponse = await executeTool("ascet_edit", params);
	const preflight = requireOutcome(preflightResponse, "ascet_edit");
	requireStatus(preflight, "preflight", `${String(params.action)} preflight`);

	const writeResponse = await executeTool("ascet_edit", { ...params, executeWrite: true });
	const write = requireOutcome(writeResponse, "ascet_edit");
	requireStatus(write, "ok", `${String(params.action)} write`);
	if (writeResponse.details?.verification?.status !== "passed") {
		throw new Error(
			`${String(params.action)} did not prove automatic readback verification: ${JSON.stringify(writeResponse.details?.verification)}`,
		);
	}
	return { preflight, write };
}

async function cleanupArtifacts(): Promise<{
	components: Array<{ componentPath: string; preflight: EditOutcome; write: EditOutcome }>;
	folder: { preflight: EditOutcome; write: EditOutcome };
}> {
	const components = [];
	for (const componentPath of [consumerPath, providerPath]) {
		const result = await preflightAndWrite({ action: "delete_component", componentPath, ifMissing: "ignore" });
		components.push({ componentPath, ...result });
	}
	const folder = await preflightAndWrite({ action: "delete_folder", folderPath, ifMissing: "ignore" });
	return { components, folder };
}

if (cleanupOnly) {
	const cleanup = await cleanupArtifacts();
	console.log(JSON.stringify({ ok: true, cleanupOnly: true, ascetCwd, folderPath, cleanup }, null, 2));
	process.exit(0);
}

const setup = {
	folder: await preflightAndWrite({ action: "create_folder", folderPath }),
	provider: await preflightAndWrite({
		action: "create_component",
		componentPath: providerPath,
		kind: "class",
		language: "ESDL",
		ifExists: "return-existing",
	}),
	consumer: await preflightAndWrite({
		action: "create_component",
		componentPath: consumerPath,
		kind: "class",
		language: "ESDL",
		ifExists: "return-existing",
	}),
};

const definition = {
	provider: {
		componentPath: providerPath,
		element: {
			role: "providerExportedParameter",
			name: providerParameter,
			modelType: "cont",
			unit: "",
			comment: "Fixed smoke value 1.0 defined by the ASCET acceptance fixture.",
			calibration: false,
			range: { mode: "physical", min: 0, max: 10 },
			data: { mode: "explicit", value: 1 },
			implementation: { mode: "ascetDefault" },
		},
	},
	consumer: {
		componentPath: consumerPath,
		element: {
			role: "consumerImportedParameter",
			name: providerParameter,
			modelType: "cont",
			unit: "",
		},
	},
	local: {
		componentPath: consumerPath,
		element: {
			role: "localDependentParameter",
			name: localParameter,
			modelType: "cont",
			unit: "",
			comment: "Consumer-local dependent smoke threshold.",
			calibration: false,
			range: { mode: "physical", min: 0, max: 10 },
			implementation: { mode: "ascetDefault" },
		},
	},
	dependency: {
		formula: providerParameter,
		formals: [providerParameter],
		bindingPolicy: "explicit",
		mappings: {
			[providerParameter]: { kind: "parameter", name: providerParameter },
		},
		variantPolicy: "default",
	},
};

const planResponse = await executeTool("configure_parameter_dependency_chain", { mode: "plan", ...definition });
const plan = requireOutcome(planResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(plan, "planned", "dependency-chain plan");
if (typeof plan.planId !== "string" || plan.planId.length === 0) {
	throw new Error(`Dependency-chain plan did not return planId: ${JSON.stringify(plan)}`);
}

const commitResponse = await executeTool("configure_parameter_dependency_chain", {
	mode: "commit",
	planId: plan.planId,
});
const commit = requireOutcome(commitResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(commit, "committed", "dependency-chain commit");
const committedStages = (commit.stages ?? []).filter((stage) => stage.status === "committed");
if (
	committedStages.length !== 4 ||
	committedStages.some((stage) => stage.readbackVerified !== true) ||
	new Set(committedStages.map((stage) => stage.stage)).size !== 4
) {
	throw new Error(`Dependency-chain commit did not prove four verified stages: ${JSON.stringify(commit.stages)}`);
}

const cleanup = autoCleanup ? await cleanupArtifacts() : undefined;
console.log(
	JSON.stringify(
		{
			ok: true,
			ascetCwd,
			folderPath,
			providerPath,
			consumerPath,
			parameterChain: `${providerParameter} -> ${providerParameter} -> ${localParameter}`,
			valueSource: "Acceptance fixture fixed value 1.0",
			setup,
			plan: {
				status: plan.status,
				planId: plan.planId,
				fingerprint: plan.fingerprint,
				stages: plan.stages,
			},
			commit,
			cleanup,
		},
		null,
		2,
	),
);
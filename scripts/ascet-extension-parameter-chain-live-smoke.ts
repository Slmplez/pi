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
	writesPerformed?: unknown;
	mutationStarted?: unknown;
	beforeStateHash?: unknown;
	afterStateHash?: unknown;
	stages?: ChainStage[];
	rollback?: { status?: unknown; verified?: unknown };
}

interface ToolResponse {
	details?: {
		outcome?: EditOutcome | ChainOutcome;
		data?: unknown;
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

const executeResponse = await executeTool("configure_parameter_dependency_chain", definition);
const execute = requireOutcome(executeResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(execute, "committed", "dependency-chain execute");
if (execute.mutationStarted !== true || execute.writesPerformed !== true) {
	throw new Error(`Dependency-chain execute did not report a real mutation: ${JSON.stringify(execute)}`);
}
if ((execute.stages ?? []).length !== 4 || (execute.stages ?? []).some((stage) => stage.readbackVerified !== true)) {
	throw new Error(`Dependency-chain execute did not prove four verified stages: ${JSON.stringify(execute.stages)}`);
}

const idempotentResponse = await executeTool("configure_parameter_dependency_chain", definition);
const idempotent = requireOutcome(idempotentResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(idempotent, "no_change", "dependency-chain idempotent repeat");
if (idempotent.mutationStarted !== false || idempotent.writesPerformed !== false) {
	throw new Error(`Idempotent repeat reported mutation: ${JSON.stringify(idempotent)}`);
}

const conflictingDefinition = structuredClone(definition);
conflictingDefinition.provider.element.comment = "Conflicting live-smoke definition that must not overwrite existing state.";
const conflictResponse = await executeTool("configure_parameter_dependency_chain", conflictingDefinition);
const conflict = requireOutcome(conflictResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(conflict, "rejected", "dependency-chain conflict");
if (conflict.mutationStarted !== false || conflict.writesPerformed !== false) {
	throw new Error(`Conflict did not preserve zero-mutation semantics: ${JSON.stringify(conflict)}`);
}
const afterConflictResponse = await executeTool("configure_parameter_dependency_chain", definition);
const afterConflict = requireOutcome(afterConflictResponse, "configure_parameter_dependency_chain") as ChainOutcome;
requireStatus(afterConflict, "no_change", "dependency-chain state after conflict");

const rollbackProviderParameter = "P_SmokeRollback";
const rollbackLocalParameter = "C_SmokeRollback";
const rollbackDefinition = structuredClone(definition);
rollbackDefinition.provider.element.name = rollbackProviderParameter;
rollbackDefinition.provider.element.comment = "Disposable rollback Provider Parameter.";
rollbackDefinition.consumer.element.name = rollbackProviderParameter;
rollbackDefinition.local.element.name = rollbackLocalParameter;
rollbackDefinition.local.element.comment = "Disposable rollback Local Parameter.";
rollbackDefinition.dependency.formula = rollbackProviderParameter;
rollbackDefinition.dependency.formals = [rollbackProviderParameter];
rollbackDefinition.dependency.mappings = {
	[rollbackProviderParameter]: { kind: "parameter", name: rollbackProviderParameter },
};
process.env.ASCET_PARAMETER_CHAIN_ENABLE_FAILURE_INJECTION = "1";
process.env.ASCET_PARAMETER_CHAIN_FAIL_AFTER_STAGE = "local";
let rolledBack: ChainOutcome;
try {
	const rollbackResponse = await executeTool("configure_parameter_dependency_chain", rollbackDefinition);
	rolledBack = requireOutcome(rollbackResponse, "configure_parameter_dependency_chain") as ChainOutcome;
} finally {
	delete process.env.ASCET_PARAMETER_CHAIN_ENABLE_FAILURE_INJECTION;
	delete process.env.ASCET_PARAMETER_CHAIN_FAIL_AFTER_STAGE;
}
requireStatus(rolledBack, "rolled_back", "dependency-chain injected rollback");
if (rolledBack.rollback?.status !== "passed" || rolledBack.rollback?.verified !== true) {
	throw new Error(`Injected rollback was not verified: ${JSON.stringify(rolledBack)}`);
}

async function requireElementAbsent(componentPath: string, elementName: string): Promise<unknown> {
	const response = await executeTool("ascet_get", {
		action: "elements",
		target: { path: componentPath },
		filters: { name: elementName },
		delivery: "inline",
	});
	const data = response.details?.data;
	if (JSON.stringify(data).includes(`"${elementName}"`)) {
		throw new Error(`Rollback left Element ${componentPath}/${elementName}: ${JSON.stringify(data)}`);
	}
	return data;
}
const rollbackReadback = {
	provider: await requireElementAbsent(providerPath, rollbackProviderParameter),
	imported: await requireElementAbsent(consumerPath, rollbackProviderParameter),
	local: await requireElementAbsent(consumerPath, rollbackLocalParameter),
};

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
			execute,
			idempotent,
			conflict,
			afterConflict,
			rolledBack,
			rollbackReadback,
			cleanup,
		},
		null,
		2,
	),
);
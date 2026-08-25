import { resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

type JsonRecord = Record<string, unknown>;

interface ToolResponse {
	content?: Array<{ type?: unknown; text?: unknown }>;
	details?: {
		outcome?: { status?: unknown; error?: { code?: unknown; message?: unknown } };
		verification?: { status?: unknown };
		mutationResult?: { verification?: { status?: unknown }; raw?: unknown };
		error?: { code?: unknown; message?: unknown };
	};
}

const repoRoot = resolve(process.cwd());
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const enabled = process.env.ASCET_PARAMETER_CHAIN_SMOKE === "1";
const cleanupOnly = process.env.ASCET_PARAMETER_CHAIN_SMOKE_CLEANUP_ONLY === "1";
const autoCleanup = process.env.ASCET_PARAMETER_CHAIN_SMOKE_AUTO_CLEANUP !== "0";
const suffix = process.env.ASCET_PARAMETER_CHAIN_SMOKE_SUFFIX ?? new Date().toISOString().replaceAll(/[-:.TZ]/gu, "");
const folderPath =
	process.env.ASCET_PARAMETER_CHAIN_SMOKE_FOLDER ?? `DEMO\\__pi_create_dependent_chain_${suffix}`;
const providerPath = `${folderPath}\\PiProvider`;
const consumerPath = `${folderPath}\\PiConsumer`;
const providerParameter = `P_PI_ChainTest_${suffix}`;
const localParameter = `C_PI_ChainTest_${suffix}`;

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_PARAMETER_CHAIN_SMOKE=1 to approve disposable live ASCET writes.",
				ascetCwd,
				folderPath,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);
if (loadResult.errors.length > 0) throw new Error(`ASCET extension load failed: ${JSON.stringify(loadResult.errors)}`);
const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension?.tools.get("ascet_edit")?.definition || !extension.tools.get("ascet_read")?.definition) {
	throw new Error("ascet_edit and ascet_read must be registered.");
}
if (extension.tools.get("configure_parameter_dependency_chain")?.definition) {
	throw new Error("Retired configure_parameter_dependency_chain must not be registered.");
}

const signal = new AbortController().signal;
let confirmations = 0;
let toolCallSequence = 0;
const context = {
	cwd: ascetCwd,
	hasUI: true,
	ui: {
		confirm: async () => {
			confirmations++;
			return true;
		},
	},
};

async function executeTool(toolName: string, params: JsonRecord): Promise<ToolResponse> {
	const tool = extension.tools.get(toolName)?.definition;
	if (!tool) throw new Error(`ASCET tool is not registered: ${toolName}`);
	return (await tool.execute(`ascet-create-chain-live-${toolName}-${++toolCallSequence}`, params, signal, undefined, context)) as ToolResponse;
}

function content(response: ToolResponse): JsonRecord {
	const text = response.content?.find((item) => item.type === "text")?.text;
	if (typeof text !== "string") throw new Error(`Tool response has no text content: ${JSON.stringify(response)}`);
	const value = JSON.parse(text) as unknown;
	if (value === null || typeof value !== "object" || Array.isArray(value)) {
		throw new Error(`Tool response is not a JSON object: ${text}`);
	}
	return value as JsonRecord;
}

function requireOutcome(response: ToolResponse, expected: string, stage: string): void {
	if (response.details?.outcome?.status !== expected) {
		throw new Error(`${stage} expected outcome=${expected}: ${JSON.stringify(response.details)}`);
	}
}

async function preflightAndWrite(params: JsonRecord): Promise<{ apply: JsonRecord }> {
	const applyResponse = await executeTool("ascet_edit", { ...params, intent: "apply" });
	requireOutcome(applyResponse, "ok", `${String(params.action)} apply`);
	if (
		applyResponse.details?.verification?.status !== "passed" &&
		applyResponse.details?.mutationResult?.verification?.status !== "passed"
	) {
		throw new Error(`${String(params.action)} apply did not pass automatic readback.`);
	}
	return { apply: content(applyResponse) };
}

async function cleanup(): Promise<JsonRecord> {
	const components = [];
	for (const componentPath of [consumerPath, providerPath]) {
		components.push(
			await preflightAndWrite({ action: "delete_component", componentPath, ifMissing: "ignore" }),
		);
	}
	const folder = await preflightAndWrite({ action: "delete_folder", folderPath, ifMissing: "ignore" });
	return { components, folder };
}

if (cleanupOnly) {
	console.log(JSON.stringify({ ok: true, cleanupOnly: true, folderPath, cleanup: await cleanup() }, null, 2));
	process.exit(0);
}

let cleanupAttempted = false;
let scenarioError: unknown;
try {
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

	function chainRequest(providerName: string, localName: string): JsonRecord {
		return {
			action: "create_dependent_chain",
			provider: {
				componentPath: providerPath,
				element: {
					name: providerName,
					modelType: "cont",
					unit: "",
					comment: "Disposable ASCET create_dependent_chain acceptance Provider.",
					calibration: false,
					range: { mode: "physical", min: 0, max: 10 },
					data: { mode: "explicit", value: 1 },
					implementation: {
						mode: "explicit",
						valueType: "uint16",
						memoryLocation: "Default",
						formula: "ident",
						limitAssignments: true,
					},
				},
			},
			consumer: {
				componentPath: consumerPath,
				importedElement: { name: providerName, modelType: "cont", unit: "" },
				localElement: {
					name: localName,
					modelType: "cont",
					unit: "",
					comment: "Disposable ASCET create_dependent_chain acceptance Local.",
					calibration: false,
					range: { mode: "physical", min: 0, max: 10 },
					implementation: {
						mode: "explicit",
						valueType: "uint16",
						memoryLocation: "Default",
						formula: "ident",
						limitAssignments: true,
					},
				},
			},
			binding: { formula: providerName, formal: providerName, variantPolicy: "default" },
		};
	}

	async function createProviderElement(name: string): Promise<JsonRecord> {
		return preflightAndWrite({
			action: "apply_element_spec",
			componentPath: providerPath,
			elementIntent: "create",
			elements: [
				{
					role: "providerExportedParameter",
					name,
					modelType: "cont",
					unit: "",
					comment: "Disposable ASCET create_dependent_chain acceptance Provider.",
					calibration: false,
					range: { mode: "physical", min: 0, max: 10 },
					data: { mode: "explicit", value: 1 },
					implementation: {
						mode: "explicit",
						valueType: "uint16",
						memoryLocation: "Default",
						formula: "ident",
						limitAssignments: true,
					},
				},
			],
		});
	}

	async function createConsumerElements(providerName: string, localName: string): Promise<JsonRecord> {
		return preflightAndWrite({
			action: "apply_element_spec",
			componentPath: consumerPath,
			elementIntent: "create",
			elements: [
				{ role: "consumerImportedParameter", name: providerName, modelType: "cont", unit: "" },
				{
					role: "localDependentParameter",
					name: localName,
					modelType: "cont",
					unit: "",
					comment: "Disposable ASCET create_dependent_chain acceptance Local.",
					calibration: false,
					range: { mode: "physical", min: 0, max: 10 },
					implementation: {
						mode: "explicit",
						valueType: "uint16",
						memoryLocation: "Default",
						formula: "ident",
						limitAssignments: true,
					},
				},
			],
		});
	}

	async function applyChangedChain(params: JsonRecord, stage: string): Promise<JsonRecord> {
		const response = await executeTool("ascet_edit", { ...params, intent: "apply" });
		requireOutcome(response, "ok", stage);
		const result = content(response);
		if (result.changed !== true || result.verified !== true) {
			throw new Error(`${stage} was not changed+verified: ${JSON.stringify(result)}`);
		}
		return result;
	}

	const chain = chainRequest(providerParameter, localParameter);
	const confirmationsBeforeApply = confirmations;
	const chainApplyResponse = await executeTool("ascet_edit", { ...chain, intent: "apply" });
	requireOutcome(chainApplyResponse, "ok", "create_dependent_chain apply");
	const chainApply = content(chainApplyResponse);
	if (chainApply.changed !== true || chainApply.verified !== true) {
		throw new Error(`Chain apply was not changed+verified: ${JSON.stringify(chainApply)}`);
	}
	if (confirmations !== confirmationsBeforeApply + 1) {
		throw new Error(`Chain apply expected exactly one confirmation, got ${confirmations - confirmationsBeforeApply}.`);
	}

	const independentReadResponse = await executeTool("ascet_read", {
		action: "read_dependent_chain",
		componentPath: consumerPath,
		dependentElement: localParameter,
		exporterComponentPath: providerPath,
	});
	const independentRead = content(independentReadResponse);
	if (independentRead.found !== true) {
		throw new Error(`Independent dependency-chain readback failed: ${JSON.stringify(independentRead)}`);
	}

	const confirmationsBeforeIdempotent = confirmations;
	const idempotentResponse = await executeTool("ascet_edit", { ...chain, intent: "apply" });
	requireOutcome(idempotentResponse, "ok", "create_dependent_chain idempotent apply");
	const idempotent = content(idempotentResponse);
	if (idempotent.changed !== false || idempotent.mutationStatus !== "no_op" || idempotent.verified !== true) {
		throw new Error(`Idempotent apply failed: ${JSON.stringify(idempotent)}`);
	}
	if (confirmations !== confirmationsBeforeIdempotent + 1) {
		throw new Error(`Idempotent apply expected one approval under the public apply-only contract, got ${confirmations - confirmationsBeforeIdempotent}.`);
	}

	const setOnlyProvider = `P_PI_SetOnly_${suffix}`;
	const setOnlyLocal = `C_PI_SetOnly_${suffix}`;
	const setOnlySetup = {
		provider: await createProviderElement(setOnlyProvider),
		consumer: await createConsumerElements(setOnlyProvider, setOnlyLocal),
	};
	const setOnlyRequest = chainRequest(setOnlyProvider, setOnlyLocal);
	const setOnlyApply = await applyChangedChain(setOnlyRequest, "create_dependent_chain set-only apply");

	const partialProvider = `P_PI_Partial_${suffix}`;
	const partialLocal = `C_PI_Partial_${suffix}`;
	const partialSetup = await createProviderElement(partialProvider);
	const partialRequest = chainRequest(partialProvider, partialLocal);
	const partialApply = await applyChangedChain(partialRequest, "create_dependent_chain partial apply");

	const conflictRequest = structuredClone(chain);
	const conflictProvider = conflictRequest.provider as { element: { comment: string } };
	conflictProvider.element.comment = "Conflicting definition that must not overwrite live state.";
	const conflictResponse = await executeTool("ascet_edit", { ...conflictRequest, intent: "apply" });
	const conflict = content(conflictResponse);
	const conflictError = conflict.error as { code?: unknown } | undefined;
	if (
		conflictResponse.details?.outcome?.status !== "error" ||
		conflict.status !== "error" ||
		conflictError?.code !== "element_conflict"
	) {
		throw new Error(`Conflict apply did not reject before mutation: ${JSON.stringify(conflictResponse)}`);
	}

	const dependencyConflictRequest = structuredClone(chain);
	const dependencyConflictBinding = dependencyConflictRequest.binding as { formula: string };
	dependencyConflictBinding.formula = `${providerParameter} + 1`;
	const dependencyConflictResponse = await executeTool("ascet_edit", { ...dependencyConflictRequest, intent: "apply" });
	const dependencyConflict = content(dependencyConflictResponse);
	const dependencyConflictError = dependencyConflict.error as { code?: unknown } | undefined;
	if (
		dependencyConflictResponse.details?.outcome?.status !== "error" ||
		dependencyConflict.status !== "error" ||
		dependencyConflictError?.code !== "dependency_conflict"
	) {
		throw new Error(`Dependency conflict apply did not reject before mutation: ${JSON.stringify(dependencyConflictResponse)}`);
	}
	const dependencyConflictReadbackResponse = await executeTool("ascet_edit", { ...chain, intent: "apply" });
	requireOutcome(dependencyConflictReadbackResponse, "ok", "dependency conflict readback");
	const dependencyConflictReadback = content(dependencyConflictReadbackResponse);
	if (
		dependencyConflictReadback.changed !== false ||
		dependencyConflictReadback.mutationStatus !== "no_op" ||
		dependencyConflictReadback.verified !== true
	) {
		throw new Error(`Dependency conflict overwrote live state: ${JSON.stringify(dependencyConflictReadback)}`);
	}

	const sameProvider = `P_PI_ConcurrentSame_${suffix}`;
	const sameLocal = `C_PI_ConcurrentSame_${suffix}`;
	const sameRequest = chainRequest(sameProvider, sameLocal);
	const sameResponses = await Promise.all([
		executeTool("ascet_edit", { ...sameRequest, intent: "apply" }),
		executeTool("ascet_edit", { ...sameRequest, intent: "apply" }),
	]);
	const sameConcurrent = sameResponses.map(content);
	if (!sameConcurrent.some((result) => result.status === "ok" && result.changed === true && result.verified === true)) {
		throw new Error(`Concurrent same-chain calls did not create one verified chain: ${JSON.stringify(sameConcurrent)}`);
	}
	if (
		sameConcurrent.some(
			(result) =>
				!(
					(result.status === "ok" && result.verified === true && ["applied", "no_op"].includes(result.mutationStatus as string)) ||
					(result.status === "error" && (result.error as { code?: unknown } | undefined)?.code === "target_state_changed")
				),
		)
	) {
		throw new Error(`Concurrent same-chain calls produced an unexpected outcome: ${JSON.stringify(sameConcurrent)}`);
	}
	const sameFinalResponse = await executeTool("ascet_edit", { ...sameRequest, intent: "apply" });
	requireOutcome(sameFinalResponse, "ok", "concurrent same-chain final readback");
	const sameFinal = content(sameFinalResponse);
	if (sameFinal.changed !== false || sameFinal.mutationStatus !== "no_op" || sameFinal.verified !== true) {
		throw new Error(`Concurrent same-chain final state is not exact: ${JSON.stringify(sameFinal)}`);
	}

	const differentRequests = [
		chainRequest(`P_PI_ConcurrentA_${suffix}`, `C_PI_ConcurrentA_${suffix}`),
		chainRequest(`P_PI_ConcurrentB_${suffix}`, `C_PI_ConcurrentB_${suffix}`),
	];
	const differentResponses = await Promise.all(
		differentRequests.map((request) => executeTool("ascet_edit", { ...request, intent: "apply" })),
	);
	const differentConcurrent = differentResponses.map((response, index) => {
		requireOutcome(response, "ok", `concurrent different-chain apply ${index + 1}`);
		return content(response);
	});
	if (differentConcurrent.some((result) => result.changed !== true || result.verified !== true)) {
		throw new Error(`Concurrent different-chain calls were not changed+verified: ${JSON.stringify(differentConcurrent)}`);
	}

	const rollbackProvider = `P_PI_Rollback_${suffix}`;
	const rollbackLocal = `C_PI_Rollback_${suffix}`;
	const rollbackRequest = chainRequest(rollbackProvider, rollbackLocal);
	process.env.ASCET_PARAMETER_CHAIN_ENABLE_FAILURE_INJECTION = "1";
	process.env.ASCET_PARAMETER_CHAIN_FAIL_AFTER_STAGE = "local";
	let rolledBack: JsonRecord;
	try {
		const rollbackResponse = await executeTool("ascet_edit", { ...rollbackRequest, intent: "apply" });
		rolledBack = content(rollbackResponse);
	} finally {
		delete process.env.ASCET_PARAMETER_CHAIN_ENABLE_FAILURE_INJECTION;
		delete process.env.ASCET_PARAMETER_CHAIN_FAIL_AFTER_STAGE;
	}
	if (rolledBack.outcome !== "failed" || rolledBack.status !== "rolled_back" || rolledBack.mutationStatus !== "rolled_back") {
		throw new Error(`Injected failure was not rolled back: ${JSON.stringify(rolledBack)}`);
	}

	async function requireElementAbsent(componentPath: string, elementName: string): Promise<string> {
		const response = await executeTool("ascet_read", { action: "read_element", componentPath, elementName });
		if (response.details?.error?.code !== "element_not_found") {
			throw new Error(`Rollback left ${componentPath}\\${elementName}: ${JSON.stringify(response)}`);
		}
		return "absent";
	}
	const rollbackReadback = {
		provider: await requireElementAbsent(providerPath, rollbackProvider),
		imported: await requireElementAbsent(consumerPath, rollbackProvider),
		local: await requireElementAbsent(consumerPath, rollbackLocal),
	};

	let cleanupResult: JsonRecord | undefined;
	if (autoCleanup) {
		cleanupAttempted = true;
		cleanupResult = await cleanup();
	}
	console.log(
		JSON.stringify(
			{
				ok: true,
				ascetCwd,
				folderPath,
				providerPath,
				consumerPath,
				chain: `${providerParameter} -> ${providerParameter} -> ${localParameter}`,
				confirmations,
				setup,
				apply: chainApply,
				independentRead,
				idempotent,
				setOnly: { setup: setOnlySetup, apply: setOnlyApply },
				partial: { setup: partialSetup, apply: partialApply },
				conflict,
				dependencyConflict,
				dependencyConflictReadback,
				concurrency: { same: sameConcurrent, sameFinal, different: differentConcurrent },
				rolledBack,
				rollbackReadback,
				cleanup: cleanupResult,
			},
			null,
			2,
		),
	);
} catch (error) {
	scenarioError = error;
	throw error;
} finally {
	if (autoCleanup && !cleanupAttempted) {
		try {
			await cleanup();
		} catch (cleanupError) {
			if (scenarioError === undefined) throw cleanupError;
			console.error(
				JSON.stringify(
					{
						ok: false,
						stage: "cleanup_after_failure",
						folderPath,
						cleanupError: cleanupError instanceof Error ? cleanupError.message : String(cleanupError),
					},
					null,
					2,
				),
			);
		}
	}
}

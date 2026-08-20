import { mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";

const repoRoot = resolve(process.cwd());
// Keep the extension under test separate from the ASCET project/runtime it targets.
const ascetCwd = resolve(process.env.ASCET_SMOKE_CWD ?? repoRoot);
const enabled = process.env.ASCET_WRITE_SMOKE === "1";
const cleanupOnly = process.env.ASCET_WRITE_SMOKE_CLEANUP_ONLY === "1";
const autoCleanup = process.env.ASCET_WRITE_SMOKE_AUTO_CLEANUP !== "0";
const suffix =
	process.env.ASCET_WRITE_SMOKE_SUFFIX ?? new Date().toISOString().replaceAll(/[-:.TZ]/gu, "");
const skipStateMachine = process.env.ASCET_WRITE_SMOKE_SKIP_STATE_MACHINE === "1";
const testEditabilitySet = process.env.ASCET_WRITE_SMOKE_TEST_EDITABILITY_SET === "1";
const componentPath =
	process.env.ASCET_WRITE_SMOKE_COMPONENT ?? `DEMO\\__pi_write_smoke_${suffix}\\PiSmoke`;
const folderPath = componentPath.split("\\").slice(0, -1).join("\\");
const methodName = process.env.ASCET_WRITE_SMOKE_METHOD ?? "calc";
const enumerationPath = `${folderPath}\\PiSmokeEnum`;
const modulePath = `${folderPath}\\PiSmokeModule`;
const stateMachinePath = `${folderPath}\\PiSmokeStateMachine`;
const moduleMethodName = "process";
const stateMachineMethodName = "trigger";

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_WRITE_SMOKE=1 to run the disposable ASCET write smoke.",
				ascetCwd,
				componentPath,
				methodName,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

const tempDir = mkdtempSync(join(tmpdir(), "pi-ascet-write-smoke-"));
process.once("exit", () => rmSync(tempDir, { recursive: true, force: true }));
const codeFile = join(tempDir, `${methodName}.esdl`);
writeFileSync(codeFile, "// PI ASCET write smoke\nreturn 0.0;\n", "utf8");

async function withStage<T>(stage: string, fn: () => Promise<T>): Promise<T> {
	try {
		return await fn();
	} catch (error) {
		throw new Error(`${stage}: ${error instanceof Error ? error.message : String(error)}`, { cause: error });
	}
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await withStage("load_extension", async () => {
	const result = await loadExtensions([extensionPath], repoRoot);
	if (result.errors.length > 0) {
		throw new Error(`ASCET extension failed to load: ${JSON.stringify(result.errors)}`);
	}
	return result;
});

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
	ui: {
		confirm: async () => true,
	},
};

type VerificationEvidence = {
	status?: unknown;
	verified?: unknown;
};

type OutcomeVerificationData = VerificationEvidence & {
	verificationStatus?: unknown;
	verification?: VerificationEvidence;
};

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return typeof value === "object" && value !== null && !Array.isArray(value)
		? value as Record<string, unknown>
		: undefined;
}

function readVerificationEvidence(value: unknown): VerificationEvidence | undefined {
	const record = asRecord(value);
	return record ? { status: record.status, verified: record.verified } : undefined;
}

function readOutcomeVerificationData(value: unknown): OutcomeVerificationData | undefined {
	const record = asRecord(value);
	return record
		? {
				verified: record.verified,
				verificationStatus: record.verificationStatus,
				verification: readVerificationEvidence(record.verification),
			}
		: undefined;
}

async function executeTool(toolName: string, params: Record<string, unknown>, ctx: Record<string, unknown>) {
	const tool = extension?.tools.get(toolName)?.definition;
	if (!tool) {
		throw new Error(`ASCET tool is not registered: ${toolName}`);
	}
	const response = await tool.execute(`ascet-write-smoke-${toolName}`, params, signal, undefined, ctx);
	const outcome = response.details?.outcome;
	if (outcome) {
		if (outcome.status !== "ok" && outcome.status !== "preflight") {
			throw new Error(`${toolName} failed: ${outcome.error?.message ?? outcome.message ?? outcome.status} ${JSON.stringify({ outcome, verification: response.details?.verification })}`);
		}
		const executedMutation =
			toolName === "ascet_edit" &&
			outcome.status === "ok" &&
			params.intent === "apply";
		if (executedMutation) {
			const verification = readVerificationEvidence(response.details?.verification);
			const mutationVerification = readVerificationEvidence(response.details?.mutationResult?.verification);
			const outcomeData = readOutcomeVerificationData(outcome.data);
			const verificationPassed =
				outcome.verified === true ||
				verification?.status === "passed" ||
				mutationVerification?.status === "passed" ||
				mutationVerification?.verified === true ||
				outcomeData?.verified === true ||
				outcomeData?.verificationStatus === "passed" ||
				outcomeData?.verification?.status === "passed" ||
				outcomeData?.verification?.verified === true;
			if (!verificationPassed) {
				throw new Error("ascet_edit did not prove automatic readback verification.");
			}
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

async function cleanupSmokeArtifacts() {
	const cleanup = [];
	for (const [action, params] of [
		["delete_method", { componentPath, methodName, ifMissing: "ignore" }],
		["delete_method", { componentPath: modulePath, methodName: moduleMethodName, ifMissing: "ignore" }],
		[
			"delete_method",
			{ componentPath: stateMachinePath, methodName: stateMachineMethodName, ifMissing: "ignore" },
		],
		["delete_component", { componentPath: stateMachinePath, ifMissing: "ignore" }],
		["delete_component", { componentPath: modulePath, ifMissing: "ignore" }],
		["delete_component", { componentPath: enumerationPath, ifMissing: "ignore" }],
		["delete_component", { componentPath, ifMissing: "ignore" }],
		["delete_folder", { folderPath, ifMissing: "ignore" }],
	] as const) {
		try {
			const response = await executeTool(
				"ascet_edit",
				{ action, ...params, intent: "apply" },
				writeContext,
			);
			cleanup.push({ action, outcome: response.details.outcome });
		} catch (error) {
			const message = error instanceof Error ? error.message : String(error);
			const missingTarget = ["component_not_found", "target_not_found", "method_not_found", "folder_not_found", "plan_target_identity_missing"].find(
				(code) => message.includes(code),
			);
			if (!missingTarget) throw error;
			cleanup.push({ action, skipped: missingTarget });
		}
	}
	return {
		operations: cleanup,
		removedFolder: folderPath,
	};
}

async function main() {
	if (cleanupOnly) {
		try {
			const cleanup = await withStage("cleanup", cleanupSmokeArtifacts);
			console.log(JSON.stringify({ ok: true, cleanupOnly: true, ascetCwd, componentPath, methodName, cleanup }, null, 2));
		} catch (error) {
			console.error(
				JSON.stringify(
					{
						ok: false,
						stage: "cleanup",
						componentPath,
						methodName,
						error: error instanceof Error ? error.message : String(error),
					},
					null,
					2,
				),
			);
			process.exitCode = 1;
		}
		return;
	}

	let scenario: Record<string, unknown> | undefined;
	let scenarioError: unknown;
	try {
		const createFolderResponse = await withStage("create_folder", () => executeTool(
			"ascet_edit",
			{ action: "create_folder", folderPath, intent: "apply" },
			writeContext,
		));
		const createComponentResponse = await withStage("create_component", () => executeTool(
			"ascet_edit",
			{
				action: "create_component",
				componentPath,
				kind: "class",
				language: "ESDL",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const editabilitySetResponse = testEditabilitySet ? await withStage("component_editable_set", () => executeTool(
			"ascet_edit",
			{ mode: "set", componentPath, intent: "apply" },
			writeContext,
		)) : undefined;
		const createMethodResponse = await withStage("create_method", () => executeTool(
			"ascet_edit",
			{
				action: "create_method",
				componentPath,
				componentKind: "class",
				methodName,
				methodKind: "abstract",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const signatureResponse = await withStage("set_method_signature", () => executeTool(
			"ascet_edit",
			{
				action: "set_method_signature",
				componentPath,
				methodName,
				returnType: "cont",
				arguments: [{ name: "input", type: "cont", ifExists: "replace" }],
				ifReturnExists: "replace",
				intent: "apply",
			},
			writeContext,
		));
		const elementSpecResponse = await withStage("apply_element_spec", () => executeTool(
			"ascet_edit",
			{
				action: "apply_element_spec",
				componentPath,
				intent: "apply",
				elementIntent: "create",
				elements: [
					{
						role: "standardPrimitive",
						name: "C_Smoke",
						kind: "parameter",
						modelType: "cont",
						scope: "local",
						data: { value: 0 },
						physicalRange: { min: -1, max: 1 },
						impl: { valueType: "real32" },
					},
				],
			},
			writeContext,
		));
		const createEnumerationResponse = await withStage("create_enumeration", () =>
			executeTool(
				"ascet_edit",
				{
					action: "create_component",
					componentPath: enumerationPath,
					kind: "enumeration",
					ifExists: "return-existing",
					intent: "apply",
				},
				writeContext,
			),
		);
		const enumeratorResponse = await withStage("set_enumerators", () =>
			executeTool(
				"ascet_edit",
				{
					action: "set_enumerators",
					componentPath: enumerationPath,
					enumerators: ["OFF", "ON", "ERROR"],
					intent: "apply",
				},
				writeContext,
			),
		);

		const createModuleResponse = await withStage("create_module", () => executeTool(
			"ascet_edit",
			{
				action: "create_component",
				componentPath: modulePath,
				kind: "module",
				language: "ESDL",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const createModuleMethodResponse = await withStage("create_module_method", () => executeTool(
			"ascet_edit",
			{
				action: "create_method",
				componentPath: modulePath,
				componentKind: "module",
				methodName: moduleMethodName,
				methodKind: "process",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const moduleCodeResponse = await withStage("set_module_code", () => executeTool(
			"ascet_edit",
			{
				action: "set_module_code",
				modulePath,
				operation: "set-method",
				methodName: moduleMethodName,
				code: "// PI ASCET module write smoke\n",
				intent: "apply",
			},
			writeContext,
		));
		const createStateMachineResponse = skipStateMachine ? undefined : await withStage("create_state_machine", () => executeTool(
			"ascet_edit",
			{
				action: "create_component",
				componentPath: stateMachinePath,
				kind: "statemachine",
				language: "ESDL",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const createStateMachineMethodResponse = skipStateMachine ? undefined : await withStage("create_state_machine_method", () => executeTool(
			"ascet_edit",
			{
				action: "create_method",
				componentPath: stateMachinePath,
				componentKind: "statemachine",
				methodName: stateMachineMethodName,
				methodKind: "trigger",
				ifExists: "return-existing",
				intent: "apply",
			},
			writeContext,
		));
		const stateMachineCodeResponse = skipStateMachine ? undefined : await withStage("set_state_machine_code", () => executeTool(
			"ascet_edit",
			{
				action: "set_state_machine_code",
				stateMachinePath,
				operation: "set-method",
				methodName: stateMachineMethodName,
				code: "// PI ASCET state machine write smoke\n",
				intent: "apply",
			},
			writeContext,
		));

		const writeResponse = await withStage("set_method_code", () => executeTool(
			"ascet_edit",
			{ action: "set_method_code", componentPath, methodName, codeFile, intent: "apply" },
			writeContext,
		));

		const readResponse = await withStage("read_method_code", () =>
			executeTool("ascet_read", { action: "read_code", componentPath, methodName }, { cwd: ascetCwd }),
		);
		scenario = {
			ok: true,
			ascetCwd,
			componentPath,
			methodName,
			codeFile,
			setup: {
				folder: createFolderResponse.details.outcome,
				component: createComponentResponse.details.outcome,
				editabilitySet: editabilitySetResponse?.details.outcome,
				method: createMethodResponse.details.outcome,
				signature: signatureResponse.details.outcome,
				elementSpec: elementSpecResponse.details.outcome,
				enumeration: createEnumerationResponse.details.outcome,
				enumerators: enumeratorResponse.details.outcome,
				module: createModuleResponse.details.outcome,
				moduleMethod: createModuleMethodResponse.details.outcome,
				moduleCode: moduleCodeResponse.details.outcome,
				stateMachine: createStateMachineResponse?.details.outcome,
				stateMachineMethod: createStateMachineMethodResponse?.details.outcome,
				stateMachineCode: stateMachineCodeResponse?.details.outcome,
			},
			write: writeResponse.details.outcome,
			readback: toolData(readResponse),
		};
	} catch (error) {
		scenarioError = error;
	}

	let cleanup: Awaited<ReturnType<typeof cleanupSmokeArtifacts>> | undefined;
	let cleanupError: unknown;
	if (autoCleanup) {
		try {
			cleanup = await cleanupSmokeArtifacts();
		} catch (error) {
			cleanupError = error;
		}
	}

	if (scenarioError !== undefined || cleanupError !== undefined || scenario === undefined) {
		console.error(
			JSON.stringify(
				{
					ok: false,
					stage: scenarioError !== undefined ? "scenario" : "cleanup",
					componentPath,
					methodName,
					error:
						scenarioError instanceof Error
							? scenarioError.message
							: scenarioError === undefined
								? "ASCET write smoke cleanup failed."
								: String(scenarioError),
					cleanup,
					cleanupError:
						cleanupError instanceof Error
							? cleanupError.message
							: cleanupError === undefined
								? undefined
								: String(cleanupError),
				},
				null,
				2,
			),
		);
		process.exitCode = 1;
		return;
	}

	console.log(JSON.stringify({ ...scenario, cleanup }, null, 2));
}

await main();

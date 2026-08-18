import { createHash } from "node:crypto";
import { existsSync, readFileSync, realpathSync } from "node:fs";
import { join, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { getAscetDatabaseIdentity } from "../packages/ascet-extension/src/get.ts";
import { runAscetCliJson, type AscetCliJsonResult } from "../packages/ascet-extension/src/cli.ts";
import { createAscetSchedulerStatusReport } from "../packages/ascet-extension/src/scheduler/status.ts";
import { unwrapToolSuccessPayload } from "../packages/ascet-extension/src/tool-response-contract.ts";
import { ascetEditTool } from "../packages/ascet-extension/src/tools/edit/definition.ts";
import { ascetGetTool } from "../packages/ascet-extension/src/tools/get/definition.ts";
import { ascetReadTool } from "../packages/ascet-extension/src/tools/read/definition.ts";
import {
	loadCampaignPlan,
	runCampaign,
	validateCampaignPlan,
	type ActionPlan,
	type ActionScenario,
	type ActionVariant,
	type CampaignInvoker,
	type CampaignPlan,
	type BridgeEvidence,
	type JsonRecord,
} from "./ascet-edit-live-campaign.ts";

interface LiveToolContext {
	cwd: string;
	env: Record<string, string | undefined>;
	hasUI: true;
	ui: { confirm: () => Promise<boolean> };
}

interface RunIdentity {
	runId: string;
	phaseId: string;
	caseId: string;
	attemptId: string;
	artifactRoot: string;
}

type ToolExecutor = (toolName: string, request: JsonRecord, context: LiveToolContext, signal: AbortSignal) => Promise<unknown>;

export interface LiveInvokerOptions {
	repoRoot: string;
	cwd: string;
	bridgePath: string;
	contractsPath?: string;
	outputRoot: string;
	toolExecutor?: ToolExecutor;
}

export interface SchedulerReadinessSnapshot {
	hostState: string;
	activeCount: number;
	queuedCount: number;
	cliLock: boolean;
	raw: unknown;
}

export interface DatabaseIdentityReadinessSnapshot {
	path: string;
	fingerprint: string;
	raw: unknown;
	bridge: BridgeEvidence;
}

export interface LiveReadinessSnapshot {
	cwd: string;
	planDatabasePath: string;
	bridgePath: string;
	planBridgeSha256: string;
	actualBridgeSha256: string;
	database: DatabaseIdentityReadinessSnapshot;
	scheduler: SchedulerReadinessSnapshot;
	verifiedAt: string;
}

export interface LiveReadinessDependencies {
	fileSha256?: (path: string) => string | undefined;
	canonicalPath?: (path: string) => string;
	schedulerProbe?: (env: Record<string, string | undefined>) => Promise<SchedulerReadinessSnapshot>;
	databaseIdentityProbe?: (options: {
		cwd: string;
		bridgePath: string;
		env: Record<string, string | undefined>;
	}) => Promise<DatabaseIdentityReadinessSnapshot>;
}

function asRecord(value: unknown): JsonRecord | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value) ? (value as JsonRecord) : undefined;
}

function safePart(value: string): string {
	return value.replaceAll(/[^A-Za-z0-9._=-]+/g, "_").replaceAll(/^_+|_+$/g, "") || "unnamed";
}

function fileSha256(path: string): string | undefined {
	if (!existsSync(path)) return undefined;
	return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function canonicalPath(path: string): string {
	const resolved = existsSync(path) ? realpathSync.native(path) : resolve(path);
	const normalized = resolved.replaceAll("/", "\\").replace(/[\\]+$/u, "");
	return process.platform === "win32" ? normalized.toLowerCase() : normalized;
}

function bridgePathFor(repoRoot: string, path: string): string {
	return resolve(repoRoot, path);
}

async function defaultSchedulerProbe(env: Record<string, string | undefined>): Promise<SchedulerReadinessSnapshot> {
	const report = await createAscetSchedulerStatusReport("status", { env });
	return {
		hostState: report.scheduler.hostState,
		activeCount: report.scheduler.activeCount,
		queuedCount: report.scheduler.queuedJobs.length,
		cliLock: report.cliLock.locked,
		raw: report,
	};
}

function identityPayload(result: AscetCliJsonResult): JsonRecord | undefined {
	return asRecord(unwrapToolSuccessPayload(result.data));
}

async function defaultDatabaseIdentityProbe(options: {
	cwd: string;
	bridgePath: string;
	env: Record<string, string | undefined>;
}): Promise<DatabaseIdentityReadinessSnapshot> {
	const result = await runAscetCliJson(["exec", "get_database_identity", "--request-json", "{}", "--json"], {
		cwd: options.cwd,
		cliPath: options.bridgePath,
		env: options.env,
		timeoutMs: 60_000,
		toolName: "ascet_live_readiness",
		commandId: "get_database_identity",
		jobKind: "read",
		resourceKey: "ascet.toolapi.global",
	});
	if (!result.ok) {
		throw new Error(`ASCET database identity probe failed: ${(result.error?.message ?? result.stderr) || "unknown error"}`);
	}
	const payload = identityPayload(result);
	const identity = payload ? getAscetDatabaseIdentity(payload) : undefined;
	if (!identity) throw new Error("ASCET database identity probe returned no canonical identity.");
	return {
		path: identity.path,
		fingerprint: identity.fingerprint,
		raw: result.data,
		bridge: { request: result.request, stdout: result.stdout, stderr: result.stderr, exitCode: result.exitCode ?? undefined },
	};
}

export async function assertLiveReadiness(
	plan: CampaignPlan,
	options: {
		repoRoot: string;
		cwd: string;
		env: Record<string, string | undefined>;
		dependencies?: LiveReadinessDependencies;
	},
): Promise<LiveReadinessSnapshot> {
	const expectedBridgeSha = plan.bridge.sha256?.trim().toUpperCase();
	if (!expectedBridgeSha) throw new Error("Live campaign requires plan.bridge.sha256.");
	const pathForCompare = options.dependencies?.canonicalPath ?? canonicalPath;
	const resolvedCwd = pathForCompare(options.cwd);
	const expectedDatabasePath = pathForCompare(plan.database.path);
	if (resolvedCwd !== expectedDatabasePath) {
		throw new Error(`Live cwd does not match plan.database.path: ${resolvedCwd} !== ${expectedDatabasePath}`);
	}
	const bridgePath = bridgePathFor(options.repoRoot, plan.bridge.path);
	const getHash = options.dependencies?.fileSha256 ?? fileSha256;
	const actualBridgeSha = getHash(bridgePath)?.toUpperCase();
	if (!actualBridgeSha) throw new Error(`Live Bridge does not exist: ${bridgePath}`);
	if (actualBridgeSha !== expectedBridgeSha) {
		throw new Error(`Live Bridge SHA mismatch: actual=${actualBridgeSha} plan=${expectedBridgeSha}`);
	}
	const scheduler = await (options.dependencies?.schedulerProbe ?? defaultSchedulerProbe)(options.env);
	if (
		scheduler.hostState !== plan.scheduler.requiredHostState ||
		scheduler.activeCount !== plan.scheduler.requiredActiveCount ||
		scheduler.queuedCount !== plan.scheduler.requiredQueuedCount ||
		scheduler.cliLock !== plan.scheduler.requiredCliLock
	) {
		throw new Error(`ASCET scheduler is not idle/healthy: ${JSON.stringify(scheduler)}`);
	}
	const database = await (options.dependencies?.databaseIdentityProbe ?? defaultDatabaseIdentityProbe)({
		cwd: options.cwd,
		bridgePath,
		env: options.env,
	});
	if (pathForCompare(database.path) !== expectedDatabasePath) {
		throw new Error(`Current ASCET database path mismatch: ${database.path} !== ${plan.database.path}`);
	}
	if (database.fingerprint.toLowerCase() !== plan.database.fingerprint.toLowerCase()) {
		throw new Error(`Current ASCET database fingerprint mismatch: ${database.fingerprint} !== ${plan.database.fingerprint}`);
	}
	return {
		cwd: resolvedCwd,
		planDatabasePath: expectedDatabasePath,
		bridgePath,
		planBridgeSha256: expectedBridgeSha,
		actualBridgeSha256: actualBridgeSha,
		database,
		scheduler,
		verifiedAt: new Date().toISOString(),
	};
}

function runIdentity(options: LiveInvokerOptions, action: ActionPlan, variant: ActionVariant, scenario: ActionScenario, phaseId: string): RunIdentity {
	const base = `${safePart(action.id)}-${safePart(variant.id)}-${safePart(scenario.id)}-${String(action.runIndex).padStart(2, "0")}`;
	const artifactKey = createHash("sha256").update(base).digest("hex").slice(0, 16);
	return {
		runId: base,
		phaseId,
		caseId: safePart(scenario.id),
		attemptId: "001",
		artifactRoot: resolve(options.outputRoot, "runtime-artifacts", artifactKey, safePart(phaseId)),
	};
}

function telemetryFrom(identity: RunIdentity): string | undefined {
	const path = join(identity.artifactRoot, "telemetry", "element-write.jsonl");
	if (!existsSync(path)) return undefined;
	const text = readFileSync(path, "utf8").trim();
	if (!text) return undefined;
	try {
		const events = text.split(/\r?\n/u).map((line) => JSON.parse(line) as JsonRecord);
		if (
			events.length === 0 ||
			events.some(
				(event) =>
					event.runId !== identity.runId ||
					event.phaseId !== identity.phaseId ||
					event.caseId !== identity.caseId ||
					event.attemptId !== identity.attemptId,
			)
		) return undefined;
		return `${text}\n`;
	} catch {
		return undefined;
	}
}

export function extractCanonicalResult(response: unknown): unknown {
	const details = asRecord(asRecord(response)?.details);
	const raw = asRecord(details?.raw);
	const result = raw ? unwrapToolSuccessPayload(raw.data) : undefined;
	const payload = asRecord(asRecord(result)?.payload);
	return payload ?? result ?? details?.outcome ?? response;
}

export function extractBridgeEvidence(response: unknown): BridgeEvidence | undefined {
	const record = asRecord(response);
	const details = asRecord(record?.details);
	const raw = asRecord(details?.raw);
	const diagnostics = asRecord(details?.diagnostics);
	const error = asRecord(details?.error);
	const errorDetails = asRecord(error?.details);
	const content = Array.isArray(record?.content) ? asRecord(record.content[0]) : undefined;
	const request = raw?.request ?? diagnostics?.request;
	const stdout = raw?.stdout ?? errorDetails?.stdout ?? content?.text;
	const stderr = typeof raw?.stderr === "string" ? raw.stderr : typeof errorDetails?.stderr === "string" ? errorDetails.stderr : undefined;
	const exitCode = typeof raw?.exitCode === "number" ? raw.exitCode : typeof diagnostics?.exitCode === "number" ? diagnostics.exitCode : undefined;
	if (request === undefined && stdout === undefined && stderr === undefined && exitCode === undefined) return undefined;
	return { request, stdout, stderr, exitCode };
}

async function defaultToolExecutor(toolName: string, request: JsonRecord, context: LiveToolContext, signal: AbortSignal): Promise<unknown> {
	const toolCallId = `ascet-edit-live-campaign-${toolName}`;
	if (toolName === "ascet_edit") {
		return ascetEditTool.execute(toolCallId, request as Parameters<typeof ascetEditTool.execute>[1], signal, undefined, context);
	}
	if (toolName === "ascet_get") {
		return ascetGetTool.execute(toolCallId, request as Parameters<typeof ascetGetTool.execute>[1], signal, undefined, context);
	}
	if (toolName === "ascet_read") {
		return ascetReadTool.execute(toolCallId, request as Parameters<typeof ascetReadTool.execute>[1], signal, undefined, context);
	}
	throw new Error(`ASCET campaign does not allow tool: ${toolName}`);
}

export function createLiveInvoker(options: LiveInvokerOptions): CampaignInvoker {
	const executeTool = options.toolExecutor ?? defaultToolExecutor;
	async function call(toolName: string, request: JsonRecord, identity: RunIdentity): Promise<{ response: unknown; telemetry?: string; bridge?: BridgeEvidence }> {
		const env = {
			ASCET_BRIDGE_PATH: options.bridgePath,
			...(options.contractsPath ? { ASCET_CONTRACTS_PATH: options.contractsPath } : {}),
			PI_ASCET_EXTENSION_ARTIFACT_ROOT: identity.artifactRoot,
			PI_ASCET_RUN_ID: identity.runId,
			PI_ASCET_PHASE_ID: identity.phaseId,
			PI_ASCET_CASE_ID: identity.caseId,
			PI_ASCET_ATTEMPT_ID: identity.attemptId,
		};
		const response = await executeTool(toolName, request, { cwd: options.cwd, env, hasUI: true, ui: { confirm: async () => true } }, new AbortController().signal);
		return { response, telemetry: telemetryFrom(identity), bridge: extractBridgeEvidence(response) };
	}
	return {
		async invoke(action, variant, scenario) {
			const identity = runIdentity(options, action, variant, scenario, "write");
			const invocation = await call("ascet_edit", scenario.request, identity);
			return {
				response: invocation.response,
				bridge: invocation.bridge,
				telemetry: invocation.telemetry,
				normalizedResult: extractCanonicalResult(invocation.response),
			};
		},
		async readback(action, variant, scenario) {
			if (!scenario.readback) return undefined;
			const identity = runIdentity(options, action, variant, scenario, "readback");
			const invocation = await call(scenario.readback.tool, scenario.readback.params, identity);
			return { publicResult: invocation.response, bridgeEvidence: invocation.bridge, telemetry: invocation.telemetry };
		},
	};
}

function usage(): never {
	console.error("Usage: node scripts/ascet-edit-live-campaign-live.ts --plan <plan.json> --output <campaign-dir> --execute [--cwd <ascet-cwd>]");
	process.exit(2);
}

async function main(): Promise<void> {
	const args = process.argv.slice(2);
	const value = (flag: string): string | undefined => {
		const index = args.indexOf(flag);
		return index < 0 ? undefined : args[index + 1];
	};
	const planPath = value("--plan");
	const outputRoot = value("--output");
	if (!planPath || !outputRoot || !args.includes("--execute")) usage();
	const plan = loadCampaignPlan(resolve(planPath));
	validateCampaignPlan(plan);
	const repoRoot = resolve(process.cwd());
	const cwd = resolve(value("--cwd") ?? process.env.ASCET_SMOKE_CWD ?? repoRoot);
	const bridgePath = bridgePathFor(repoRoot, plan.bridge.path);
	const env = {
		ASCET_BRIDGE_PATH: bridgePath,
		...(plan.bridge.contractsPath ? { ASCET_CONTRACTS_PATH: resolve(repoRoot, plan.bridge.contractsPath) } : {}),
	};
	const readiness = await assertLiveReadiness(plan, { repoRoot, cwd, env });
	const resolvedOutputRoot = resolve(outputRoot);
	const invoker = createLiveInvoker({
		repoRoot,
		cwd,
		bridgePath,
		contractsPath: plan.bridge.contractsPath ? resolve(repoRoot, plan.bridge.contractsPath) : undefined,
		outputRoot: resolvedOutputRoot,
	});
	const summary = await runCampaign(plan, { outputRoot: resolvedOutputRoot, repoRoot, invoker, liveReadiness: readiness });
	console.log(JSON.stringify({ readiness, summary }, null, 2));
	if (summary.status !== "PASS") process.exitCode = 1;
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) await main();

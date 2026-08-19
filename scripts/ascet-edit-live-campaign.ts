import { createHash } from "node:crypto";
import { appendFileSync, existsSync, mkdirSync, openSync, closeSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join, relative, resolve } from "node:path";

export type JsonRecord = Record<string, unknown>;
type CampaignChannel = "source" | "packaged";
type CampaignStatus = "PASS" | "FAIL" | "BLOCKED" | "NOT_RUN";
export type ScenarioKind = "changed-success" | "confirmed-no-op" | "invalid-selector" | "bridge-failure";
export type ReadbackPhase = "independent" | "precondition" | "postcondition";
export const REQUIRED_SCENARIOS: readonly ScenarioKind[] = ["changed-success", "confirmed-no-op", "invalid-selector", "bridge-failure"];

export const ACTION_MATRIX = [
	"create_folder",
	"create_component",
	"create_method",
	"create_dependent_chain",
	"set_method_signature",
	"delete_component",
	"delete_method",
	"delete_folder",
	"set_method_code",
	"set_module_code",
	"set_state_machine_code",
	"set_enumerators",
	"apply_element_spec",
	"apply_project_formula",
	"set_element_dependency",
	"mode=check",
	"mode=set",
] as const;

export type ActionName = (typeof ACTION_MATRIX)[number];

export interface ReadbackSpec {
    id: string;
    tool: string;
    params: JsonRecord;
    phase: ReadbackPhase;
}

export const REQUIRED_VARIANT_MATRIX = {
	create_folder: ["folder"],
	create_component: ["class", "module", "statemachine", "enumeration"],
	create_method: ["class-abstract", "module-process", "statemachine-action", "statemachine-condition", "statemachine-trigger"],
	create_dependent_chain: ["exported-endpoint", "imported-endpoint", "local-dependent-endpoint"],
	set_method_signature: ["return-and-arguments-replace"],
	delete_component: ["component"],
	delete_method: ["method"],
	delete_folder: ["folder-subtree"],
	set_method_code: ["method-code-v1-v2"],
	set_module_code: ["set-method", "set-header", "set-external-c-code"],
	set_state_machine_code: [
		"set-method",
		"set-state-entry-esdl",
		"set-state-exit-esdl",
		"set-state-static-esdl",
		"bind-state-entry-method",
		"bind-state-exit-method",
		"bind-state-static-method",
		"set-transition-condition-esdl",
		"set-transition-action-esdl",
		"bind-transition-condition-method",
		"bind-transition-action-method",
		"set-start-state",
	],
	set_enumerators: ["ordered-replace"],
	apply_element_spec: [
		"class-create-standard-primitive",
		"module-create-exported",
		"class-patch-upsert-imported",
		"module-restore-local-dependent",
		"class-remove-array",
		"module-delete-missing-enumeration",
		"class-create-table",
		"module-create-component-reference",
	],
	apply_project_formula: ["identity", "multiple-formulas", "restore", "delete-missing"],
	set_element_dependency: ["dependent-exported-imported", "independent-local", "explicit-mapping", "auto-mapping", "restoration", "supported-variant-policy"],
	"mode=check": ["editable", "read-only"],
	"mode=set": ["read-only-to-editable"],
} as const satisfies Record<ActionName, readonly string[]>;

export interface ActionScenario {
	id: string;
	scenario: ScenarioKind;
	request: JsonRecord;
	bridgeRequest?: JsonRecord;
	readback?: ReadbackSpec | ReadbackSpec[];
	objectManifest: JsonRecord;
	expectedOutcome: ScenarioKind;
	execution?: "ready" | "blocked";
	preconditionBlockers?: string[];
}

export interface ActionVariant {
	id: string;
	variant: string;
	scenarios: ActionScenario[];
}

export interface ActionPlan {
	id: string;
	action: ActionName;
	runIndex: number;
	variants: ActionVariant[];
}

export interface CampaignPlan {
	schemaVersion: 1;
	campaignId: string;
	channel: CampaignChannel;
	mode: "evidence-preserved";
	database: { path: string; fingerprint: string };
	bridge: { path: string; sha256: string; contractsPath?: string };
	source: { revision: string; worktreeStatusDigest: string };
	scheduler: {
		requiredHostState: "healthy";
		requiredActiveCount: 0;
		requiredQueuedCount: 0;
		requiredCliLock: false;
	};
	actions: ActionPlan[];
}

export interface BridgeEvidence {
	request?: unknown;
	stdout?: unknown;
	stderr?: string;
	exitCode?: number;
}

export interface PublicInvocation {
	response: unknown;
	bridge?: BridgeEvidence;
	telemetry?: string | JsonRecord;
	normalizedResult?: unknown;
}

export interface ReadbackInvocation {
	publicResult: unknown;
	bridgeEvidence?: BridgeEvidence;
	telemetry?: string | JsonRecord;
}

export interface CampaignInvoker {
	invoke(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario): Promise<PublicInvocation>;
	readback(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario, readback: ReadbackSpec): Promise<ReadbackInvocation>;
}

export interface CampaignOptions {
	outputRoot: string;
	repoRoot?: string;
	invoker: CampaignInvoker;
	acquireWriter?: () => (() => void);
	now?: () => Date;
	liveReadiness?: unknown;
}

export interface ActionSummary {
	runId: string;
	action: ActionName;
	variant: string;
	scenario: string;
	status: CampaignStatus;
	error?: string;
	durationMs: number;
	runPath: string;
}

export interface CampaignSummary {
	campaignId: string;
	channel: CampaignChannel;
	status: CampaignStatus;
	actions: ActionSummary[];
	counts: Record<CampaignStatus, number>;
	cleanupAllowed: false;
}

export const REQUIRED_RUN_FILES = [
	"run-manifest.json",
	"object-manifest.json",
	"request/public-tool-request.json",
	"request/bridge-request.json",
	"result/bridge-stdout.json",
	"result/bridge-stderr.txt",
	"result/bridge-exit-code.txt",
	"result/normalized-result.json",
	"result/public-tool-result.json",
	"readback/request.json",
	"readback/result.json",
	"telemetry/run.ndjson",
	"cleanup/decision.json",
] as const;

function json(value: unknown): string {
	const serialized = JSON.stringify(value, (_key, item) => (item instanceof Error ? { name: item.name, message: item.message, stack: item.stack } : item), 2);
	return `${serialized ?? "null"}\n`;
}

function writeJsonOnce(path: string, value: unknown): void {
	if (existsSync(path)) throw new Error(`Refusing to overwrite immutable evidence: ${path}`);
	writeFileSync(path, json(value), "utf8");
}

function writeTextOnce(path: string, value: string): void {
	if (existsSync(path)) throw new Error(`Refusing to overwrite immutable evidence: ${path}`);
	writeFileSync(path, value, "utf8");
}

function safeName(value: string): string {
	return value.replaceAll(/[^A-Za-z0-9._=-]+/g, "_").replaceAll(/^_+|_+$/g, "") || "unnamed";
}

function digest(value: unknown): string {
	return createHash("sha256").update(JSON.stringify(value)).digest("hex");
}

function fileSha256(path: string): string | undefined {
	if (!existsSync(path)) return undefined;
	return createHash("sha256").update(readFileSync(path)).digest("hex").toUpperCase();
}

function normalizeChannelPath(channel: CampaignChannel, bridgePath: string): void {
	const normalized = bridgePath.replaceAll("\\", "/").toLowerCase();
	if (channel === "source" && normalized.includes("packages/ascet-extension/ascet-cli/")) {
		throw new Error("Source campaign cannot use the packaged Bridge path.");
	}
	if (channel === "packaged" && !normalized.includes("packages/ascet-extension/ascet-cli/")) {
		throw new Error("Packaged campaign must use packages/ascet-extension/ascet-cli/Bridge.exe.");
	}
}

const TARGET_PATH_KEY = /(?:path|root|file)$/i;

function isRecord(value: unknown): value is JsonRecord {
	return typeof value === "object" && value !== null && !Array.isArray(value);
}

function pathSegments(value: string): string[] {
	return value.replaceAll("/", "\\").split("\\").filter((segment) => segment.length > 0);
}

function isAbsolutePath(value: string): boolean {
	return value.startsWith("/") || value.startsWith("\\") || /^[A-Za-z]:[\\/]/.test(value);
}

function campaignDisposableRoot(objectManifest: JsonRecord): string {
	const candidate = typeof objectManifest.cleanupScope === "string" ? objectManifest.cleanupScope : objectManifest.root;
	if (typeof candidate !== "string" || candidate.length === 0) throw new Error("Ready scenario objectManifest must declare a disposable root.");
	const segments = pathSegments(candidate);
	if (segments.length === 0 || isAbsolutePath(candidate)) throw new Error("Ready scenario disposable root must be relative.");
	return segments[0]!.toLowerCase();
}

function validateRequestPath(value: string, key: string, root: string): void {
	if (isAbsolutePath(value)) throw new Error(`Ready request ${key} must not use an absolute path.`);
	const segments = pathSegments(value);
	if (segments.some((segment) => segment === "..")) throw new Error(`Ready request ${key} must not contain .. path segments.`);
	if (segments.some((segment) => segment.toLowerCase() === "outside")) throw new Error(`Ready request ${key} must not target OUTSIDE.`);
	if (segments[0]?.toLowerCase() !== root) throw new Error(`Ready request ${key} must stay under disposable root ${root}.`);
}

function validateRequestPaths(value: unknown, root: string): void {
	if (Array.isArray(value)) {
		for (const item of value) validateRequestPaths(item, root);
		return;
	}
	if (!isRecord(value)) return;
	for (const [key, child] of Object.entries(value)) {
		if (typeof child === "string" && TARGET_PATH_KEY.test(key)) validateRequestPath(child, key, root);
		else validateRequestPaths(child, root);
	}
}

export function getReadbackSpecs(scenario: ActionScenario): ReadbackSpec[] {
    if (!scenario.readback) return [];
    const specs = Array.isArray(scenario.readback) ? scenario.readback : [scenario.readback];
    return specs.map((spec, index) => ({ ...spec, id: spec.id || `readback-${index + 1}`, phase: spec.phase || "independent" }));
}
function validateReadbackSpecs(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario): ReadbackSpec[] {
	const specs = getReadbackSpecs(scenario);
	const ids = new Set<string>();
	for (const spec of specs) {
		if (!spec.id || ids.has(spec.id) || !spec.tool || !spec.params || !["independent", "precondition", "postcondition"].includes(spec.phase)) {
			throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} has an invalid readback specification.`);
		}
		ids.add(spec.id);
		try {
			validateRequestPaths(spec.params, campaignDisposableRoot(scenario.objectManifest));
		} catch (error) {
			throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} has an unsafe readback path: ${outcomeError(error)}`);
		}
	}
	if ((action.action === "set_element_dependency" || action.action === "create_dependent_chain") && (scenario.scenario === "changed-success" || scenario.scenario === "confirmed-no-op") && !specs.some((spec) => spec.phase === "independent")) {
		throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} requires an independent readback.`);
	}
    if (action.action === "mode=set" && scenario.scenario === "changed-success" && (!specs.some((spec) => spec.phase === "precondition") || !specs.some((spec) => spec.phase === "postcondition"))) {
		throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} requires precondition and postcondition readbacks.`);
	}
	return specs;
}
function validateReadyRequestPaths(action: ActionPlan, variant: ActionVariant, scenario: ActionScenario): void {
	const root = campaignDisposableRoot(scenario.objectManifest);
	try {
		validateRequestPaths(scenario.request, root);
	} catch (error) {
		throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} has an unsafe target path: ${outcomeError(error)}`);
	}
}

export function validateCampaignPlan(plan: CampaignPlan): void {
	if (plan.schemaVersion !== 1 || plan.mode !== "evidence-preserved") throw new Error("Unsupported campaign plan mode/schema.");
	if (!plan.campaignId || !plan.database.path || !plan.database.fingerprint) throw new Error("Campaign identity is incomplete.");
	if (!plan.bridge.path || !plan.bridge.sha256 || !/^[A-Fa-f0-9]{64}$/.test(plan.bridge.sha256) || !plan.source.revision || !plan.source.worktreeStatusDigest) {
	    throw new Error("Bridge/source identity is incomplete; bridge.sha256 must be a 64-character SHA-256.");
	}
	normalizeChannelPath(plan.channel, plan.bridge.path);
	if (plan.scheduler.requiredHostState !== "healthy" || plan.scheduler.requiredActiveCount !== 0 || plan.scheduler.requiredQueuedCount !== 0) {
		throw new Error("Campaign scheduler requirements are not the fixed healthy/idle policy.");
	}
	if (plan.scheduler.requiredCliLock !== false) throw new Error("Campaign must require cliLock=false.");
	if (plan.actions.length !== ACTION_MATRIX.length) throw new Error(`Campaign must contain exactly ${ACTION_MATRIX.length} action entries.`);
	const actionIds = new Set<string>();
	for (const [index, action] of plan.actions.entries()) {
		if (action.action !== ACTION_MATRIX[index]) throw new Error(`Action ${index + 1} must be ${ACTION_MATRIX[index]}.`);
		if (actionIds.has(action.id)) throw new Error(`Duplicate action id: ${action.id}`);
		actionIds.add(action.id);
		if (!Number.isInteger(action.runIndex) || action.runIndex < 1) throw new Error(`Action ${action.id} has invalid runIndex.`);
		const requiredVariants = REQUIRED_VARIANT_MATRIX[action.action];
		if (!Array.isArray(action.variants)) throw new Error(`Action ${action.id} is missing required variants.`);
		const variantNames = action.variants.map((variant) => variant.variant);
		const duplicateVariant = variantNames.find((variant, variantIndex) => variantNames.indexOf(variant) !== variantIndex);
		if (duplicateVariant) throw new Error(`Action ${action.id} has duplicate variant: ${duplicateVariant}`);
		const missingVariant = requiredVariants.find((variant) => !variantNames.includes(variant));
		if (missingVariant) throw new Error(`Action ${action.id} is missing required variant: ${missingVariant}`);
		const unexpectedVariant = variantNames.find((variant) => !requiredVariants.includes(variant));
		if (unexpectedVariant) throw new Error(`Action ${action.id} has unexpected variant: ${unexpectedVariant}`);
		if (variantNames.length !== requiredVariants.length) throw new Error(`Action ${action.id} variant count does not match the required matrix.`);
		for (const variant of action.variants) {
			if (!variant.id) throw new Error(`Action ${action.id}/${variant.variant} is missing a variant id.`);
			if (!Array.isArray(variant.scenarios)) throw new Error(`Action ${action.id}/${variant.variant} is missing required scenarios.`);
			const scenarioNames = variant.scenarios.map((scenario) => scenario.scenario);
			const duplicateScenario = scenarioNames.find((scenario, scenarioIndex) => scenarioNames.indexOf(scenario) !== scenarioIndex);
			if (duplicateScenario) throw new Error(`Action ${action.id}/${variant.variant} has duplicate scenario: ${duplicateScenario}`);
			const missingScenario = REQUIRED_SCENARIOS.find((scenario) => !scenarioNames.includes(scenario));
			if (missingScenario) throw new Error(`Action ${action.id}/${variant.variant} is missing required scenario: ${missingScenario}`);
			const unexpectedScenario = scenarioNames.find((scenario) => !REQUIRED_SCENARIOS.includes(scenario));
			if (unexpectedScenario) throw new Error(`Action ${action.id}/${variant.variant} has unexpected scenario: ${unexpectedScenario}`);
			if (scenarioNames.length !== REQUIRED_SCENARIOS.length) throw new Error(`Action ${action.id}/${variant.variant} scenario count does not match the required matrix.`);
			for (const scenario of variant.scenarios) {
				if (scenario.expectedOutcome !== scenario.scenario || !scenario.id || !scenario.request || !scenario.objectManifest) {
					throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} is incomplete.`);
				}
                if (scenario.execution !== "ready" && scenario.execution !== "blocked") {
                    throw new Error(`Action ${action.id}/${variant.variant}/${scenario.scenario} has invalid execution; use ready or blocked.`);
                }
                if (scenario.execution === "ready") {
                    validateReadyRequestPaths(action, variant, scenario);
                    validateReadbackSpecs(action, variant, scenario);
                }
			}
		}
	}
}

function defaultWriter(outputRoot: string): () => void {
	const lockPath = join(resolve(outputRoot, "..", ".."), ".ASCET_LIVE_WRITER.lock");
	mkdirSync(dirname(lockPath), { recursive: true });
	let fd: number;
	try {
		fd = openSync(lockPath, "wx");
	} catch {
		throw new Error(`ASCET_LIVE_WRITER is already held: ${lockPath}`);
	}
	writeFileSync(lockPath, `${process.pid}\n`, "utf8");
	return () => {
		closeSync(fd);
		rmSync(lockPath, { force: true });
	};
}

export function acquireAscetLiveWriter(outputRoot: string): () => void {
	if (process.env.ASCET_LIVE_WRITER !== "1") throw new Error("Set ASCET_LIVE_WRITER=1 to execute a live campaign.");
	return defaultWriter(outputRoot);
}

function writeManifestIdentity(plan: CampaignPlan, repoRoot: string): JsonRecord {
	const bridgePath = resolve(repoRoot, plan.bridge.path);
	const planHash = plan.bridge.sha256.toUpperCase();
	const actualHash = fileSha256(bridgePath);
	const hashMatch = actualHash === planHash;
	return {
		schemaVersion: 1,
		campaignId: plan.campaignId,
		planHash,
		actualHash: actualHash ?? null,
		hashMatch,
		createdAt: new Date().toISOString(),
		purpose: "ascet-edit-tools-evidence-first-all-action-campaign",
		mode: plan.mode,
		channel: plan.channel,
		database: plan.database,
		bridge: { ...plan.bridge, path: bridgePath, sha256: planHash, actualHash: actualHash ?? null, hashMatch, hashObserved: actualHash !== undefined },
		source: plan.source,
		schedulerPolicy: { ...plan.scheduler, concurrency: 1 },
		liveWriter: { name: "ASCET_LIVE_WRITER", permits: 1 },
		artifactPolicy: { immutableRawEvidence: true, cleanupAllowed: false, defaultRetentionState: "pending-human-review" },
	};
}

function canonicalResult(invocation: PublicInvocation): JsonRecord | undefined {
	if (isRecord(invocation.normalizedResult)) return invocation.normalizedResult;
	return isRecord(invocation.response) ? invocation.response : undefined;
}

function hasBridgeEvidence(invocation: PublicInvocation): boolean {
	return invocation.bridge?.request !== undefined && invocation.bridge.stdout !== undefined && invocation.bridge.exitCode !== undefined;
}

function hasPublicFailure(value: unknown): boolean {
	if (!isRecord(value)) return false;
	if (value.error !== undefined) return true;
	const details = isRecord(value.details) ? value.details : undefined;
	const outcome = details && isRecord(details.outcome) ? details.outcome : undefined;
	if (details?.error !== undefined || outcome?.error !== undefined) return true;
	return value.status === "error" || value.status === "failed" || value.status === "failure" || outcome?.status === "error" || outcome?.status === "partial" || outcome?.status === "blocked";
}

interface CapturedReadback {
	 spec: ReadbackSpec;
	 invocation?: ReadbackInvocation;
	 error?: string;
}

function readbackPassed(readback: ReadbackInvocation | undefined): boolean {
	if (!readback || readback.bridgeEvidence?.exitCode !== 0) return false;
	return readback.bridgeEvidence.request !== undefined && readback.bridgeEvidence.stdout !== undefined && !hasPublicFailure(readback.publicResult);
}

function allReadbacksPassed(readbacks: CapturedReadback[], required: ReadbackSpec[]): boolean {
	return required.length === readbacks.length && readbacks.every((readback) => !readback.error && readbackPassed(readback.invocation));
}

function canonicalApplied(result: JsonRecord | undefined): boolean {
	return result?.changed === true && result.mutationStatus === "applied" && result.saveAttempted === true && result.saveSucceeded === true && result.saveState === "saved" && result.verified === true && result.verificationStatus === "passed" && typeof result.verificationMode === "string" && result.verificationMode.length > 0 && result.sessionCount === 1 && result.saveCount === 1 && typeof result.editableRetryCount === "number" && result.editableRetryCount >= 0 && result.editableRetryCount <= 1 && ((result.editableRetryCount === 0 && result.nativeMutationAttemptCount === 1) ||
		(result.editableRetryCount === 1 && result.nativeMutationAttemptCount === 2));
}

function canonicalNoOp(result: JsonRecord | undefined): boolean {
	return result?.changed === false && result.mutationStatus === "no_op" && result.saveAttempted === false && result.saveSucceeded === false && result.saveState === "not_required" && result.verified === true && result.verificationStatus === "passed" && typeof result.verificationMode === "string" && result.verificationMode.length > 0 && result.sessionCount === 1 && result.saveCount === 0 && typeof result.nativeMutationAttemptCount === "number" && result.nativeMutationAttemptCount === 0;
}

function canonicalFailure(result: JsonRecord | undefined): boolean {
	return result !== undefined && result.changed !== true && result.mutationStatus !== "applied";
}

function evidenceStatus(invocation: PublicInvocation, readbacks: CapturedReadback[], scenario: ActionScenario, error?: unknown): CampaignStatus {
	if (error) return "FAIL";
	if (!hasBridgeEvidence(invocation)) return "BLOCKED";
	if (!allReadbacksPassed(readbacks, getReadbackSpecs(scenario))) return "BLOCKED";
	if (invocation.telemetry === undefined) return "BLOCKED";
	const result = canonicalResult(invocation);
	if ((scenario.scenario === "changed-success" || scenario.scenario === "confirmed-no-op") && hasPublicFailure(invocation.response)) return "BLOCKED";
	if (scenario.scenario === "changed-success") return canonicalApplied(result) && invocation.bridge?.exitCode === 0 ? "PASS" : "BLOCKED";
	if (scenario.scenario === "confirmed-no-op") return canonicalNoOp(result) && invocation.bridge?.exitCode === 0 ? "PASS" : "BLOCKED";
	if (scenario.scenario === "invalid-selector") return hasPublicFailure(invocation.response) && canonicalFailure(result) ? "PASS" : "BLOCKED";
	const bridgeFailed = invocation.bridge?.exitCode !== undefined && invocation.bridge.exitCode !== 0;
	return bridgeFailed && hasPublicFailure(invocation.response) && canonicalFailure(result) ? "PASS" : "BLOCKED";
}

function outcomeError(error: unknown): string {
	return error instanceof Error ? error.message : String(error);
}

function writeBridgeEvidence(runPath: string, bridge: BridgeEvidence | undefined): void {
	const resultPath = join(runPath, "result");
	if (bridge?.stdout !== undefined) writeJsonOnce(join(resultPath, "bridge-stdout.json"), bridge.stdout);
	else writeJsonOnce(join(resultPath, "bridge-stdout.json"), { evidence: "not-captured" });
	writeTextOnce(join(resultPath, "bridge-stderr.txt"), bridge?.stderr ?? "");
	writeTextOnce(join(resultPath, "bridge-exit-code.txt"), bridge?.exitCode === undefined ? "not-captured\n" : `${bridge.exitCode}\n`);
}

function writeTelemetry(runPath: string, telemetry: string | JsonRecord | undefined): void {
	if (telemetry === undefined) return;
	writeTextOnce(join(runPath, "telemetry", "run.ndjson"), typeof telemetry === "string" ? telemetry.endsWith("\n") ? telemetry : `${telemetry}\n` : `${JSON.stringify(telemetry)}\n`);
}

function requiredEvidencePaths(outputRoot: string, runPath: string): string[] {
	return REQUIRED_RUN_FILES.map((path) => relative(outputRoot, join(runPath, path)).replaceAll("\\", "/"));
}

export async function runCampaign(plan: CampaignPlan, options: CampaignOptions): Promise<CampaignSummary> {
	validateCampaignPlan(plan);
	const outputRoot = resolve(options.outputRoot);
	if (existsSync(outputRoot)) {
		throw new Error(`Campaign output already exists; use a new campaignId/output root: ${outputRoot}`);
	}
	mkdirSync(outputRoot, { recursive: true });
	if (options.liveReadiness !== undefined) writeJsonOnce(join(outputRoot, "live-readiness.json"), options.liveReadiness);
	const repoRoot = resolve(options.repoRoot ?? process.cwd());
	const now = options.now ?? (() => new Date());
	const campaignManifest = writeManifestIdentity(plan, repoRoot);
	writeJsonOnce(join(outputRoot, "campaign-manifest.json"), campaignManifest);
	    if (campaignManifest.hashMatch !== true) {
	        throw new Error(`Bridge SHA-256 mismatch; planHash=${String(campaignManifest.planHash)} actualHash=${String(campaignManifest.actualHash)}`);
	    }
	writeTextOnce(join(outputRoot, "human-review.md"), `# Human review queue\n\nCampaign: ${plan.campaignId}\n\nDefault state: pending-human-review\n\nCleanup is disabled by the campaign harness.\n`);
	const releaseWriter = options.acquireWriter ? options.acquireWriter() : acquireAscetLiveWriter(outputRoot);
	writeTextOnce(join(outputRoot, "retention-index.ndjson"), "");
	const actions: ActionSummary[] = [];
	try {
		for (const action of plan.actions) {
			for (const variant of action.variants) {
				for (const scenario of variant.scenarios) {
					const startedAt = now();
					const bridgeHash = String((campaignManifest.bridge as JsonRecord).sha256 ?? "unknown");
					const runId = `${safeName(action.id)}-${safeName(variant.id)}-${safeName(scenario.id)}-${String(action.runIndex).padStart(2, "0")}`;
					const runPath = join(outputRoot, `${plan.channel}-bridge`, safeName(bridgeHash), safeName(action.action), safeName(variant.variant), safeName(scenario.scenario), runId);
					mkdirSync(join(runPath, "request"), { recursive: true });
					mkdirSync(join(runPath, "result"), { recursive: true });
					mkdirSync(join(runPath, "readback"), { recursive: true });
					mkdirSync(join(runPath, "telemetry"), { recursive: true });
					mkdirSync(join(runPath, "cleanup"), { recursive: true });
					writeJsonOnce(join(runPath, "object-manifest.json"), scenario.objectManifest);
					writeJsonOnce(join(runPath, "request", "public-tool-request.json"), scenario.request);
					writeJsonOnce(join(runPath, "cleanup", "decision.json"), { status: "pending-human-review", cleanupAllowed: false });
					const readbackSpecs = getReadbackSpecs(scenario);
					let invocation: PublicInvocation = { response: { status: "not-run" } };
					const capturedReadbacks: CapturedReadback[] = [];
					let error: string | undefined;
					let preconditionBlocked = scenario.execution === "blocked";
					const captureReadback = async (spec: ReadbackSpec): Promise<boolean> => {
						try {
							const result = await options.invoker.readback(action, variant, scenario, spec);
							capturedReadbacks.push({ spec, invocation: result });
							return readbackPassed(result);
						} catch (caught) {
							capturedReadbacks.push({ spec, error: outcomeError(caught) });
							return false;
						}
					};
					const writeReadbackEvidence = (): void => {
						writeJsonOnce(join(runPath, "readback", "request.json"), { steps: readbackSpecs });
						writeJsonOnce(join(runPath, "readback", "result.json"), { steps: capturedReadbacks });
					};
					if (preconditionBlocked) {
						invocation = {
							response: { status: "blocked", code: "campaign_precondition_blocked", blockers: scenario.preconditionBlockers ?? [] },
							normalizedResult: { status: "blocked", blockers: scenario.preconditionBlockers ?? [] },
						};
						writeJsonOnce(join(runPath, "result", "public-tool-result.json"), invocation.response);
						writeJsonOnce(join(runPath, "result", "normalized-result.json"), invocation.normalizedResult);
						writeJsonOnce(join(runPath, "request", "bridge-request.json"), scenario.bridgeRequest ?? { evidence: "not-captured", reason: "Scenario was precondition-blocked before ASCET invocation." });
						writeBridgeEvidence(runPath, undefined);
					} else {
						for (const spec of readbackSpecs.filter((candidate) => candidate.phase === "precondition")) {
							if (!(await captureReadback(spec))) {
								preconditionBlocked = true;
                                error = `Readback precondition failed: ${spec.id}`;
								break;
							}
						}
						if (preconditionBlocked) {
							invocation = {
								response: { status: "blocked", code: "campaign_precondition_blocked", blockers: [error ?? "readback_precondition_failed"] },
								normalizedResult: { status: "blocked", blockers: [error ?? "readback_precondition_failed"] },
							};
							writeJsonOnce(join(runPath, "result", "public-tool-result.json"), invocation.response);
							writeJsonOnce(join(runPath, "result", "normalized-result.json"), invocation.normalizedResult);
							writeJsonOnce(join(runPath, "request", "bridge-request.json"), scenario.bridgeRequest ?? { evidence: "not-captured", reason: "Readback precondition failed before ASCET invocation." });
							writeBridgeEvidence(runPath, undefined);
						} else {
							try {
								invocation = await options.invoker.invoke(action, variant, scenario);
								writeJsonOnce(join(runPath, "result", "public-tool-result.json"), invocation.response);
								writeJsonOnce(join(runPath, "result", "normalized-result.json"), invocation.normalizedResult ?? invocation.response);
								writeJsonOnce(join(runPath, "request", "bridge-request.json"), invocation.bridge?.request ?? scenario.bridgeRequest ?? { evidence: "not-captured" });
								writeBridgeEvidence(runPath, invocation.bridge);
								writeTelemetry(runPath, invocation.telemetry);
								for (const spec of readbackSpecs.filter((candidate) => candidate.phase !== "precondition")) await captureReadback(spec);
							} catch (caught) {
								error = outcomeError(caught);
								writeJsonOnce(join(runPath, "result", "public-tool-result.json"), { error });
								writeJsonOnce(join(runPath, "result", "normalized-result.json"), { status: "error", error });
								writeJsonOnce(join(runPath, "request", "bridge-request.json"), invocation.bridge?.request ?? scenario.bridgeRequest ?? { evidence: "not-captured", reason: "Invocation threw before Bridge request evidence was returned." });
								writeBridgeEvidence(runPath, invocation.bridge);
							}
						}
					}
					writeReadbackEvidence();
					const status = preconditionBlocked ? "BLOCKED" : evidenceStatus(invocation, capturedReadbacks, scenario, error);
					const finishedAt = now();
					const runManifest = {
						schemaVersion: 1,
						runId,
						action: action.action,
						variant: variant.variant,
						variantId: variant.id,
						scenario: scenario.scenario,
						scenarioId: scenario.id,
						runIndex: action.runIndex,
						fixtureRoot: scenario.objectManifest.root ?? null,
						startedAt: startedAt.toISOString(),
						finishedAt: finishedAt.toISOString(),
						durationMs: Math.max(0, finishedAt.getTime() - startedAt.getTime()),
						publicRequestDigest: digest(scenario.request),
						bridgeRequestDigest: invocation.bridge?.request !== undefined ? digest(invocation.bridge.request) : scenario.bridgeRequest ? digest(scenario.bridgeRequest) : null,
						expectedOutcome: scenario.expectedOutcome,
						actualOutcome: status,
						execution: scenario.execution,
						preconditionBlockers: scenario.preconditionBlockers ?? [],
						ascetCall: preconditionBlocked ? "not_started" : "started",
						bridgeEvidence: invocation.bridge ? "captured" : "missing",
						readback: readbackSpecs.length === 0 ? "not-applicable" : allReadbacksPassed(capturedReadbacks, readbackSpecs) ? "captured" : "missing",
                        readbackSteps: capturedReadbacks.map(({ spec, invocation, error: readbackError }) => ({ id: spec.id, phase: spec.phase, status: readbackError ? "error" : readbackPassed(invocation) ? "passed" : "failed", error: readbackError ?? null })),
						retentionState: "pending-human-review",
						cleanupAllowed: false,
						error: error ?? null,
						evidencePaths: requiredEvidencePaths(outputRoot, runPath),
					};
					writeJsonOnce(join(runPath, "run-manifest.json"), runManifest);
					appendFileSync(join(outputRoot, "retention-index.ndjson"), `${JSON.stringify({ campaignId: plan.campaignId, runId, channel: plan.channel, action: action.action, variant: variant.variant, scenario: scenario.scenario, root: scenario.objectManifest.root ?? null, retentionState: "pending-human-review", cleanupDependency: "human-review" })}\n`, "utf8");
					appendFileSync(join(outputRoot, "human-review.md"), `- ${runId}: ${status}; retention=pending-human-review; cleanup=disabled\n`, "utf8");
					actions.push({ runId, action: action.action, variant: variant.variant, scenario: scenario.scenario, status, error, durationMs: runManifest.durationMs, runPath });
				}
			}
		}
	} finally {
		releaseWriter();
	}
	const counts: Record<CampaignStatus, number> = { PASS: 0, FAIL: 0, BLOCKED: 0, NOT_RUN: 0 };
	for (const action of actions) counts[action.status] += 1;
	const status: CampaignStatus = counts.FAIL > 0 ? "FAIL" : counts.BLOCKED > 0 || counts.NOT_RUN > 0 ? "BLOCKED" : "PASS";
	const summary: CampaignSummary = { campaignId: plan.campaignId, channel: plan.channel, status, actions, counts, cleanupAllowed: false };
	writeJsonOnce(join(outputRoot, "campaign-summary.json"), summary);
	return summary;
}

export function loadCampaignPlan(path: string): CampaignPlan {
	return JSON.parse(readFileSync(path, "utf8").replace(/^\uFEFF/, "")) as CampaignPlan;
}

function usage(): never {
	console.error("Usage: tsx scripts/ascet-edit-live-campaign.ts --plan <plan.json> --output <campaign-dir> [--execute --cwd <ascet-cwd>]");
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
	if (!planPath || !outputRoot) usage();
	const plan = loadCampaignPlan(resolve(planPath));
	validateCampaignPlan(plan);
	if (args.includes("--execute")) {
		throw new Error("Use scripts/ascet-edit-live-campaign-live.ts for live execution; this entry point is validation-only.");
	}
	const variants = plan.actions.reduce((total, action) => total + action.variants.length, 0);
	const runs = plan.actions.reduce((total, action) => total + action.variants.reduce((variantTotal, variant) => variantTotal + variant.scenarios.length, 0), 0);
	console.log(JSON.stringify({ valid: true, campaignId: plan.campaignId, channel: plan.channel, actions: plan.actions.length, variants, runs, execute: false, outputRoot: resolve(outputRoot), message: "Validation only; no ASCET calls or writes were performed." }, null, 2));
}

const entryPath = process.argv[1] ? resolve(process.argv[1]) : "";
if (entryPath === fileURLToPath(import.meta.url)) await main();

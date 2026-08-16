import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { setTimeout as delay } from "node:timers/promises";
import { loadExtensions } from "../packages/coding-agent/src/core/extensions/loader.ts";
import {
	formatAscetGetResult,
	runAscetGet,
	type AscetGetParams,
} from "../packages/ascet-extension/src/get.ts";
import type { AscetPermissionRule, PermissionMode } from "../packages/ascet-extension/src/permissions/types.ts";
import { renderAscetToolResult } from "../packages/ascet-extension/src/rendering.ts";

const AUTHORIZATION = "I_AUTHORIZE_DISPOSABLE_ASCET_WRITES";
const repoRoot = resolve(process.cwd());
const enabled = process.env.ASCET_PERMISSION_LIVE_VALIDATE === "1";
const cleanupOnly = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_ONLY === "1";
const ascetCwd = resolve(process.env.ASCET_PERMISSION_SMOKE_CWD ?? repoRoot);
const cleanupRoot = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_ROOT?.trim();
const smokeRoot = cleanupOnly
	? (cleanupRoot ?? "")
	: (process.env.ASCET_PERMISSION_SMOKE_ROOT ?? "DEMO\\__pi_permission_smoke__");
const cleanupSourceArtifactRoot = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_SOURCE_ARTIFACT_ROOT?.trim();
const approvalDelayMs = Number.parseInt(process.env.ASCET_PERMISSION_SMOKE_APPROVAL_DELAY_MS ?? "31000", 10);
const runStamp = new Date().toISOString().replaceAll(":", "-");
const evidenceRoot = resolve(
	process.env.ASCET_PERMISSION_SMOKE_EVIDENCE_DIR ?? join(repoRoot, "artifacts", "ascet-permission-live", runStamp),
);
const runtimeArtifactRoot = join(evidenceRoot, "runtime-artifacts");
const permissionConfigPath = join(ascetCwd, ".ascet", "permissions.json");
const originalPermissionConfig = existsSync(permissionConfigPath) ? readFileSync(permissionConfigPath) : undefined;

if (!enabled) {
	console.log(
		JSON.stringify(
			{
				ok: true,
				skipped: true,
				reason: "Set ASCET_PERMISSION_LIVE_VALIDATE=1 after explicit operator approval.",
				requiredAuthorization: `ASCET_PERMISSION_LIVE_AUTHORIZATION=${AUTHORIZATION}`,
				requiredFixtures: [
					"ASCET_PERMISSION_SMOKE_DATABASE_FINGERPRINT",
					"ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT",
					"ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT",
					"ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT",
				],
				ascetCwd,
				smokeRoot,
			},
			null,
			2,
		),
	);
	process.exit(0);
}

if (process.env.ASCET_PERMISSION_LIVE_AUTHORIZATION !== AUTHORIZATION) {
	throw new Error(
		`Live validation requires the exact authorization gate ASCET_PERMISSION_LIVE_AUTHORIZATION=${AUTHORIZATION}.`,
	);
}
if (!cleanupOnly && (!Number.isFinite(approvalDelayMs) || approvalDelayMs <= 30_000)) {
	throw new Error("ASCET_PERMISSION_SMOKE_APPROVAL_DELAY_MS must be greater than 30000.");
}

function requireEnvironment(name: string): string {
	const value = process.env[name]?.trim();
	if (!value) throw new Error(`${name} is required for the complete live-validation matrix.`);
	return value;
}

const expectedDatabaseFingerprint = requireEnvironment("ASCET_PERMISSION_SMOKE_DATABASE_FINGERPRINT");
if (cleanupOnly) {
	if (!cleanupRoot) throw new Error("ASCET_PERMISSION_SMOKE_CLEANUP_ROOT is required in cleanup-only mode.");
	const normalizedCleanupRoot = cleanupRoot.replaceAll("/", "\\").replace(/^\\+|\\+$/gu, "");
	if (!/^DEMO\\__pi_permission_smoke__[a-z0-9][a-z0-9._-]*$/iu.test(normalizedCleanupRoot)) {
		throw new Error("Cleanup root must be one exact DEMO\\__pi_permission_smoke__* folder without child segments or wildcards.");
	}
}
const regressionComponent = cleanupOnly
	? (process.env.ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT?.trim() ?? "")
	: requireEnvironment("ASCET_PERMISSION_SMOKE_REGRESSION_COMPONENT");
const readOnlyComponent = cleanupOnly
	? (process.env.ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT?.trim() ?? "")
	: requireEnvironment("ASCET_PERMISSION_SMOKE_READ_ONLY_COMPONENT");
const failureComponent = cleanupOnly
	? (process.env.ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT?.trim() ?? "")
	: requireEnvironment("ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT");
const cleanupMethodComponent = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_METHOD_COMPONENT?.trim();
const cleanupMethodName = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_METHOD_NAME?.trim();
const cleanupFailureComponent = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_FAILURE_COMPONENT?.trim();
const cleanupFailureMethod = process.env.ASCET_PERMISSION_SMOKE_CLEANUP_FAILURE_METHOD?.trim();
if ((cleanupMethodComponent === undefined) !== (cleanupMethodName === undefined)) {
	throw new Error("Cleanup method component and name must be provided together.");
}
if ((cleanupFailureComponent === undefined) !== (cleanupFailureMethod === undefined)) {
	throw new Error("Cleanup failure component and method must be provided together.");
}
const regressionMethod = process.env.ASCET_PERMISSION_SMOKE_REGRESSION_METHOD ?? "PiUnsupportedAction";
const readOnlyMethod = process.env.ASCET_PERMISSION_SMOKE_READ_ONLY_METHOD ?? "PiCompoundMethod";
const failureMethod = process.env.ASCET_PERMISSION_SMOKE_FAILURE_METHOD ?? "PiForcedFailure";
const failureMethodKind = process.env.ASCET_PERMISSION_SMOKE_FAILURE_METHOD_KIND ?? "action";
const failureComponentKind = process.env.ASCET_PERMISSION_SMOKE_FAILURE_COMPONENT_KIND ?? "statemachine";
const expectedFailureCode = process.env.ASCET_PERMISSION_SMOKE_FAILURE_CODE;
const expectedRegressionCode =
	process.env.ASCET_PERMISSION_SMOKE_REGRESSION_CODE ?? "create_method_capability_not_supported";
const editableComponent = `${smokeRoot}\\EditableClass`;
const defaultFolder = smokeRoot;
const acceptFolder = `${smokeRoot}\\AcceptEdits`;
const autoAllowFolder = `${smokeRoot}\\AutoAllowed`;
const deniedFolder = `${smokeRoot}\\Denied`;
const acceptMethod = "PiAcceptMethod";
const highRiskMethod = "PiHighRiskMethod";
const mediumElement = "P_AutoMedium";
const codeFile = join(evidenceRoot, "PiHighRiskMethod.esdl");
const runtimeEnv: Record<string, string | undefined> = {
	...process.env,
	PI_ASCET_EXTENSION_ARTIFACT_ROOT: runtimeArtifactRoot,
	PI_ASCET_RUN_ID: `permission-live-${runStamp}`,
	PI_ASCET_WRITE_CLASS: "isolated_fixture",
};

mkdirSync(evidenceRoot, { recursive: true });
mkdirSync(runtimeArtifactRoot, { recursive: true });
if (!cleanupOnly) writeFileSync(codeFile, "// permission-mode live validation\nreturn 1.0;\n", "utf8");

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function readRecord(value: unknown, ...path: string[]): Record<string, unknown> | undefined {
	let current = value;
	for (const key of path) current = asRecord(current)?.[key];
	return asRecord(current);
}

function readString(value: unknown, ...path: string[]): string | undefined {
	let current = value;
	for (const key of path) current = asRecord(current)?.[key];
	return typeof current === "string" ? current : undefined;
}

function readBoolean(value: unknown, ...path: string[]): boolean | undefined {
	let current = value;
	for (const key of path) current = asRecord(current)?.[key];
	return typeof current === "boolean" ? current : undefined;
}

function readNumber(value: unknown, ...path: string[]): number | undefined {
	let current = value;
	for (const key of path) current = asRecord(current)?.[key];
	return typeof current === "number" && Number.isFinite(current) ? current : undefined;
}

function assertCondition(condition: unknown, message: string): asserts condition {
	if (!condition) throw new Error(message);
}

function normalizePath(value: string): string {
	return value.replaceAll("/", "\\").replace(/^\\+/u, "").toLocaleLowerCase();
}

function collectPaths(value: unknown, paths: string[] = []): string[] {
	if (Array.isArray(value)) {
		for (const item of value) collectPaths(item, paths);
		return paths;
	}
	const record = asRecord(value);
	if (!record) return paths;
	if (typeof record.path === "string") paths.push(record.path);
	for (const child of Object.values(record)) collectPaths(child, paths);
	return paths;
}

function writeEvidence(name: string, value: unknown): void {
	const safeName = name.replace(/[^a-z0-9_.-]+/giu, "-");
	writeFileSync(join(evidenceRoot, `${safeName}.json`), `${JSON.stringify(value, null, 2)}\n`, "utf8");
}

const extensionPath = resolve(repoRoot, ".pi/extensions/ascet/index.ts");
const loadResult = await loadExtensions([extensionPath], repoRoot);
if (loadResult.errors.length > 0) {
	throw new Error(`ASCET extension failed to load: ${JSON.stringify(loadResult.errors)}`);
}
const extension = loadResult.extensions.find((entry) => entry.path.replaceAll("\\", "/").endsWith("ascet/index.ts"));
if (!extension) throw new Error("ASCET extension was not loaded.");
for (const toolName of ["ascet_status", "ascet_scheduler_status", "ascet_get", "ascet_read", "ascet_edit"]) {
	if (!extension.tools.get(toolName)?.definition) throw new Error(`ASCET tool is not registered: ${toolName}`);
}
const permissionCommand = extension.commands.get("ascet-permission");
if (!permissionCommand) throw new Error("ASCET permission command is not registered.");
const permissionEntries: Array<{ customType: string; data?: unknown }> = [];
loadResult.runtime.appendEntry = (customType, data) => permissionEntries.push({ customType, data });

function writePermissionConfig(rules: readonly AscetPermissionRule[]): void {
	mkdirSync(join(ascetCwd, ".ascet"), { recursive: true });
	writeFileSync(permissionConfigPath, `${JSON.stringify({ defaultMode: "default", rules }, null, 2)}\n`, "utf8");
}

function restorePermissionConfig(): void {
	if (originalPermissionConfig) writeFileSync(permissionConfigPath, originalPermissionConfig);
	else rmSync(permissionConfigPath, { force: true });
}

async function setPermissionMode(mode: PermissionMode): Promise<void> {
	const commandMode = mode === "acceptEdits" ? "accept-edits" : mode;
	await permissionCommand.handler(
		commandMode,
		{
			cwd: ascetCwd,
			isIdle: () => true,
			ui: { notify() {}, setStatus() {} },
		} as unknown as Parameters<typeof permissionCommand.handler>[1],
	);
}

const signal = new AbortController().signal;
let callIndex = 0;

async function executeLegacyGet(params: Record<string, unknown>) {
	const typedParams = params as unknown as AscetGetParams;
	const result = await runAscetGet(typedParams, { cwd: ascetCwd, env: runtimeEnv, signal });
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

async function executeTool(
	stage: string,
	toolName: string,
	params: Record<string, unknown>,
	context: Record<string, unknown>,
) {
	const tool = extension.tools.get(toolName)?.definition;
	if (!tool) throw new Error(`ASCET tool is not registered: ${toolName}`);
	const callNumber = ++callIndex;
	const startedAt = new Date().toISOString();
	const mode = context.__ascetLivePermissionMode;
	const rules = context.__ascetLivePermissionRules;
	if (mode === "default" || mode === "acceptEdits" || mode === "auto") {
		await setPermissionMode(mode);
		writePermissionConfig(Array.isArray(rules) ? (rules as AscetPermissionRule[]) : []);
	}
	let response: unknown;
	try {
		response =
			toolName === "ascet_get"
				? await executeLegacyGet(params)
				: await tool.execute(`ascet-permission-live-${callNumber}`, params, signal, undefined, context);
	} finally {
		if (mode === "default" || mode === "acceptEdits" || mode === "auto") restorePermissionConfig();
	}
	writeEvidence(`${String(callNumber).padStart(3, "0")}-${stage}`, {
		stage,
		startedAt,
		finishedAt: new Date().toISOString(),
		request: { toolName, params, permissionMode: mode, rules },
		response,
	});
	return response;
}

function permissionContext(
	mode: PermissionMode,
	confirm?: (title: string, message: string) => Promise<boolean>,
	rules: readonly AscetPermissionRule[] = [],
): Record<string, unknown> {
	return {
		cwd: ascetCwd,
		env: runtimeEnv,
		__ascetLivePermissionMode: mode,
		__ascetLivePermissionRules: rules,
		hasUI: confirm !== undefined,
		...(confirm ? { ui: { confirm } } : {}),
	};
}

function readContext(): Record<string, unknown> {
	return { cwd: ascetCwd, env: runtimeEnv };
}

function details(response: unknown): Record<string, unknown> {
	const result = asRecord(response);
	const value = asRecord(result?.details);
	if (!value) throw new Error("Tool response did not contain details.");
	return value;
}

function outcome(response: unknown): Record<string, unknown> {
	const value = asRecord(details(response).outcome);
	if (!value) throw new Error("Tool response did not contain an outcome.");
	return value;
}

function responseText(response: unknown): string | undefined {
	const contentItems = asRecord(response)?.content;
	if (!Array.isArray(contentItems)) return undefined;
	for (const item of contentItems) {
		const record = asRecord(item);
		if (record?.type === "text" && typeof record.text === "string") return record.text;
	}
	return undefined;
}

function databaseIdentity(response: unknown): Record<string, unknown> {
	const text = responseText(response);
	const parsed = text ? asRecord(JSON.parse(text)) : undefined;
	const identity = asRecord(parsed?.databaseIdentity);
	if (!identity) throw new Error("ascet_get.database_identity did not return databaseIdentity.");
	return identity;
}

function mutationResult(response: unknown): Record<string, unknown> {
	const value = asRecord(details(response).mutationResult);
	if (!value) throw new Error("ASCET mutation response did not contain mutationResult.");
	return value;
}

function assertMutation(
	response: unknown,
	expectedEnvelope: string | readonly string[],
	expectedMutation: string | readonly string[],
): Record<string, unknown> {
	const envelope = mutationResult(response);
	const envelopeStatuses = Array.isArray(expectedEnvelope) ? expectedEnvelope : [expectedEnvelope];
	const mutationStatuses = Array.isArray(expectedMutation) ? expectedMutation : [expectedMutation];
	const actualEnvelope = readString(envelope, "status");
	const actualMutation = readString(envelope, "mutation", "status");
	assertCondition(
		envelopeStatuses.includes(actualEnvelope ?? ""),
		`Expected mutation envelope ${envelopeStatuses.join("/")}, received ${actualEnvelope ?? "missing"}.`,
	);
	assertCondition(
		mutationStatuses.includes(actualMutation ?? ""),
		`Expected mutation status ${mutationStatuses.join("/")}, received ${actualMutation ?? "missing"}.`,
	);
	return envelope;
}

function assertVerified(response: unknown): void {
	const envelope = mutationResult(response);
	assertCondition(
		readString(envelope, "verification", "status") === "passed",
		`Mutation verification was ${readString(envelope, "verification", "status") ?? "missing"}.`,
	);
}

function assertOutcomeOk(response: unknown): void {
	const status = readString(outcome(response), "status");
	assertCondition(status === "ok" || status === "preflight", `Expected successful outcome, received ${status ?? "missing"}.`);
}

function assertEditableValue(response: unknown, expected: boolean): void {
	const value = outcome(response).data;
	assertCondition(value === expected, `Expected editable=${expected}, received ${String(value)}.`);
}

async function assertMethodAbsent(stage: string, componentPath: string, methodName: string): Promise<void> {
	const response = await executeTool(
		stage,
		"ascet_read",
		{ action: "read_method_signature", componentPath, methodName },
		readContext(),
	);
	const report = details(response);
	if (readString(report, "error", "code") === "method_not_found") return;
	const readOutcome = asRecord(report.outcome);
	assertCondition(
		readString(readOutcome, "status") === "error" && readString(readOutcome, "error", "code") === "method_not_found",
		`${componentPath}.${methodName} unexpectedly exists or could not be verified absent.`,
	);
}
async function assertPathAbsent(stage: string, path: string): Promise<void> {
	const response = await executeTool(
		stage,
		"ascet_get",
		{ action: "tree", target: { targetPathPrefix: path }, traversal: { depth: 4, maxFolders: 200, maxComponents: 200 } },
		readContext(),
	);
	const report = details(response);
	if (readString(report, "error", "code") === "folder_not_found") return;
	assertOutcomeOk(response);
	const paths = collectPaths(report);
	const expected = normalizePath(path);
	assertCondition(
		!paths.some((candidate) => normalizePath(candidate) === expected),
		`Expected '${path}' to be absent from the live Tree.`,
	);
}

async function assertSchedulerIdle(stage: string): Promise<unknown> {
	const response = await executeTool(stage, "ascet_scheduler_status", { action: "status", format: "json" }, readContext());
	const report = details(response);
	const scheduler = readRecord(report, "scheduler");
	const cliLock = readRecord(report, "cliLock");
	assertCondition(readNumber(scheduler, "activeCount") === 0, "ASCET scheduler still has an active job.");
	assertCondition(Array.isArray(scheduler?.queuedJobs) && scheduler.queuedJobs.length === 0, "ASCET scheduler queue is not empty.");
	assertCondition(scheduler?.runningJob === null, "ASCET scheduler still reports a running job.");
	assertCondition(readBoolean(cliLock, "locked") === false, "ASCET CLI lock remains held.");
	return response;
}

function unresolvedQuarantines(artifactRoot = runtimeArtifactRoot): Array<Record<string, unknown>> {
	const root = join(artifactRoot, "mutation-guards");
	const results: Array<Record<string, unknown>> = [];
	function visit(directory: string): void {
		let entries;
		try {
			entries = readdirSync(directory, { withFileTypes: true });
		} catch {
			return;
		}
		for (const entry of entries) {
			const path = join(directory, entry.name);
			if (entry.isDirectory()) visit(path);
			else if (entry.isFile() && entry.name.endsWith(".json")) {
				const record = asRecord(JSON.parse(readFileSync(path, "utf8")));
				if (record?.status === "quarantined") results.push({ path, ...record });
			}
		}
	}
	visit(root);
	return results;
}

const alwaysApprove = async () => true;
const cleanupResults: unknown[] = [];
let rootCreated = false;
let readOnlyMethodMayExist = false;
let failureMethodMayExist = false;
let primaryError: unknown;

async function cleanupMutation(stage: string, params: Record<string, unknown>): Promise<void> {
	for (let attempt = 0; attempt < 2; attempt++) {
		try {
			const response = await executeTool(
				attempt === 0 ? stage : `${stage}-retry`,
				"ascet_edit",
				{ ...params, intent: "apply" },
				permissionContext("default", alwaysApprove),
			);
			const report = details(response);
			if (readString(report, "mutationResult", "status") !== "ok") {
				const errorCode = readString(report, "mutationResult", "error", "code");
				if (errorCode === "ascet_cli_timeout" && attempt === 0) continue;
				cleanupResults.push({
					stage,
					status: "unresolved",
					mutationResult: report.mutationResult,
					outcome: report.outcome,
				});
				return;
			}
			const changed = readRecord(report, "outcome", "data", "changed");
			const mutationStatus = readString(report, "mutationResult", "mutation", "status");
			const status =
				readBoolean(changed, "alreadyMissing") === true || mutationStatus === "no_op" ? "already_absent" : "removed";
			cleanupResults.push({ stage, status, mutationResult: report.mutationResult, outcome: report.outcome });
			return;
		} catch (error) {
			if (attempt === 0) continue;
			cleanupResults.push({
				stage,
				status: "unresolved",
				error: error instanceof Error ? error.message : String(error),
			});
		}
	}
}

async function runCleanupOnly(): Promise<void> {
	let cleanupError: unknown;
	let finalEditableState: unknown;
	try {
		const initialStatus = await executeTool("cleanup-only-runtime-status", "ascet_status", {}, readContext());
		assertCondition(details(initialStatus).ok === true, "ASCET runtime status is not healthy enough for cleanup.");
		const initialDatabase = await executeTool(
			"cleanup-only-database-identity",
			"ascet_get",
			{ action: "database_identity" },
			readContext(),
		);
		const initialDatabaseIdentity = databaseIdentity(initialDatabase);
		assertCondition(
			initialDatabaseIdentity.fingerprint === expectedDatabaseFingerprint,
			`Live database fingerprint '${String(initialDatabaseIdentity.fingerprint)}' does not match authorized fingerprint '${expectedDatabaseFingerprint}'.`,
		);
		await assertSchedulerIdle("cleanup-only-initial-scheduler-status");
		const rootBefore = await executeTool(
			"cleanup-only-root-before",
			"ascet_get",
			{ action: "tree", target: { targetPathPrefix: smokeRoot }, traversal: { depth: 4, maxFolders: 200, maxComponents: 200 } },
			readContext(),
		);
		const rootBeforeReport = details(rootBefore);
		const rootBeforeError = readString(rootBeforeReport, "error", "code");
		assertCondition(
			rootBeforeError === undefined || rootBeforeError === "folder_not_found",
			`Could not inspect cleanup root: ${rootBeforeError ?? "unknown_error"}.`,
		);
		const existingPaths = new Set(collectPaths(rootBeforeReport).map(normalizePath));
		if (cleanupMethodComponent && cleanupMethodName) {
			const methodBefore = await executeTool(
				"cleanup-only-method-before",
				"ascet_read",
				{ action: "read_method_signature", componentPath: cleanupMethodComponent, methodName: cleanupMethodName },
				readContext(),
			);
			const methodBeforeError = readString(details(methodBefore), "error", "code");
			if (methodBeforeError === "method_not_found") {
				cleanupResults.push({ stage: "cleanup-only-method", status: "already_absent" });
			} else {
				assertCondition(methodBeforeError === undefined, `Could not inspect cleanup method: ${methodBeforeError}.`);
				await cleanupMutation("cleanup-only-method", {
					action: "delete_method",
					componentPath: cleanupMethodComponent,
					methodName: cleanupMethodName,
					ifMissing: "ignore",
				});
			}
		}
		if (cleanupFailureComponent && cleanupFailureMethod) {
			const failureMethodBefore = await executeTool(
				"cleanup-only-failure-method-before",
				"ascet_read",
				{ action: "read_method_signature", componentPath: cleanupFailureComponent, methodName: cleanupFailureMethod },
				readContext(),
			);
			const failureMethodBeforeError = readString(details(failureMethodBefore), "error", "code");
			if (failureMethodBeforeError === "method_not_found") {
				cleanupResults.push({ stage: "cleanup-only-failure-method", status: "already_absent" });
			} else {
				assertCondition(
					failureMethodBeforeError === undefined,
					`Could not inspect cleanup failure method: ${failureMethodBeforeError}.`,
				);
				await cleanupMutation("cleanup-only-failure-method", {
					action: "delete_method",
					componentPath: cleanupFailureComponent,
					methodName: cleanupFailureMethod,
					ifMissing: "ignore",
				});
			}
		}
		for (const target of [
			{
				stage: "cleanup-only-editable-component",
				path: editableComponent,
				params: { action: "delete_component", componentPath: editableComponent, ifMissing: "ignore" },
			},
			{
				stage: "cleanup-only-auto-folder",
				path: autoAllowFolder,
				params: { action: "delete_folder", folderPath: autoAllowFolder, ifMissing: "ignore" },
			},
			{
				stage: "cleanup-only-accept-folder",
				path: acceptFolder,
				params: { action: "delete_folder", folderPath: acceptFolder, ifMissing: "ignore" },
			},
			{
				stage: "cleanup-only-root-folder",
				path: smokeRoot,
				params: { action: "delete_folder", folderPath: smokeRoot, ifMissing: "ignore" },
			},
		]) {
			if (existingPaths.has(normalizePath(target.path))) await cleanupMutation(target.stage, target.params);
			else cleanupResults.push({ stage: target.stage, status: "already_absent" });
		}

		await assertPathAbsent("cleanup-only-root-readback", smokeRoot);
		if (cleanupMethodComponent && cleanupMethodName) {
			await assertMethodAbsent("cleanup-only-method-readback", cleanupMethodComponent, cleanupMethodName);
			finalEditableState = details(
				await executeTool(
					"cleanup-only-method-component-editability",
					"ascet_edit",
					{ mode: "check", componentPath: cleanupMethodComponent },
					readContext(),
				),
			).outcome;
		}
		if (cleanupFailureComponent && cleanupFailureMethod) {
			await assertMethodAbsent(
				"cleanup-only-failure-method-readback",
				cleanupFailureComponent,
				cleanupFailureMethod,
			);
		}
		await executeTool("cleanup-only-final-runtime-status", "ascet_status", {}, readContext());
		const finalDatabase = await executeTool(
			"cleanup-only-final-database-identity",
			"ascet_get",
			{ action: "database_identity" },
			readContext(),
		);
		assertCondition(
			databaseIdentity(finalDatabase).fingerprint === expectedDatabaseFingerprint,
			"Database fingerprint changed during cleanup.",
		);
		await assertSchedulerIdle("cleanup-only-final-scheduler-status");
		const artifactRoots = [runtimeArtifactRoot, cleanupSourceArtifactRoot ? resolve(cleanupSourceArtifactRoot) : undefined]
			.filter((value): value is string => value !== undefined)
			.filter((value, index, values) => values.indexOf(value) === index);
		const quarantines = artifactRoots.flatMap((artifactRoot) => unresolvedQuarantines(artifactRoot));
		writeEvidence("cleanup-only-final-quarantine-status", { artifactRoots, unresolved: quarantines });
		assertCondition(quarantines.length === 0, `Unresolved mutation quarantines remain: ${JSON.stringify(quarantines)}`);
	} catch (error) {
		cleanupError = error;
	}
	writeEvidence("summary", {
		ok: cleanupError === undefined,
		mode: "cleanup_only",
		ascetCwd,
		smokeRoot,
		expectedDatabaseFingerprint,
		cleanupMethodComponent,
		cleanupMethodName,
		cleanupFailureComponent,
		cleanupFailureMethod,
		finalEditableState,
		cleanupResults,
		error: cleanupError instanceof Error ? cleanupError.message : cleanupError ? String(cleanupError) : undefined,
	});
	if (cleanupError) throw cleanupError;
	console.log(JSON.stringify({ ok: true, mode: "cleanup_only", evidenceRoot, smokeRoot, cleanupResults }, null, 2));
}

async function runFullValidation(): Promise<void> {
try {
	const initialStatus = await executeTool("setup-runtime-status", "ascet_status", {}, readContext());
	assertCondition(details(initialStatus).ok === true, "ASCET runtime status is not healthy enough for validation.");
	const initialDatabase = await executeTool("setup-database-identity", "ascet_get", { action: "database_identity" }, readContext());
	const initialDatabaseIdentity = databaseIdentity(initialDatabase);
	assertCondition(
		initialDatabaseIdentity.fingerprint === expectedDatabaseFingerprint,
		`Live database fingerprint '${String(initialDatabaseIdentity.fingerprint)}' does not match authorized fingerprint '${expectedDatabaseFingerprint}'.`,
	);
	await assertSchedulerIdle("setup-scheduler-status");
	await assertPathAbsent("setup-smoke-root-absent", smokeRoot);
	await assertMethodAbsent("setup-regression-method-absent", regressionComponent, regressionMethod);
	await assertMethodAbsent("setup-read-only-method-absent", readOnlyComponent, readOnlyMethod);
	await assertMethodAbsent("setup-failure-method-absent", failureComponent, failureMethod);

	const readOnlyInitial = await executeTool(
		"setup-read-only-editability",
		"ascet_edit",
		{ mode: "check", componentPath: readOnlyComponent },
		readContext(),
	);
	assertEditableValue(readOnlyInitial, false);
	const failureInitial = await executeTool(
		"setup-failure-editability",
		"ascet_edit",
		{ mode: "check", componentPath: failureComponent },
		readContext(),
	);
	assertEditableValue(failureInitial, false);

	let defaultConfirmations = 0;
	let approvalOpenedAt = 0;
	let approvalClosedAt = 0;
	const defaultResponse = await executeTool(
		"default-create-folder-long-approval",
		"ascet_edit",
		{ action: "create_folder", folderPath: defaultFolder, intent: "apply" },
		permissionContext("default", async () => {
			defaultConfirmations += 1;
			approvalOpenedAt = Date.now();
			await assertSchedulerIdle("default-approval-resource-status");
			await delay(approvalDelayMs);
			approvalClosedAt = Date.now();
			return true;
		}),
	);
	rootCreated = true;
	assertCondition(defaultConfirmations === 1, `Default create_folder requested ${defaultConfirmations} confirmations.`);
	assertCondition(
		approvalClosedAt - approvalOpenedAt >= approvalDelayMs,
		"Default approval did not remain open for the configured duration.",
	);
	assertMutation(defaultResponse, "ok", "applied");
	assertVerified(defaultResponse);

	const defaultNoOp = await executeTool(
		"default-create-folder-no-op",
		"ascet_edit",
		{ action: "create_folder", folderPath: defaultFolder, intent: "apply" },
		permissionContext("default"),
	);
	assertMutation(defaultNoOp, "ok", "no_op");
	assertVerified(defaultNoOp);

	const acceptFolderResponse = await executeTool(
		"accept-edits-create-folder",
		"ascet_edit",
		{ action: "create_folder", folderPath: acceptFolder, intent: "apply" },
		permissionContext("acceptEdits"),
	);
	assertMutation(acceptFolderResponse, "ok", "applied");
	assertVerified(acceptFolderResponse);

	const createEditableComponent = await executeTool(
		"accept-edits-create-component",
		"ascet_edit",
		{
			action: "create_component",
			componentPath: editableComponent,
			kind: "class",
			language: "ESDL",
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("acceptEdits"),
	);
	assertMutation(createEditableComponent, "ok", "applied");
	assertVerified(createEditableComponent);

	let editableCheck = await executeTool(
		"accept-edits-created-component-editability",
		"ascet_edit",
		{ mode: "check", componentPath: editableComponent },
		readContext(),
	);
	if (outcome(editableCheck).data === false) {
		const setEditable = await executeTool(
			"setup-created-component-editability",
			"ascet_edit",
			{ mode: "set", componentPath: editableComponent, intent: "apply" },
			permissionContext("default", alwaysApprove),
		);
		assertOutcomeOk(setEditable);
		editableCheck = await executeTool(
			"setup-created-component-editability-readback",
			"ascet_edit",
			{ mode: "check", componentPath: editableComponent },
			readContext(),
		);
	}
	assertEditableValue(editableCheck, true);

	const acceptMethodResponse = await executeTool(
		"accept-edits-create-method",
		"ascet_edit",
		{
			action: "create_method",
			componentPath: editableComponent,
			componentKind: "class",
			methodName: acceptMethod,
			methodKind: "abstract",
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("acceptEdits"),
	);
	assertMutation(acceptMethodResponse, "ok", "applied");
	assertVerified(acceptMethodResponse);

	let compoundConfirmations = 0;
	readOnlyMethodMayExist = true;
	const compoundResponse = await executeTool(
		"accept-edits-read-only-compound",
		"ascet_edit",
		{
			action: "create_method",
			componentPath: readOnlyComponent,
			methodName: readOnlyMethod,
			methodKind: process.env.ASCET_PERMISSION_SMOKE_READ_ONLY_METHOD_KIND ?? "abstract",
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("acceptEdits", async () => {
			compoundConfirmations += 1;
			return true;
		}),
	);
	assertCondition(compoundConfirmations === 1, `Compound write requested ${compoundConfirmations} confirmations.`);
	const compoundEnvelope = assertMutation(compoundResponse, "ok", "applied");
	assertVerified(compoundResponse);
	assertCondition(readString(compoundEnvelope, "editability", "status") === "acquired", "Compound write did not report acquired editability.");
	assertCondition(
		readBoolean(compoundEnvelope, "editability", "acquiredByThisOperation") === true,
		"Compound write did not preserve acquiredByThisOperation evidence.",
	);
	assertCondition(readBoolean(compoundEnvelope, "bridge", "bridgeEntered") === true, "Compound write never entered Bridge.");
	const compoundRaw = readRecord(details(compoundResponse), "raw");
	const compoundRequest = readRecord(compoundRaw, "request");
	assertCondition(
		Array.isArray(compoundRequest?.args) && compoundRequest.args[1] === "guarded_create_method",
		"Compound write did not use the single-session guarded_create_method backend.",
	);
	const readOnlyFinal = await executeTool(
		"accept-edits-read-only-final-state",
		"ascet_edit",
		{ mode: "check", componentPath: readOnlyComponent },
		readContext(),
	);
	assertEditableValue(readOnlyFinal, true);

	const autoAllowed = await executeTool(
		"auto-safe-allow-rule",
		"ascet_edit",
		{ action: "create_folder", folderPath: autoAllowFolder, intent: "apply" },
		permissionContext("auto", undefined, [{ behavior: "allow", action: "create_folder", path: autoAllowFolder }]),
	);
	const autoAllowedEnvelope = assertMutation(autoAllowed, "ok", "applied");
	assertCondition(readString(autoAllowedEnvelope, "permission", "decision") === "allow", "Auto safe rule did not allow the write.");

	let mediumConfirmations = 0;
	const mediumResponse = await executeTool(
		"auto-medium-without-allow",
		"ascet_edit",
		{
			action: "apply_element_spec",
			componentPath: editableComponent,
			elementIntent: "create",
			elements: [
				{
					role: "standardPrimitive",
					name: mediumElement,
					kind: "parameter",
					modelType: "cont",
					scope: "local",
					data: { value: 0 },
					physicalRange: { min: -1, max: 1 },
					impl: { valueType: "real32" },
				},
			],
			intent: "apply",
		},
		permissionContext("auto", async () => {
			mediumConfirmations += 1;
			return true;
		}),
	);
	assertCondition(mediumConfirmations === 1, `Auto medium write requested ${mediumConfirmations} confirmations.`);
	const mediumEnvelope = assertMutation(mediumResponse, "ok", "applied");
	assertCondition(readString(mediumEnvelope, "permission", "risk") === "medium", "Auto medium scenario did not remain medium risk.");
	assertVerified(mediumResponse);

	const highMethodResponse = await executeTool(
		"setup-high-risk-method",
		"ascet_edit",
		{
			action: "create_method",
			componentPath: editableComponent,
			componentKind: "class",
			methodName: highRiskMethod,
			methodKind: "abstract",
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("acceptEdits"),
	);
	assertMutation(highMethodResponse, "ok", "applied");

	let highConfirmations = 0;
	const highResponse = await executeTool(
		"auto-high-risk-with-allow",
		"ascet_edit",
		{ action: "set_method_code", componentPath: editableComponent, methodName: highRiskMethod, codeFile, intent: "apply" },
		permissionContext("auto", async () => {
			highConfirmations += 1;
			return true;
		}, [{ behavior: "allow", action: "set_method_code", path: editableComponent }]),
	);
	assertCondition(highConfirmations === 1, `Auto high-risk write requested ${highConfirmations} confirmations.`);
	const highEnvelope = assertMutation(highResponse, "ok", "applied");
	assertCondition(readString(highEnvelope, "permission", "risk") === "high", "High-risk allow rule incorrectly lowered risk.");
	assertCondition(readString(highEnvelope, "permission", "decision") === "ask", "High-risk allow rule bypassed confirmation.");
	assertVerified(highResponse);

	const deniedResponse = await executeTool(
		"auto-scoped-deny",
		"ascet_edit",
		{ action: "create_folder", folderPath: deniedFolder, intent: "apply" },
		permissionContext("auto", undefined, [{ behavior: "deny", action: "create_folder", path: deniedFolder }]),
	);
	const deniedEnvelope = assertMutation(deniedResponse, "blocked", "not_started");
	assertCondition(readString(deniedEnvelope, "permission", "decision") === "deny", "Scoped deny did not produce deny.");
	assertCondition(readBoolean(deniedEnvelope, "bridge", "bridgeEntered") === false, "Scoped deny entered the mutation Bridge.");
	await assertPathAbsent("auto-scoped-deny-readback", deniedFolder);

	let regressionConfirmations = 0;
	const regressionResponse = await executeTool(
		"capability-regression",
		"ascet_edit",
		{
			action: "create_method",
			componentPath: regressionComponent,
			componentKind: "statemachine",
			methodName: regressionMethod,
			methodKind: "action",
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("default", async () => {
			regressionConfirmations += 1;
			return true;
		}),
	);
	assertCondition(regressionConfirmations === 0, "Capability regression opened an approval dialog.");
	const regressionEnvelope = assertMutation(regressionResponse, "error", "not_started");
	assertCondition(
		readString(regressionEnvelope, "error", "code") === expectedRegressionCode,
		`Capability regression returned ${readString(regressionEnvelope, "error", "code") ?? "missing"}.`,
	);
	assertCondition(readBoolean(regressionEnvelope, "bridge", "bridgeEntered") === false, "Capability regression entered the mutation Bridge.");
	assertCondition(
		readBoolean(regressionEnvelope, "editability", "acquiredByThisOperation") !== true,
		"Capability regression acquired editability.",
	);
	const renderedRegression = renderAscetToolResult(
		{ details: details(regressionResponse) },
		{ expanded: false, isPartial: false },
	).render(200)[0];
	assertCondition(renderedRegression.includes("FAILED"), `Capability regression rendered '${renderedRegression}'.`);
	assertCondition(!renderedRegression.includes("DONE"), "Capability regression rendered DONE.");
	await assertMethodAbsent("capability-regression-readback", regressionComponent, regressionMethod);

	let failureConfirmations = 0;
	failureMethodMayExist = true;
	const failureResponse = await executeTool(
		"editable-acquisition-primary-failure",
		"ascet_edit",
		{
			action: "create_method",
			componentPath: failureComponent,
			componentKind: failureComponentKind,
			methodName: failureMethod,
			methodKind: failureMethodKind,
			ifExists: "fail",
			intent: "apply",
		},
		permissionContext("default", async () => {
			failureConfirmations += 1;
			return true;
		}),
	);
	assertCondition(failureConfirmations === 1, `Forced failure requested ${failureConfirmations} confirmations.`);
	const failureEnvelope = assertMutation(
		failureResponse,
		["partial", "rolled_back"],
		["partially_applied", "rolled_back"],
	);
	assertCondition(
		readBoolean(failureEnvelope, "editability", "acquiredByThisOperation") === true,
		"Forced failure did not acquire editability before the primary mutation failed.",
	);
	const failureRaw = readRecord(details(failureResponse), "raw");
	const failureRequest = readRecord(failureRaw, "request");
	assertCondition(
		Array.isArray(failureRequest?.args) && failureRequest.args[1] === "guarded_create_method",
		"Forced failure did not execute through guarded_create_method.",
	);
	if (expectedFailureCode) {
		assertCondition(
			readString(failureEnvelope, "error", "code") === expectedFailureCode,
			`Forced failure returned ${readString(failureEnvelope, "error", "code") ?? "missing"}.`,
		);
	}
	const failureFinal = await executeTool(
		"editable-acquisition-failure-final-state",
		"ascet_edit",
		{ mode: "check", componentPath: failureComponent },
		readContext(),
	);
	assertEditableValue(failureFinal, true);
} catch (error) {
	primaryError = error;
} finally {
	if (readOnlyMethodMayExist) {
		await cleanupMutation("cleanup-read-only-method", {
			action: "delete_method",
			componentPath: readOnlyComponent,
			methodName: readOnlyMethod,
			ifMissing: "ignore",
		});
	}
	if (failureMethodMayExist) {
		await cleanupMutation("cleanup-failure-method", {
			action: "delete_method",
			componentPath: failureComponent,
			methodName: failureMethod,
			ifMissing: "ignore",
		});
	}
	if (rootCreated) {
		await cleanupMutation("cleanup-editable-component", {
			action: "delete_component",
			componentPath: editableComponent,
			ifMissing: "ignore",
		});
		await cleanupMutation("cleanup-auto-folder", { action: "delete_folder", folderPath: autoAllowFolder, ifMissing: "ignore" });
		await cleanupMutation("cleanup-accept-folder", { action: "delete_folder", folderPath: acceptFolder, ifMissing: "ignore" });
		await cleanupMutation("cleanup-root-folder", { action: "delete_folder", folderPath: smokeRoot, ifMissing: "ignore" });
	}

	try {
		await assertPathAbsent("cleanup-root-readback", smokeRoot);
		await assertMethodAbsent("cleanup-read-only-method-readback", readOnlyComponent, readOnlyMethod);
		await assertMethodAbsent("cleanup-failure-method-readback", failureComponent, failureMethod);
		await executeTool("cleanup-final-runtime-status", "ascet_status", {}, readContext());
		await executeTool("cleanup-final-database-identity", "ascet_get", { action: "database_identity" }, readContext());
		await assertSchedulerIdle("cleanup-final-scheduler-status");
		const quarantines = unresolvedQuarantines();
		writeEvidence("cleanup-final-quarantine-status", { unresolved: quarantines });
		assertCondition(quarantines.length === 0, `Unresolved mutation quarantines remain: ${JSON.stringify(quarantines)}`);
	} catch (cleanupVerificationError) {
		if (!primaryError) primaryError = cleanupVerificationError;
		else cleanupResults.push({ stage: "cleanup-verification", error: String(cleanupVerificationError) });
	}
	writeEvidence("summary", {
		ok: primaryError === undefined,
		ascetCwd,
		smokeRoot,
		regressionComponent,
		readOnlyComponent,
		failureComponent,
		expectedDatabaseFingerprint,
		approvalDelayMs,
		cleanupResults,
		error: primaryError instanceof Error ? primaryError.message : primaryError ? String(primaryError) : undefined,
	});
}

rmSync(codeFile, { force: true });
if (primaryError) throw primaryError;
console.log(JSON.stringify({ ok: true, evidenceRoot, smokeRoot, cleanupResults }, null, 2));
}

try {
	if (cleanupOnly) await runCleanupOnly();
	else await runFullValidation();
} finally {
	restorePermissionConfig();
	writeEvidence("permission-command-entries", { entries: permissionEntries });
}

import { createHash } from "node:crypto";
import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest, RunAscetCliJsonOptions } from "../cli.ts";
import { runAscetCliJson } from "../cli.ts";
import { ASCET_SCHEDULER_DEFAULTS } from "../scheduler/types.ts";
import type {
	AscetComponentKind,
	AscetInspection,
	AscetInspectionDependency,
	AscetInspectionMethod,
	AscetInspectionPort,
} from "./contracts.ts";

export interface AscetInspectionParams {
	componentPath: string;
	objectKind?: AscetComponentKind;
	traceDepth?: number;
	includeMethodCode?: boolean;
	methodNames?: string[];
}

export interface AscetInspectionOperation {
	key: string;
	operation: string;
	args: string[];
	methodName?: string;
}

export interface RunAscetInspectionOptions {
	cwd: string;
	cliPath?: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	queueTimeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: RunAscetCliJsonOptions["scheduler"];
}

export type InspectionOperationResults = Record<string, AscetCliJsonResult | unknown>;

const BASE_OPERATION_NAMES = new Set([
	"read_component_summary",
	"read_component_snapshot",
	"read_component_children:methods",
	"read_component_children:elements",
	"read_component_children:components",
	"read_component_refs",
	"read_implementation",
	"read_state_machine_flow",
]);

export function buildInspectionPlan(params: AscetInspectionParams): AscetInspectionOperation[] {
	const componentPath = normalizeRequiredPath(params.componentPath);
	const traceDepth = normalizeNonNegativeInteger(params.traceDepth, 2);
	const plan: AscetInspectionOperation[] = [
		operation("read_component_summary", ["exec", "read_component_summary", componentPath, "--json"]),
		operation("read_component_snapshot", [
			"exec",
			"read_component_snapshot",
			componentPath,
			"--trace-depth",
			String(traceDepth),
			"--json",
		]),
		operation("read_component_children:methods", [
			"exec",
			"read_component_children",
			componentPath,
			"--group",
			"methods",
			"--json",
		]),
		operation("read_component_children:elements", [
			"exec",
			"read_component_children",
			componentPath,
			"--group",
			"elements",
			"--json",
		]),
		operation("read_component_children:components", [
			"exec",
			"read_component_children",
			componentPath,
			"--group",
			"components",
			"--json",
		]),
		operation("read_component_refs", [
			"exec",
			"read_component_refs",
			componentPath,
			"--direction",
			"out",
			"--depth",
			String(traceDepth),
			"--json",
		]),
		operation("read_implementation", [
			"exec",
			"read_implementation",
			componentPath,
			"--default",
			"--detail-level",
			"full",
			"--json",
		]),
	];
	if (params.objectKind === "statemachine") {
		plan.push(
			operation("read_state_machine_flow", [
				"exec",
				"read_state_machine_flow",
				componentPath,
				"--trace-depth",
				String(traceDepth),
				"--detail-level",
				"full",
				"--json",
			]),
		);
	}
	return plan;
}

export async function runAscetInspection(
	params: AscetInspectionParams,
	options: RunAscetInspectionOptions,
): Promise<{ inspection: AscetInspection; operations: InspectionOperationResults }> {
	const basePlan = buildInspectionPlan(params);
	const operations: InspectionOperationResults = {};
	for (const planned of basePlan) {
		operations[planned.key] = await runInspectionOperation(planned, params, options);
	}

	const methodNames = [
		...new Set(
			(params.methodNames ?? extractMethodNames(operations["read_component_children:methods"]))
				.map((name) => name.trim())
				.filter(Boolean),
		),
	].sort((left, right) => left.localeCompare(right));
	const componentPath = normalizePath(params.componentPath);
	const includeMethodCode = params.includeMethodCode !== false;
	for (const methodName of methodNames) {
		const signature = operation(
			`read_method_signature:${methodName}`,
			["exec", "read_method_signature", componentPath, methodName, "--json"],
			methodName,
		);
		operations[signature.key] = await runInspectionOperation(signature, params, options);
		if (includeMethodCode) {
			const code = operation(
				`read_method_code:${methodName}`,
				["exec", "read_method_code", componentPath, methodName, "--json"],
				methodName,
			);
			operations[code.key] = await runInspectionOperation(code, params, options);
		}
	}

	return { inspection: normalizeInspectionResults(params, operations), operations };
}

export function normalizeInspectionResults(
	params: AscetInspectionParams,
	operations: InspectionOperationResults,
): AscetInspection {
	const errors: string[] = [];
	const warnings: string[] = [];
	const summary = toRecord(unwrapResult(operations.read_component_summary)) ?? {};
	const snapshot = toRecord(unwrapResult(operations.read_component_snapshot)) ?? {};
	const methodsPayload = unwrapResult(operations["read_component_children:methods"]);
	const elementsPayload = unwrapResult(operations["read_component_children:elements"]);
	const componentsPayload = unwrapResult(operations["read_component_children:components"]);
	const refsPayload = unwrapResult(operations.read_component_refs);
	const implementationPayload = unwrapResult(operations.read_implementation);

	for (const [key, value] of Object.entries(operations)) {
		if (!isSuccessfulOperation(value)) {
			const message = operationError(value) ?? "operation failed";
			errors.push(`${key}: ${message}`);
		}
	}
	if (!hasOperation(operations, "read_component_summary")) errors.push("read_component_summary: operation missing");
	if (!hasOperation(operations, "read_component_children:methods"))
		errors.push("read_component_children:methods: operation missing");
	if (!hasOperation(operations, "read_component_children:elements"))
		errors.push("read_component_children:elements: operation missing");
	if (!hasOperation(operations, "read_component_refs")) errors.push("read_component_refs: operation missing");

	const methods = extractMethods(methodsPayload, operations);
	const interfaces = extractInterfaces(elementsPayload);
	const dependencies = extractDependencies(refsPayload, componentsPayload);
	const objectKind = extractObjectKind(summary, snapshot, params.objectKind);
	const stateMachine =
		objectKind === "statemachine" ? toRecord(unwrapResult(operations.read_state_machine_flow)) : undefined;
	const cycles = extractCycles(summary, snapshot);
	if (methods.length === 0) warnings.push("No methods were returned by the methods child read.");
	if (interfaces.inputs.length === 0 && interfaces.outputs.length === 0)
		warnings.push("No input/output interface ports were returned.");
	if (dependencies.length === 0) warnings.push("No outgoing dependencies were returned.");
	if (
		isSuccessfulOperation(implementationPayload) &&
		Object.keys(toRecord(implementationPayload) ?? {}).length === 0
	) {
		warnings.push("Implementation read returned an empty payload.");
	}

	const raw = {
		summary,
		snapshot,
		methods: methodsPayload,
		elements: elementsPayload,
		components: componentsPayload,
		references: refsPayload,
		implementation: implementationPayload,
	};
	const sourceHash = sha256(stableStringify(raw));
	return {
		schemaVersion: "ascet-inspection/v1",
		componentPath: normalizePath(params.componentPath),
		objectKind,
		complete: errors.length === 0,
		summary,
		methods,
		interfaces,
		dependencies,
		stateMachine,
		cycles,
		operations: Object.entries(operations).map(([operationName, value]) => ({
			operation: operationName,
			ok: isSuccessfulOperation(value),
			result: isSuccessfulOperation(value) ? unwrapResult(value) : undefined,
			error: isSuccessfulOperation(value) ? undefined : toRecord(toRecord(value)?.error),
		})),
		warnings,
		errors,
		sourceHash,
		raw,
	};
}

function operation(key: string, args: string[], methodName?: string): AscetInspectionOperation {
	return { key, operation: args[1] ?? key, args, methodName };
}

async function runInspectionOperation(
	planned: AscetInspectionOperation,
	_params: AscetInspectionParams,
	options: RunAscetInspectionOptions,
): Promise<AscetCliJsonResult> {
	return runAscetCliJson(planned.args, {
		cwd: options.cwd,
		cliPath: options.cliPath,
		env: options.env,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		queueTimeoutMs: options.queueTimeoutMs,
		executeCli: options.executeCli,
		scheduler: options.scheduler,
		agentId: "ascet-test-inspect",
		toolName: "ascet_test_inspect",
		commandId: `ascet_test_inspect_${planned.operation}`,
		jobKind: "read",
		resourceKey: ASCET_SCHEDULER_DEFAULTS.resourceKey,
	});
}

function extractMethodNames(value: unknown): string[] {
	const payload = unwrapResult(value);
	const items = extractItems(payload, ["methods", "items", "children"]);
	const names = items
		.map((item): string | undefined => {
			const record = toRecord(item);
			return typeof item === "string" ? item : (asString(record?.name) ?? asString(record?.methodName));
		})
		.filter((name): name is string => typeof name === "string" && name.trim().length > 0);
	return [...new Set(names.map((name) => name.trim()))].sort((left, right) => left.localeCompare(right));
}

function extractMethods(payload: unknown, operations: InspectionOperationResults): AscetInspectionMethod[] {
	const baseItems = extractItems(payload, ["methods", "items", "children"]);
	const names = new Set<string>();
	const methods: AscetInspectionMethod[] = [];
	for (const item of baseItems) {
		const record = toRecord(item);
		const name = typeof item === "string" ? item : (asString(record?.name) ?? asString(record?.methodName));
		if (!name) continue;
		names.add(name);
		methods.push({ name, metadata: record });
	}
	for (const key of Object.keys(operations)) {
		const match = /^(?:read_method_signature|read_method_code):(.+)$/u.exec(key);
		if (!match) continue;
		const name = match[1];
		if (!names.has(name)) {
			names.add(name);
			methods.push({ name });
		}
		const method = methods.find((entry) => entry.name === name)!;
		const value = unwrapResult(operations[key]);
		if (key.startsWith("read_method_signature:")) method.signature = toRecord(value);
		if (key.startsWith("read_method_code:")) {
			method.code = extractCode(value);
			method.language = asString(toRecord(value)?.language);
		}
	}
	return methods.sort((left, right) => left.name.localeCompare(right.name));
}

function extractInterfaces(payload: unknown): AscetInspection["interfaces"] {
	const ports: AscetInspectionPort[] = extractItems(payload, ["elements", "items", "ports", "variables"])
		.map((item) => toPort(item))
		.filter((port): port is AscetInspectionPort => port !== undefined);
	const inputs = ports.filter((port) => port.direction === "input");
	const outputs = ports.filter((port) => port.direction === "output");
	const parameters = ports.filter((port) => port.metadata?.kind === "parameter");
	const variables = ports.filter((port) => port.metadata?.kind === "variable");
	return { inputs, outputs, parameters, variables };
}

function extractDependencies(refsPayload: unknown, componentsPayload: unknown): AscetInspectionDependency[] {
	const values = [
		...extractItems(refsPayload, ["references", "refs", "items", "matches"]),
		...extractItems(componentsPayload, ["components", "items", "children"]),
	]
		.map((item) => {
			const record = toRecord(item);
			const path =
				typeof item === "string"
					? item
					: (asString(record?.path) ?? asString(record?.componentPath) ?? asString(record?.targetPath));
			if (!path) return undefined;
			const kind = asString(record?.kind) ?? asString(record?.objectKind);
			const relation = asString(record?.relation);
			return {
				path,
				...(kind ? { kind } : {}),
				...(relation ? { relation } : {}),
				...(record ? { metadata: record } : {}),
			};
		})
		.filter((dependency): dependency is AscetInspectionDependency => dependency !== undefined);
	const seen = new Set<string>();
	return values.filter((dependency) => {
		const key = `${dependency.path}|${dependency.relation ?? ""}`;
		if (seen.has(key)) return false;
		seen.add(key);
		return true;
	});
}

function extractCycles(...values: unknown[]): Record<string, unknown> | undefined {
	for (const value of values) {
		const record = toRecord(value);
		const cycles = toRecord(record?.cycles) ?? toRecord(record?.periods) ?? toRecord(record?.tasks);
		if (cycles) return cycles;
	}
	return undefined;
}

function extractObjectKind(summary: unknown, snapshot: unknown, requested?: AscetComponentKind): AscetComponentKind {
	for (const value of [summary, snapshot]) {
		const record = toRecord(value);
		const kind = asString(record?.objectKind) ?? asString(record?.componentKind) ?? asString(record?.kind);
		if (kind === "class" || kind === "module" || kind === "statemachine") return kind;
	}
	return requested ?? "unknown";
}

function extractCode(value: unknown): string | undefined {
	const record = toRecord(value);
	return asString(record?.code) ?? asString(record?.text) ?? asString(record?.body);
}

function toPort(value: unknown): AscetInspectionPort | undefined {
	if (typeof value === "string") return { name: value, direction: "unknown" };
	const record = toRecord(value);
	if (!record) return undefined;
	const name = asString(record.name) ?? asString(record.elementName) ?? asString(record.portName);
	if (!name) return undefined;
	const directionValue = (asString(record.direction) ?? asString(record.portDirection) ?? "unknown").toLowerCase();
	const direction: AscetInspectionPort["direction"] =
		directionValue.includes("in") && directionValue.includes("out")
			? "inout"
			: directionValue.includes("in")
				? "input"
				: directionValue.includes("out")
					? "output"
					: "unknown";
	const kind = asString(record.kind) ?? asString(record.elementKind);
	const nestedMetadata = toRecord(record.metadata) ?? {};
	return {
		name,
		direction,
		type: asString(record.type) ?? asString(record.dataType),
		unit: asString(record.unit) ?? asString(toRecord(record.physical)?.unit),
		min: asNumber(record.min) ?? asNumber(record.minimum),
		max: asNumber(record.max) ?? asNumber(record.maximum),
		step: asNumber(record.step),
		physical: toRecord(record.physical),
		metadata: { ...nestedMetadata, ...record, ...(kind ? { kind } : {}) },
	};
}

function extractItems(value: unknown, keys: string[]): unknown[] {
	const record = toRecord(value);
	if (!record) return Array.isArray(value) ? value : [];
	for (const key of keys) {
		if (Array.isArray(record[key])) return record[key] as unknown[];
	}
	return [];
}

function unwrapResult(value: unknown): unknown {
	if (isAscetCliResult(value)) return value.ok ? unwrapResult(value.data) : undefined;
	const record = toRecord(value);
	if (!record) return value;
	if (record.result !== undefined) return record.result;
	return value;
}

function isSuccessfulOperation(value: unknown): boolean {
	if (isAscetCliResult(value)) return value.ok;
	const record = toRecord(value);
	return record?.ok === undefined ? value !== undefined : record.ok === true;
}

function hasOperation(operations: InspectionOperationResults, key: string): boolean {
	return operations[key] !== undefined && isSuccessfulOperation(operations[key]);
}

function operationError(value: unknown): string | undefined {
	const record = toRecord(value);
	const error = toRecord(record?.error);
	return asString(error?.message) ?? asString(record?.stderr) ?? asString(record?.message);
}

function isAscetCliResult(value: unknown): value is AscetCliJsonResult {
	return value !== null && typeof value === "object" && "ok" in value && "request" in value && "exitCode" in value;
}

function toRecord(value: unknown): Record<string, unknown> | undefined {
	return value !== null && typeof value === "object" && !Array.isArray(value)
		? (value as Record<string, unknown>)
		: undefined;
}

function asString(value: unknown): string | undefined {
	return typeof value === "string" && value.trim().length > 0 ? value.trim() : undefined;
}

function asNumber(value: unknown): number | undefined {
	return typeof value === "number" && Number.isFinite(value) ? value : undefined;
}

function normalizeRequiredPath(value: string): string {
	const normalized = normalizePath(value);
	if (
		!normalized ||
		/^[A-Za-z]:\//u.test(normalized) ||
		normalized.split("/").includes("..") ||
		normalized.startsWith("/")
	)
		throw new Error("componentPath must be a relative ASCET path without '..'.");
	return normalized;
}

function normalizePath(value: string): string {
	return value.trim().replace(/\\/g, "/");
}

function normalizeNonNegativeInteger(value: number | undefined, fallback: number): number {
	return value !== undefined && Number.isInteger(value) && value >= 0 ? value : fallback;
}

function stableStringify(value: unknown): string {
	if (Array.isArray(value)) return `[${value.map(stableStringify).join(",")}]`;
	if (value !== null && typeof value === "object") {
		const entries = Object.entries(value as Record<string, unknown>).sort(([left], [right]) =>
			left.localeCompare(right),
		);
		return `{${entries.map(([key, entry]) => `${JSON.stringify(key)}:${stableStringify(entry)}`).join(",")}}`;
	}
	return JSON.stringify(value) ?? "null";
}

function sha256(value: string): string {
	return createHash("sha256").update(value, "utf8").digest("hex");
}

export function isBaseInspectionOperation(key: string): boolean {
	return BASE_OPERATION_NAMES.has(key);
}

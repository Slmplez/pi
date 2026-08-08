import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import { runAscetReadElement } from "./read-element.ts";
import { runAscetReadElementDependency } from "./read-element-dependency.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { unwrapToolSuccessPayload } from "./tool-response-contract.ts";

export interface AscetReadDependentChainParams {
	componentPath: string;
	dependentElement: string;
	exporterComponentPath?: string;
}

export interface RunAscetReadDependentChainOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetReadDependentChainResult = AscetCliJsonResult;

export const ascetReadDependentChainParameters = Type.Object({
	componentPath: Type.String({
		description: "ASCET consuming component path containing the local dependent parameter.",
		minLength: 1,
	}),
	dependentElement: Type.String({ description: "Local dependent parameter name to analyze.", minLength: 1 }),
	exporterComponentPath: Type.Optional(
		Type.String({
			description: "Optional exact provider/exporter component path used as a verification constraint.",
			minLength: 1,
		}),
	),
});

export function buildReadDependentChainArgs(params: AscetReadDependentChainParams): string[] {
	const args = ["exec", "read_dependent_chain", normalizeAscetPath(params.componentPath), params.dependentElement];
	if (params.exporterComponentPath) {
		args.push("--exporter", normalizeAscetPath(params.exporterComponentPath));
	}
	args.push("--json");
	return args;
}

export async function runAscetReadDependentChain(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
): Promise<AscetReadDependentChainResult> {
	const primary = await runAscetCliJson(buildReadDependentChainArgs(params), {
		...options,
		toolName: "ascet_read",
		commandId: "read_dependent_chain",
		jobKind: "read",
	});
	if (!shouldFallbackToDirectReads(primary)) {
		return primary;
	}

	return buildDirectReadFallback(params, options, primary);
}

export function formatReadDependentChainResult(result: AscetReadDependentChainResult): string {
	return formatAscetCliJsonResult("read_dependent_chain", result);
}

type JsonRecord = Record<string, unknown>;

function shouldFallbackToDirectReads(result: AscetCliJsonResult): boolean {
	if (result.ok) {
		return false;
	}
	return /ExportXMLToFile returned false/i.test(result.error?.message ?? "");
}

async function buildDirectReadFallback(
	params: AscetReadDependentChainParams,
	options: RunAscetReadDependentChainOptions,
	primary: AscetCliJsonResult,
): Promise<AscetCliJsonResult> {
	const element = await runAscetReadElement(
		{ componentPath: params.componentPath, elementName: params.dependentElement },
		options,
	);
	const dependency = await runAscetReadElementDependency(
		{ componentPath: params.componentPath, elementName: params.dependentElement, targetKind: "component" },
		options,
	);
	if (!element.ok && !dependency.ok) {
		return primary;
	}

	const elementPayload = element.ok ? getPayload(element.data) : undefined;
	const dependencyPayload = dependency.ok ? getPayload(dependency.data) : undefined;
	const elementRecord = isRecord(elementPayload?.element) ? elementPayload.element : undefined;
	const dependencyMatches = Array.isArray(dependencyPayload?.matches)
		? dependencyPayload.matches
		: Array.isArray(dependencyPayload?.items)
			? dependencyPayload.items
			: [];
	const dependencyItem = dependencyMatches.find(isRecord);
	const dependent: JsonRecord = {
		name: params.dependentElement,
		kind: readString(dependencyItem, "kind") ?? readString(elementRecord, "kind"),
		scope: readString(dependencyItem, "scope") ?? readString(elementRecord, "scope"),
		dependency: readString(dependencyItem, "dependency"),
		formula: readString(dependencyItem, "formula"),
	};
	const formula = readString(dependencyItem, "formula");
	const issues = ["xml_export_failed", "dependency_formula_expression_unverified", "provider_binding_unverified"];
	if (!element.ok) {
		issues.push("element_catalog_unavailable");
	}
	if (!dependency.ok) {
		issues.push("element_dependency_unavailable");
	}
	const result = {
		component: params.componentPath,
		exporter: params.exporterComponentPath,
		direction: "forward",
		status: "partial",
		complete: false,
		dependent,
		dependencyFormula: {
			exists: formula !== undefined,
			name: formula,
			expressionVerified: false,
		},
		inputs: [],
		issues,
		fallback: {
			used: ["read_element", "read_element_dependency"],
			originalError: primary.error?.code ?? "ascet_cli_failed",
		},
	};
	const data = { ok: true, result };
	return {
		...primary,
		ok: true,
		data,
		stdout: JSON.stringify(data),
		stderr: "",
		exitCode: 0,
		timedOut: false,
		stage: undefined,
		diagnostics: undefined,
		error: undefined,
	};
}

function getPayload(data: unknown): JsonRecord | undefined {
	const payload = unwrapToolSuccessPayload(data);
	return isRecord(payload) ? payload : undefined;
}

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function readString(record: JsonRecord | undefined, key: string): string | undefined {
	const value = record?.[key];
	return typeof value === "string" && value.length > 0 ? value : undefined;
}

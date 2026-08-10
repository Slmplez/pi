import { Type } from "typebox";
import { Value } from "typebox/value";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import { type AscetToolOutcome, createPreflightOutcome } from "./core/results.ts";
import {
	type AscetEditApprovalContext,
	type AscetEditApprovalFailure,
	createAscetEditApprovalResultData,
	isAscetEditApprovalBlockedCode,
	requestAscetEditApproval,
} from "./edit/approval.ts";
import { type AscetEditObservationTargetParams, invalidateAscetEditObservations } from "./edit/common.ts";
import {
	type AscetCreateMethodComponentKind,
	type AscetCreateMethodKind,
	getDefaultCreateMethodKind,
	validateCreateMethodKindCompatibility,
} from "./method-kind-compatibility.ts";
import type { AscetScheduler } from "./scheduler/scheduler.ts";
import { createAscetStatusReport } from "./status.ts";
import { openAiObjectSchema } from "./tools/_shared/openai-schema.ts";

export type AscetBatchWriteOperation =
	| "batch_set_method_code"
	| "batch_set_element_spec"
	| "batch_create_component"
	| "batch_create_method"
	| "batch_set_project_formula"
	| "batch_delete_component"
	| "batch_delete_method"
	| "batch_create_folder"
	| "batch_delete_folder";

export interface AscetBatchWriteParams {
	operation: AscetBatchWriteOperation;
	requests: Array<Record<string, unknown>>;
	executeWrite?: boolean;
}

export interface RunAscetBatchWriteOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
}

export type AscetBatchWriteResult = AscetCliJsonResult;

export interface AscetBatchWriteObservationInvalidation {
	invalidated: string[];
}

const batchCommonOptions = {
	executeWrite: Type.Optional(
		Type.Boolean({ description: "Defaults to false. When true, PI still requires interactive confirmation." }),
	),
};

const batchRequestArrayOptions = {
	minItems: 1,
	maxItems: 50,
};

const createFolderRequest = Type.Object(
	{
		folderPath: Type.String({ minLength: 1 }),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("ignore"), Type.Literal("return-existing")]),
		),
	},
	{ additionalProperties: false },
);
const createComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("BDE"), Type.Literal("C")])),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")]),
		),
		rollbackOnFailure: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const createMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		componentKind: Type.Optional(
			Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		),
		methodKind: Type.Optional(
			Type.Union([
				Type.Literal("abstract"),
				Type.Literal("process"),
				Type.Literal("action"),
				Type.Literal("condition"),
				Type.Literal("trigger"),
			]),
		),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")]),
		),
	},
	{ additionalProperties: false },
);
const setMethodCodeRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		codeFile: Type.String({ minLength: 1 }),
	},
	{ additionalProperties: false },
);
const applyElementSpecRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		projectPath: Type.Optional(Type.String()),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		recreateIncompatible: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const applyProjectFormulaRequest = Type.Object(
	{
		projectPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const deleteComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);
const deleteMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);
const deleteFolderRequest = Type.Object(
	{
		folderPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
	},
	{ additionalProperties: false },
);

const batchRequestSchema = Type.Union([
	setMethodCodeRequest,
	applyElementSpecRequest,
	createComponentRequest,
	createMethodRequest,
	applyProjectFormulaRequest,
	deleteComponentRequest,
	deleteMethodRequest,
	createFolderRequest,
	deleteFolderRequest,
]);

export const ascetBatchWriteParameters = openAiObjectSchema<AscetBatchWriteParams>(
	Type.Object(
		{
			operation: Type.Union([
				Type.Literal("batch_set_method_code"),
				Type.Literal("batch_set_element_spec"),
				Type.Literal("batch_create_component"),
				Type.Literal("batch_create_method"),
				Type.Literal("batch_set_project_formula"),
				Type.Literal("batch_delete_component"),
				Type.Literal("batch_delete_method"),
				Type.Literal("batch_create_folder"),
				Type.Literal("batch_delete_folder"),
			]),
			requests: Type.Array(batchRequestSchema, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
);

const cliOperationByToolOperation: Record<AscetBatchWriteOperation, string> = {
	batch_set_method_code: "set_method_code",
	batch_set_element_spec: "apply_element_spec",
	batch_create_component: "create_component",
	batch_create_method: "create_method",
	batch_set_project_formula: "apply_project_formula",
	batch_delete_component: "delete_component",
	batch_delete_method: "delete_method",
	batch_create_folder: "create_folder",
	batch_delete_folder: "delete_folder",
};

const requestSchemaByToolOperation = {
	batch_set_method_code: setMethodCodeRequest,
	batch_set_element_spec: applyElementSpecRequest,
	batch_create_component: createComponentRequest,
	batch_create_method: createMethodRequest,
	batch_set_project_formula: applyProjectFormulaRequest,
	batch_delete_component: deleteComponentRequest,
	batch_delete_method: deleteMethodRequest,
	batch_create_folder: createFolderRequest,
	batch_delete_folder: deleteFolderRequest,
};

function formatBatchRequestValidationPath(
	index: number,
	error: { keyword?: string; instancePath?: string; params?: unknown },
): string {
	const basePath = (error.instancePath ?? "").replace(/^\//, "").replace(/\//g, ".");
	if (error.keyword === "required") {
		const requiredProperty = (error.params as { requiredProperties?: string[] }).requiredProperties?.[0];
		if (requiredProperty) {
			return basePath
				? `requests.${index}.${basePath}.${requiredProperty}`
				: `requests.${index}.${requiredProperty}`;
		}
	}
	return basePath ? `requests.${index}.${basePath}` : `requests.${index}`;
}

function normalizeBatchRequest(
	operation: AscetBatchWriteOperation,
	request: Record<string, unknown>,
): Record<string, unknown> {
	if (
		operation === "batch_create_component" &&
		(request.kind === "class" || request.kind === "module") &&
		request.language === undefined
	) {
		return { ...request, language: "ESDL" };
	}
	if (operation === "batch_create_method" && !request.methodKind && typeof request.componentKind === "string") {
		const defaultMethodKind = getDefaultCreateMethodKind(request.componentKind as AscetCreateMethodComponentKind);
		if (defaultMethodKind) {
			return { ...request, methodKind: defaultMethodKind };
		}
	}
	return request;
}

export function normalizeAscetBatchWriteParams(params: AscetBatchWriteParams): AscetBatchWriteParams {
	if (!Array.isArray(params.requests)) {
		return params;
	}
	return {
		...params,
		requests: params.requests.map((request) => normalizeBatchRequest(params.operation, request)),
	};
}

function validateBatchCreateMethodSemantics(request: Record<string, unknown>, index: number, errors: string[]): void {
	const componentKind = request.componentKind as AscetCreateMethodComponentKind | undefined;
	const methodKind = request.methodKind as AscetCreateMethodKind | undefined;
	if (!methodKind) {
		if (componentKind === "statemachine") {
			errors.push(`requests.${index}.methodKind: requires methodKind for statemachine targets`);
			return;
		}
		errors.push(`requests.${index}.methodKind: requires methodKind or componentKind for default inference`);
		return;
	}
	const compatibility = validateCreateMethodKindCompatibility({ componentKind, methodKind });
	if (compatibility) {
		errors.push(`requests.${index}.methodKind: ${compatibility.message}`);
	}
}

export function validateAscetBatchWriteParams(params: AscetBatchWriteParams): AscetBatchWriteParams {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const requestSchema = requestSchemaByToolOperation[normalizedParams.operation];
	if (!requestSchema || !Array.isArray(normalizedParams.requests)) {
		return normalizedParams;
	}
	const errors: string[] = [];
	for (const [index, request] of normalizedParams.requests.entries()) {
		for (const error of Value.Errors(requestSchema, request)) {
			errors.push(`${formatBatchRequestValidationPath(index, error)}: ${error.message}`);
		}
		if (normalizedParams.operation === "batch_create_method") {
			validateBatchCreateMethodSemantics(request, index, errors);
		}
	}
	if (errors.length > 0) {
		throw new Error(
			[
				`Validation failed for batch operation "${normalizedParams.operation}":`,
				...errors.map((error) => `  - ${error}`),
			].join("\n"),
		);
	}
	return normalizedParams;
}

function createBatchPayload(params: AscetBatchWriteParams): string {
	const cliOperation = cliOperationByToolOperation[params.operation];
	return JSON.stringify({
		requests: params.requests.map((request, index) => ({
			id: `req-${index + 1}`,
			operation: cliOperation,
			args: request,
		})),
	});
}

export function buildBatchWriteArgs(params: AscetBatchWriteParams): string[] {
	return ["batch", cliOperationByToolOperation[params.operation]];
}

export function createBatchWriteSummary(params: AscetBatchWriteParams): string {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const preview = normalizedParams.requests
		.slice(0, 5)
		.map((request, index) => `request ${index + 1}: ${JSON.stringify(request)}`)
		.join("\n");
	const more =
		normalizedParams.requests.length > 5 ? `\n... ${normalizedParams.requests.length - 5} more request(s)` : "";
	return [
		"ASCET batch write request:",
		`operation: ${normalizedParams.operation}`,
		`cliOperation: ${cliOperationByToolOperation[normalizedParams.operation]}`,
		`requestCount: ${normalizedParams.requests.length}`,
		preview,
		more,
	]
		.filter(Boolean)
		.join("\n");
}

function createBlockedBatchWriteResult(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	approval: AscetEditApprovalFailure,
): AscetBatchWriteResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: params.operation,
			summary: createBatchWriteSummary(params),
			...createAscetEditApprovalResultData(approval),
		},
		request: {
			cwd: options.cwd,
			cliPath: status.paths.cliPath,
			args: buildBatchWriteArgs(params),
			stdin: createBatchPayload(params),
			signal: options.signal,
			timeoutMs: options.timeoutMs,
		},
		stdout: "",
		stderr: "",
		exitCode: null,
		timedOut: false,
		error: { code: approval.code, message: approval.message },
	};
}

export async function runAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
): Promise<AscetBatchWriteResult> {
	const normalizedParams = validateAscetBatchWriteParams(params);
	return runAscetCliJson(buildBatchWriteArgs(normalizedParams), {
		...options,
		stdin: createBatchPayload(normalizedParams),
		acceptedExitCodes: [0, 2],
		commandId: `batch_${cliOperationByToolOperation[normalizedParams.operation]}`,
		toolName: "ascet_batch_write",
		jobKind: "write",
	});
}

export async function runApprovedAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetBatchWriteResult> {
	const normalizedParams = validateAscetBatchWriteParams(params);
	const approval = await requestAscetEditApproval(
		{
			executeWrite: normalizedParams.executeWrite,
			title: "Confirm ASCET batch write",
			message: createBatchWriteSummary(normalizedParams),
			signal: options.signal,
			errorPrefix: "ascet_batch_write",
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedBatchWriteResult(normalizedParams, options, approval);
	}

	const result = await runAscetBatchWrite(normalizedParams, options);
	if (isBatchWriteFullySuccessful(result)) {
		const observations = invalidateBatchWriteObservations(normalizedParams, options);
		result.data = attachBatchWriteObservations(result.data, observations);
	}
	return result;
}

export function invalidateBatchWriteObservations(
	params: AscetBatchWriteParams,
	options: Pick<RunAscetBatchWriteOptions, "env">,
): AscetBatchWriteObservationInvalidation {
	const normalizedParams = normalizeAscetBatchWriteParams(params);
	const invalidated = new Set<string>();
	for (const request of normalizedParams.requests) {
		const observation = invalidateAscetEditObservations(
			toObservationTargetParams(normalizedParams.operation, request),
			options,
		);
		for (const resultId of observation.invalidated) {
			invalidated.add(resultId);
		}
	}
	return { invalidated: [...invalidated] };
}

function toObservationTargetParams(
	operation: AscetBatchWriteOperation,
	request: Record<string, unknown>,
): AscetEditObservationTargetParams {
	return {
		action: cliOperationByToolOperation[operation],
		componentPath: stringValue(request.componentPath),
		modulePath: stringValue(request.modulePath),
		stateMachinePath: stringValue(request.stateMachinePath),
		folderPath: stringValue(request.folderPath),
		projectPath: stringValue(request.projectPath),
		targetPath: stringValue(request.targetPath),
	};
}

function attachBatchWriteObservations(data: unknown, observations: AscetBatchWriteObservationInvalidation): unknown {
	const root = asRecord(data);
	if (!root) {
		return { result: data, observations };
	}
	const result = asRecord(root.result);
	if (result) {
		return { ...root, result: { ...result, observations } };
	}
	return { ...root, observations };
}

function isBatchWriteFullySuccessful(result: AscetBatchWriteResult): boolean {
	return result.ok && result.exitCode !== 2 && findFailures(result.data).length === 0;
}
function stringValue(value: unknown): string | undefined {
	return typeof value === "string" && value.trim() ? value : undefined;
}

function asRecord(value: unknown): Record<string, unknown> | undefined {
	return value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, unknown>) : undefined;
}

function findResultItems(data: unknown): Array<Record<string, unknown>> {
	const root = asRecord(data);
	const result = asRecord(root?.result);
	const candidates = [root?.results, root?.Results, result?.results, result?.Results];
	for (const candidate of candidates) {
		if (Array.isArray(candidate)) {
			return candidate.filter((item): item is Record<string, unknown> => !!asRecord(item));
		}
	}
	return [];
}

function findFailures(data: unknown): Array<Record<string, unknown>> {
	return findResultItems(data).filter(
		(item) => item.ok === false || item.success === false || item.error !== undefined,
	);
}

export function createBatchWriteOutcome(result: AscetBatchWriteResult): AscetToolOutcome {
	const failures = findFailures(result.data);
	if (result.ok && (result.exitCode === 2 || failures.length > 0)) {
		return { status: "partial", data: result.data, failures };
	}
	if (result.ok) {
		return { status: "ok", data: result.data, warnings: [] };
	}
	const code = result.error?.code ?? "ascet_batch_write_failed";
	const message = result.error?.message ?? "ASCET batch write failed.";
	if (code === "ascet_batch_write_preflight_required") {
		return createPreflightOutcome((asRecord(result.data) ?? { message }) as Record<string, unknown>);
	}
	if (isAscetEditApprovalBlockedCode(code)) {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

export function formatBatchWriteResult(result: AscetBatchWriteResult): string {
	return formatAscetCliJsonResult("batch_write", result);
}

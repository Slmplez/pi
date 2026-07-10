import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	formatAscetCliJsonResult,
	runAscetCliJson,
} from "./cli.ts";
import type { AscetToolOutcome } from "./core/results.ts";
import { createAscetStatusReport } from "./status.ts";
import { type AscetWriteApprovalContext, requestAscetWriteApproval } from "./write-policy.ts";

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
}

export type AscetBatchWriteResult = AscetCliJsonResult;

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
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const createComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		kind: Type.Union([Type.Literal("class"), Type.Literal("module"), Type.Literal("statemachine")]),
		language: Type.Optional(Type.Union([Type.Literal("ESDL"), Type.Literal("C")])),
		ifExists: Type.Optional(
			Type.Union([Type.Literal("fail"), Type.Literal("return-existing"), Type.Literal("overwrite")]),
		),
		verifyReadback: Type.Optional(Type.Boolean()),
		rollbackOnFailure: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const createMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
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
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const setMethodCodeRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		codeFile: Type.String({ minLength: 1 }),
		verifyReadback: Type.Optional(Type.Boolean()),
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
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const applyProjectFormulaRequest = Type.Object(
	{
		projectPath: Type.String({ minLength: 1 }),
		specFile: Type.String({ minLength: 1 }),
		mode: Type.Optional(Type.Literal("restore")),
		deleteMissing: Type.Optional(Type.Boolean()),
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const deleteComponentRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const deleteMethodRequest = Type.Object(
	{
		componentPath: Type.String({ minLength: 1 }),
		methodName: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);
const deleteFolderRequest = Type.Object(
	{
		folderPath: Type.String({ minLength: 1 }),
		ifMissing: Type.Optional(Type.Union([Type.Literal("fail"), Type.Literal("ignore")])),
		verifyReadback: Type.Optional(Type.Boolean()),
	},
	{ additionalProperties: false },
);

export const ascetBatchWriteParameters = Type.Union([
	Type.Object(
		{
			operation: Type.Literal("batch_set_method_code"),
			requests: Type.Array(setMethodCodeRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_set_element_spec"),
			requests: Type.Array(applyElementSpecRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_create_component"),
			requests: Type.Array(createComponentRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_create_method"),
			requests: Type.Array(createMethodRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_set_project_formula"),
			requests: Type.Array(applyProjectFormulaRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_delete_component"),
			requests: Type.Array(deleteComponentRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_delete_method"),
			requests: Type.Array(deleteMethodRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_create_folder"),
			requests: Type.Array(createFolderRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
	Type.Object(
		{
			operation: Type.Literal("batch_delete_folder"),
			requests: Type.Array(deleteFolderRequest, batchRequestArrayOptions),
			...batchCommonOptions,
		},
		{ additionalProperties: false },
	),
]);

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
	const preview = params.requests
		.slice(0, 5)
		.map((request, index) => `request ${index + 1}: ${JSON.stringify(request)}`)
		.join("\n");
	const more = params.requests.length > 5 ? `\n... ${params.requests.length - 5} more request(s)` : "";
	return [
		"ASCET batch write request:",
		`operation: ${params.operation}`,
		`cliOperation: ${cliOperationByToolOperation[params.operation]}`,
		`requestCount: ${params.requests.length}`,
		preview,
		more,
	]
		.filter(Boolean)
		.join("\n");
}

function createBlockedBatchWriteResult(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	code: string,
	message: string,
): AscetBatchWriteResult {
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	return {
		ok: false,
		data: {
			operation: params.operation,
			preflightOnly: true,
			summary: createBatchWriteSummary(params),
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
		error: { code, message },
	};
}

export async function runAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
): Promise<AscetBatchWriteResult> {
	return runAscetCliJson(buildBatchWriteArgs(params), {
		...options,
		stdin: createBatchPayload(params),
		acceptedExitCodes: [0, 2],
		commandId: `batch_${cliOperationByToolOperation[params.operation]}`,
		toolName: "ascet_batch_write",
		jobKind: "write",
	});
}

export async function runApprovedAscetBatchWrite(
	params: AscetBatchWriteParams,
	options: RunAscetBatchWriteOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetBatchWriteResult> {
	const approval = await requestAscetWriteApproval(
		{
			executeWrite: params.executeWrite,
			title: "Confirm ASCET batch write",
			message: createBatchWriteSummary(params),
			signal: options.signal,
		},
		ctx,
	);

	if (!approval.approved) {
		return createBlockedBatchWriteResult(
			params,
			options,
			approval.code ?? "ascet_write_rejected",
			approval.message ?? "ASCET batch write was not approved.",
		);
	}

	return runAscetBatchWrite(params, options);
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
	if (code === "ascet_write_ui_required" || code === "ascet_write_rejected") {
		return { status: "blocked", code, message };
	}
	return { status: "error", error: { code, message } };
}

export function formatBatchWriteResult(result: AscetBatchWriteResult): string {
	return formatAscetCliJsonResult("batch_write", result);
}

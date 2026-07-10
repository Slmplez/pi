import { Type } from "typebox";
import {
	type AscetCliExecutionResult,
	type AscetCliJsonResult,
	type AscetCliRequest,
	executeAscetCli,
	formatAscetCliJsonResult,
} from "./cli.ts";
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

const batchOperationParameters = Type.Union([
	Type.Literal("batch_set_method_code"),
	Type.Literal("batch_set_element_spec"),
	Type.Literal("batch_create_component"),
	Type.Literal("batch_create_method"),
	Type.Literal("batch_set_project_formula"),
	Type.Literal("batch_delete_component"),
	Type.Literal("batch_delete_method"),
	Type.Literal("batch_create_folder"),
	Type.Literal("batch_delete_folder"),
]);

export const ascetBatchWriteParameters = Type.Object({
	operation: batchOperationParameters,
	requests: Type.Array(Type.Record(Type.String(), Type.Any()), {
		minItems: 1,
		maxItems: 50,
		description: "Batch write requests. Fields depend on the selected ASCET batch operation.",
	}),
	executeWrite: Type.Optional(
		Type.Boolean({ description: "Defaults to false. When true, PI still requires interactive confirmation." }),
	),
});

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

function parseJson(text: string): { ok: true; data: unknown } | { ok: false; message: string } {
	const trimmed = text.trim();
	if (!trimmed) {
		return { ok: false, message: "ASCET batch CLI produced empty stdout; expected JSON." };
	}
	try {
		return { ok: true, data: JSON.parse(trimmed) };
	} catch (error) {
		const message = error instanceof Error ? error.message : String(error);
		return { ok: false, message: `ASCET batch CLI produced invalid JSON: ${message}` };
	}
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
	const status = createAscetStatusReport({ cwd: options.cwd, env: options.env });
	const request: AscetCliRequest = {
		cwd: options.cwd,
		cliPath: status.paths.cliPath,
		args: buildBatchWriteArgs(params),
		stdin: createBatchPayload(params),
		signal: options.signal,
		timeoutMs: options.timeoutMs,
	};
	if (options.signal?.aborted) {
		return {
			ok: false,
			data: null,
			request,
			stdout: "",
			stderr: "",
			exitCode: null,
			timedOut: false,
			error: {
				code: "ascet_cli_aborted",
				message: "ASCET CLI execution was aborted before it started.",
			},
		};
	}
	const execution = await (options.executeCli ?? executeAscetCli)(request);
	const parsed = parseJson(execution.stdout);
	const aborted = options.signal?.aborted === true || execution.aborted === true;
	const processOk = (execution.exitCode === 0 || execution.exitCode === 2) && !execution.timedOut && !aborted;
	const ok = processOk && parsed.ok;
	return {
		ok,
		data: parsed.ok ? parsed.data : null,
		request: execution.request,
		stdout: execution.stdout,
		stderr: execution.stderr,
		exitCode: execution.exitCode,
		timedOut: execution.timedOut,
		error: ok
			? undefined
			: {
					code: aborted
						? "ascet_cli_aborted"
						: execution.timedOut
							? "ascet_cli_timeout"
							: processOk
								? "ascet_cli_invalid_json"
								: "ascet_cli_failed",
					message: aborted
						? "ASCET CLI execution was aborted."
						: processOk && !parsed.ok
							? parsed.message
							: execution.stderr.trim() ||
								execution.stdout.trim() ||
								`ASCET CLI exited with ${execution.exitCode}`,
				},
	};
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

export function formatBatchWriteResult(result: AscetBatchWriteResult): string {
	return formatAscetCliJsonResult("batch_write", result);
}

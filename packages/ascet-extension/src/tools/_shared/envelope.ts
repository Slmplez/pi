import type { AscetCliJsonResult, AscetFormattedOutputArtifact } from "../../cli.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { compactObject, toToolFailurePayload, toToolSuccessPayload } from "../../tool-response-contract.ts";

export interface AscetCommandEnvelope {
	logicalCommandId: string;
	backendCommandId: string;
	operation: string;
}

export interface AscetToolEnvelope<TData = unknown> {
	ok: boolean;
	tool: string;
	action: string;
	summary?: string;
	command?: AscetCommandEnvelope;
	data?: TData;
	error?: {
		code: string;
		message: string;
		recoveryActions?: string[];
	};
	diagnostics?: Record<string, unknown>;
}

export function createAscetToolEnvelope<TData>(params: AscetToolEnvelope<TData>): AscetToolEnvelope<TData> {
	return params;
}

function createSuccessDiagnostics(result: AscetCliJsonResult) {
	return compactObject({
		request: result.request,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
	});
}

function createFailureDiagnostics(result: AscetCliJsonResult) {
	return compactObject({
		request: result.request,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stderr: result.stderr,
		stdout: result.stdout,
	});
}

function createArtifactDetails(artifact: AscetFormattedOutputArtifact) {
	return compactObject({
		operation: artifact.operation,
		path: artifact.path,
		sizeBytes: artifact.sizeBytes,
		thresholdBytes: artifact.thresholdBytes,
		searchHint: artifact.searchHint,
	});
}

export function createAscetCliToolDetails(
	toolName: string,
	action: string,
	result: AscetCliJsonResult,
	routeParams: { objectKind?: string } = {},
) {
	const route = routeAscetAction({ toolName, action, ...routeParams });
	const base = {
		tool: toolName,
		action,
		command: {
			logicalCommandId: route.logicalCommandId,
			backendCommandId: route.backendCommandId,
			operation: route.operation,
		},
	};
	if (result.ok && result.formattedOutputArtifact) {
		return {
			...base,
			summary: result.formattedOutputArtifact.summary,
			counts: result.formattedOutputArtifact.counts,
			artifact: createArtifactDetails(result.formattedOutputArtifact),
			omittedFields: ["data", "stdout"],
			diagnostics: createSuccessDiagnostics(result),
		};
	}

	if (result.ok) {
		return {
			...base,
			data: toToolSuccessPayload(result.data),
			diagnostics: createSuccessDiagnostics(result),
		};
	}

	const failure = toToolFailurePayload({
		code: result.error?.code ?? "unknown",
		message: result.error?.message ?? "",
		details: {
			stderr: result.stderr,
			stdout: result.stdout,
			exitCode: result.exitCode,
			timedOut: result.timedOut ? true : undefined,
		},
	});
	return {
		...base,
		...failure,
		diagnostics: createFailureDiagnostics(result),
	};
}

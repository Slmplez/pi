import type { AscetCliJsonResult, AscetFormattedOutputArtifact } from "../../cli.ts";
import { routeAscetAction } from "../../routing/router.ts";

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

function createArtifactDiagnostics(result: AscetCliJsonResult) {
	return {
		request: result.request,
		exitCode: result.exitCode,
		timedOut: result.timedOut,
		stderr: result.stderr,
	};
}

function createArtifactDetails(artifact: AscetFormattedOutputArtifact) {
	return {
		operation: artifact.operation,
		path: artifact.path,
		sizeBytes: artifact.sizeBytes,
		thresholdBytes: artifact.thresholdBytes,
		searchHint: artifact.searchHint,
	};
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
		diagnostics: createArtifactDiagnostics(result),
	};
	if (result.formattedOutputArtifact) {
		return {
			ok: result.ok,
			...base,
			summary: result.formattedOutputArtifact.summary,
			counts: result.formattedOutputArtifact.counts,
			artifact: createArtifactDetails(result.formattedOutputArtifact),
			omittedFields: ["data", "stdout"],
		};
	}

	return {
		...result,
		...base,
	};
}

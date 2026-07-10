import type { AscetCliJsonResult } from "../../cli.ts";
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

export function createAscetCliToolDetails(
	toolName: string,
	action: string,
	result: AscetCliJsonResult,
	routeParams: { objectKind?: string } = {},
) {
	const route = routeAscetAction({ toolName, action, ...routeParams });
	return {
		...result,
		tool: toolName,
		action,
		command: {
			logicalCommandId: route.logicalCommandId,
			backendCommandId: route.backendCommandId,
			operation: route.operation,
		},
		diagnostics: {
			request: result.request,
			exitCode: result.exitCode,
			timedOut: result.timedOut,
			stderr: result.stderr,
		},
	};
}

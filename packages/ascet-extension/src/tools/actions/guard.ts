import { type AscetActionDescriptor, getActionDescriptor } from "./descriptors.ts";
import { type ActionActivationContext, isAscetToolName, resolveActionActivation } from "./gates.ts";

export interface ActionUnavailablePayload {
	error: {
		code: "ascet_action_unavailable";
		message: string;
	};
	recover: {
		tool: "ascet_capabilities";
		action: "search_actions";
		query: string;
	};
	tool: string;
	action: string;
	state: string;
	replacement?: string;
}

export class AscetActionUnavailableError extends Error {
	readonly payload: ActionUnavailablePayload;
	readonly descriptor?: AscetActionDescriptor;

	constructor(payload: ActionUnavailablePayload, descriptor?: AscetActionDescriptor) {
		super(payload.error.message);
		this.name = "AscetActionUnavailableError";
		this.payload = payload;
		this.descriptor = descriptor;
	}
}

export function extractToolAction(tool: string, params: unknown): string {
	if (params && typeof params === "object" && !Array.isArray(params)) {
		const record = params as Record<string, unknown>;
		if (typeof record.action === "string" && record.action.length > 0) {
			return record.action;
		}
		if (typeof record.mode === "string" && record.mode.length > 0) {
			return record.mode;
		}
		if (typeof record.operation === "string" && record.operation.length > 0) {
			return record.operation;
		}
	}
	if (tool === "ascet_capabilities") {
		return "search_actions";
	}
	if (tool === "ascet_scheduler_status") {
		return "status";
	}
	if (tool === "ascet_status") {
		return "status";
	}
	return "default";
}

export function assertActionActive(
	tool: string,
	action: string,
	context: ActionActivationContext = {},
): AscetActionDescriptor | undefined {
	if (!isAscetToolName(tool)) {
		return undefined;
	}
	const descriptor = getActionDescriptor(tool, action);
	const state = descriptor ? resolveActionActivation(descriptor, context) : "hidden";
	if (!descriptor || state !== "active") {
		const replacement = descriptor?.deprecatedBy;
		throw new AscetActionUnavailableError(
			{
				error: {
					code: "ascet_action_unavailable",
					message: replacement
						? `ASCET action ${tool}.${action} is not active. Use ${replacement}.`
						: `ASCET action ${tool}.${action} is not active in the current profile.`,
				},
				recover: {
					tool: "ascet_capabilities",
					action: "search_actions",
					query: action,
				},
				tool,
				action,
				state,
				replacement,
			},
			descriptor,
		);
	}
	return descriptor;
}

export function createActionUnavailableToolResult(error: AscetActionUnavailableError) {
	return {
		content: [{ type: "text", text: JSON.stringify({ error: error.payload.error, recover: error.payload.recover }) }],
		details: {
			error: error.payload.error,
			recover: error.payload.recover,
			tool: error.payload.tool,
			action: error.payload.action,
			state: error.payload.state,
			replacement: error.payload.replacement,
			descriptor: error.descriptor,
		},
	};
}

import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { isRecord } from "../../edit/result-contract.ts";
import { formatAscetEditResult, getAscetEditActionId, runAscetEdit } from "../../edit/service.ts";
import { routeAscetAction } from "../../routing/router.ts";
import type { AscetScheduler } from "../../scheduler/scheduler.ts";
import { ASCET_SET_STATE_MACHINE_CODE_OPERATIONS } from "../../set-state-machine-code.ts";
import { ascetEditPrompt } from "./prompt.ts";
import { type AscetEditParams, ascetEditParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

const validStateMachineOperations = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const validStateMachineOperationsText = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

function prepareAscetEditArguments(args: unknown): AscetEditParams {
	if (!args || typeof args !== "object" || Array.isArray(args)) {
		return args as AscetEditParams;
	}
	const params = args as { action?: unknown; operation?: unknown };
	if (
		params.action === "set_state_machine_code" &&
		typeof params.operation === "string" &&
		!validStateMachineOperations.has(params.operation)
	) {
		throw new Error(
			`Invalid operation for set_state_machine_code: '${params.operation}'. Valid values: ${validStateMachineOperationsText}.`,
		);
	}
	return args as AscetEditParams;
}

export const ascetEditTool = defineSequentialAscetTool({
	name: "ascet_edit",
	label: "ASCET edit",
	description: "Execute a verified ASCET mutation or inspect/request component editability.",
	...ascetEditPrompt,
	parameters: ascetEditParameters,
	prepareArguments: prepareAscetEditArguments,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetEditParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext & {
			env?: Record<string, string | undefined>;
			executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
			scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
		},
	) {
		const action = getAscetEditActionId(params);
		const result = await runAscetEdit(
			params,
			{
				cwd: ctx.cwd,
				agentId: ctx.agentId,
				sessionId: ctx.sessionId,
				env: ctx.env,
				signal,
				timeoutMs: action === "check" ? 60_000 : 120_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		const route = action ? routeAscetAction({ toolName: "ascet_edit", action }) : undefined;
		return {
			content: [{ type: "text", text: formatAscetEditResult(result) }],
			details: {
				...result.details,
				error: result.details.error ?? result.details.raw?.error,
				tool: "ascet_edit",
				action: action ?? null,
				mode: "mode" in params ? params.mode : undefined,
				value:
					"mode" in params &&
					result.details.outcome.status === "ok" &&
					isRecord(result.details.outcome.data) &&
					typeof result.details.outcome.data.editable === "boolean"
						? result.details.outcome.data.editable
						: undefined,
				command: route
					? {
							logicalCommandId: route.logicalCommandId,
							backendCommandId: route.backendCommandId,
							operation: route.operation,
						}
					: undefined,
				diagnostics: {
					request: result.details.raw?.request,
					exitCode: result.details.raw?.exitCode,
					timedOut: result.details.raw?.timedOut,
					stderr: result.details.raw?.stderr,
				},
			},
		};
	},
});

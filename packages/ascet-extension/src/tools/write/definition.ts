import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { ASCET_SET_STATE_MACHINE_CODE_OPERATIONS } from "../../set-state-machine-code.ts";
import { formatAscetWriteResult, runAscetWrite } from "../write.ts";
import { ascetWritePrompt } from "./prompt.ts";
import { type AscetWriteParams, ascetWriteParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

const validStateMachineOperations = new Set<string>(ASCET_SET_STATE_MACHINE_CODE_OPERATIONS);
const validStateMachineOperationsText = ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.join(", ");

function prepareAscetWriteArguments(args: unknown): AscetWriteParams {
	if (!args || typeof args !== "object" || Array.isArray(args)) {
		return args as AscetWriteParams;
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
	return args as AscetWriteParams;
}

export const ascetWriteTool = defineSequentialAscetTool({
	name: "ascet_write",
	label: "ASCET write",
	description: "Run a guarded single ASCET write action with canonical preflight and interactive confirmation.",
	...ascetWritePrompt,
	parameters: ascetWriteParameters,
	prepareArguments: prepareAscetWriteArguments,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetWriteParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runAscetWrite(
			params,
			{
				cwd: ctx.cwd,
				env: ctx.env,
				signal,
				timeoutMs: 120_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		const route = routeAscetAction({ toolName: "ascet_write", action: params.action });
		return {
			content: [{ type: "text", text: formatAscetWriteResult(result) }],
			details: {
				...result.details,
				tool: "ascet_write",
				action: params.action,
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
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

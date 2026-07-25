import type { AscetCliExecutionResult, AscetCliRequest } from "../../cli.ts";
import { formatAscetComponentEditableResult, runApprovedAscetComponentEditable } from "../../component-editable.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import type { AscetScheduler } from "../../scheduler/scheduler.ts";
import { ascetComponentEditablePrompt } from "./prompt.ts";
import { type AscetComponentEditableParams, ascetComponentEditableParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetComponentEditableTool = defineSequentialAscetTool({
	name: "ascet_component_editable",
	label: "ASCET component editable",
	description: "Check whether an ASCET component is editable or request an ASCET SCM lock.",
	...ascetComponentEditablePrompt,
	parameters: ascetComponentEditableParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetComponentEditableParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext & {
			env?: Record<string, string | undefined>;
			executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
			scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
		},
	) {
		const result = await runApprovedAscetComponentEditable(
			params,
			{
				cwd: ctx.cwd,
				env: ctx.env,
				signal,
				timeoutMs: params.mode === "set" ? 120_000 : 60_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		const route = routeAscetAction({ toolName: "ascet_component_editable", action: params.mode });
		return {
			content: [{ type: "text", text: formatAscetComponentEditableResult(result, params) }],
			details: {
				ok: result.ok,
				mode: params.mode,
				value: result.ok && typeof result.data === "boolean" ? result.data : undefined,
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
				error: result.error,
			},
		};
	},
});

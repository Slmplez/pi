import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { createAscetSchedulerStatusReport } from "../../scheduler/status.ts";
import { toToolSuccessPayload } from "../../tool-response-contract.ts";
import { ascetSchedulerStatusPrompt } from "./prompt.ts";
import { type AscetSchedulerStatusParams, ascetSchedulerStatusParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetSchedulerStatusTool = defineSequentialAscetTool({
	name: "ascet_scheduler_status",
	label: "ASCET scheduler status",
	description: "Inspect ASCET scheduler queue status, PI CLI lock ownership, and degraded operation health.",
	...ascetSchedulerStatusPrompt,
	parameters: ascetSchedulerStatusParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetSchedulerStatusParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		_ctx: { cwd: string },
	) {
		const report = await createAscetSchedulerStatusReport(params.action ?? "status");
		const text = params.format === "text" ? report.summary : JSON.stringify(toToolSuccessPayload(report), null, 2);
		const action = params.action ?? "status";
		const route = routeAscetAction({ toolName: "ascet_scheduler_status", action });
		return {
			content: [{ type: "text", text }],
			details: {
				...report,
				tool: "ascet_scheduler_status",
				action,
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});

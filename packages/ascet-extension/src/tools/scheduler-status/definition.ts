import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { createAscetSchedulerStatusReport } from "../../scheduler/status.ts";
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
		ctx: { cwd: string },
	) {
		const report = await createAscetSchedulerStatusReport(params.action ?? "status", { cwd: ctx.cwd });
		const text = params.format === "json" ? JSON.stringify(report, null, 2) : report.summary;
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

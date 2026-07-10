import { Type } from "typebox";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { type AscetSchedulerStatusAction, createAscetSchedulerStatusReport } from "../../scheduler/status.ts";
import { ascetSchedulerStatusPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export type AscetSchedulerStatusParams = {
	action?: AscetSchedulerStatusAction;
	format?: "text" | "json";
};

export const ascetSchedulerStatusParameters = Type.Object({
	action: Type.Optional(Type.Union([Type.Literal("status"), Type.Literal("recover")])),
	format: Type.Optional(Type.Union([Type.Literal("text"), Type.Literal("json")])),
});

export const ascetSchedulerStatusTool = defineSequentialAscetTool({
	name: "ascet_scheduler_status",
	label: "ASCET scheduler status",
	description: "Inspect ASCET scheduler queue status, PI CLI lock ownership, and degraded operation health.",
	...ascetSchedulerStatusPrompt,
	parameters: ascetSchedulerStatusParameters,
	renderCall,
	renderResult,
	async execute(_toolCallId: string, params: AscetSchedulerStatusParams, _signal: AbortSignal, _onUpdate: unknown) {
		const report = await createAscetSchedulerStatusReport(params.action ?? "status");
		const text = params.format === "json" ? JSON.stringify(report, null, 2) : report.summary;
		return {
			content: [{ type: "text", text }],
			details: report,
		};
	},
});

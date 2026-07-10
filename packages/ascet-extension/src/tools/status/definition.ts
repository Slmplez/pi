import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { createAscetStatusReport } from "../../status.ts";
import { ascetStatusPrompt } from "./prompt.ts";
import { type AscetStatusParams, ascetStatusParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetStatusTool = defineSequentialAscetTool({
	name: "ascet_status",
	label: "ASCET status",
	description: "Report whether the local ASCET CLI executable and contract catalog are resolvable.",
	...ascetStatusPrompt,
	parameters: ascetStatusParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		_params: AscetStatusParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const report = createAscetStatusReport({ cwd: ctx.cwd });
		const route = routeAscetAction({ toolName: "ascet_status", action: "status" });
		return {
			content: [{ type: "text", text: report.summary }],
			details: {
				...report,
				tool: "ascet_status",
				action: "status",
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});

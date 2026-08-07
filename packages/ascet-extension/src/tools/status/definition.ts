import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { type AscetRuntimeStatusOptions, createAscetRuntimeStatusReport } from "../../status-runtime.ts";
import { ascetStatusPrompt } from "./prompt.ts";
import { type AscetStatusParams, ascetStatusParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetStatusTool = defineSequentialAscetTool({
	name: "ascet_status",
	label: "ASCET status",
	description: "Report ASCET installation, DLL, live ToolAPI, and scheduler diagnostics.",
	...ascetStatusPrompt,
	parameters: ascetStatusParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		_params: AscetStatusParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; ascetStatusLiveToolApiProbe?: AscetRuntimeStatusOptions["liveToolApiProbe"] },
	) {
		const report = await createAscetRuntimeStatusReport({
			cwd: ctx.cwd,
			signal,
			liveToolApiProbe: ctx.ascetStatusLiveToolApiProbe,
		});
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

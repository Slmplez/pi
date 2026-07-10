import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { type AscetRuntimeStatusOptions, createAscetRuntimeStatusReport } from "../../status-runtime.ts";
import { ascetStatusPrompt } from "./prompt.ts";
import { type AscetStatusParams, ascetStatusParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetStatusTool = defineSequentialAscetTool({
	name: "ascet_status",
	label: "ASCET status",
	description: "Report ASCET installation paths and verify the live ASCET ToolAPI runtime is reachable.",
	...ascetStatusPrompt,
	parameters: ascetStatusParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		_params: AscetStatusParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; ascetStatusProbe?: AscetRuntimeStatusOptions["probe"] },
	) {
		const report = await createAscetRuntimeStatusReport({ cwd: ctx.cwd, signal: _signal, probe: ctx.ascetStatusProbe });
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

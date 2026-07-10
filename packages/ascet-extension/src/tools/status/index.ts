import { Type } from "typebox";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { createAscetStatusReport } from "../../status.ts";
import { ascetStatusPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetStatusTool = defineSequentialAscetTool({
	name: "ascet_status",
	label: "ASCET status",
	description: "Report whether the local ASCET CLI executable and contract catalog are resolvable.",
	...ascetStatusPrompt,
	parameters: Type.Object({}),
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		_params: Record<string, never>,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const report = createAscetStatusReport({ cwd: ctx.cwd });
		return {
			content: [{ type: "text", text: report.summary }],
			details: report,
		};
	},
});

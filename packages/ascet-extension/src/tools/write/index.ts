import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { type AscetWriteParams, ascetWriteParameters, formatAscetWriteResult, runAscetWrite } from "../write.ts";
import { ascetWritePrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetWriteTool = defineSequentialAscetTool({
	name: "ascet_write",
	label: "ASCET write",
	description: "Run a guarded single ASCET write action with canonical preflight and interactive confirmation.",
	...ascetWritePrompt,
	parameters: ascetWriteParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetWriteParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runAscetWrite(params, { cwd: ctx.cwd, signal, timeoutMs: 120_000 }, ctx);
		return {
			content: [{ type: "text", text: formatAscetWriteResult(result) }],
			details: result.details,
		};
	},
});

import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetRecoverParams,
	ascetRecoverParameters,
	formatAscetRecoverResult,
	runAscetRecover,
} from "../recover.ts";
import { ascetRecoverPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetRecoverTool = defineSequentialAscetTool({
	name: "ascet_recover",
	label: "ASCET recover",
	description: "Run safe ASCET extension recovery actions without touching user-owned ASCET processes.",
	...ascetRecoverPrompt,
	parameters: ascetRecoverParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetRecoverParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetRecover(params, { cwd: ctx.cwd });
		return {
			content: [{ type: "text", text: formatAscetRecoverResult(result) }],
			details: result,
		};
	},
});

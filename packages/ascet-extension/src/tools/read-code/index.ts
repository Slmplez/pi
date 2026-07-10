import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetReadCodeParams,
	ascetReadCodeParameters,
	formatAscetReadCodeResult,
	runAscetReadCode,
} from "../read-code.ts";
import { ascetReadCodePrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetReadCodeTool = defineSequentialAscetTool({
	name: "ascet_read_code",
	label: "ASCET read code",
	description: "Read ASCET method, component, or text-code sections through canonical actions.",
	...ascetReadCodePrompt,
	parameters: ascetReadCodeParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetReadCodeParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReadCode(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 });
		return {
			content: [{ type: "text", text: formatAscetReadCodeResult(params, result) }],
			details: result,
		};
	},
});

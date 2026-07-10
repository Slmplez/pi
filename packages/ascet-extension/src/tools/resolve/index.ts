import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetResolveParams,
	ascetResolveParameters,
	formatAscetResolveResult,
	runAscetResolve,
} from "../resolve.ts";
import { ascetResolvePrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetResolveTool = defineSequentialAscetTool({
	name: "ascet_resolve",
	label: "ASCET resolve",
	description: "Resolve ambiguous ASCET targets before read, compare, verify, or write operations.",
	...ascetResolvePrompt,
	parameters: ascetResolveParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetResolveParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetResolve(params, { cwd: ctx.cwd, signal, timeoutMs: 35_000 });
		return {
			content: [{ type: "text", text: formatAscetResolveResult(result) }],
			details: result,
		};
	},
});

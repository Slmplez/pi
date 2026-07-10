import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetCompareParams,
	ascetCompareParameters,
	formatAscetCompareResult,
	runAscetCompare,
} from "../compare.ts";
import { ascetComparePrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetCompareTool = defineSequentialAscetTool({
	name: "ascet_compare",
	label: "ASCET compare",
	description: "Compare ASCET components, methods, element specs, project formulas, and state-machine domains.",
	...ascetComparePrompt,
	parameters: ascetCompareParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetCompareParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetCompare(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 });
		return {
			content: [{ type: "text", text: formatAscetCompareResult(params, result) }],
			details: result,
		};
	},
});

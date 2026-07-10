import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetInspectParams,
	ascetInspectParameters,
	formatAscetInspectResult,
	runAscetInspect,
} from "../inspect.ts";
import { ascetInspectPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetInspectTool = defineSequentialAscetTool({
	name: "ascet_inspect",
	label: "ASCET inspect",
	description: "Inspect ASCET summaries, children, project formulas, and named block diagrams.",
	...ascetInspectPrompt,
	parameters: ascetInspectParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetInspectParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetInspect(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 });
		return {
			content: [{ type: "text", text: formatAscetInspectResult(params, result) }],
			details: result,
		};
	},
});

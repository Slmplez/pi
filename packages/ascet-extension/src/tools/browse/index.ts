import { defineSequentialAscetTool } from "../../core/tool.ts";
import { type AscetBrowseParams, ascetBrowseParameters, formatAscetBrowseResult, runAscetBrowse } from "../browse.ts";
import { ascetBrowsePrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetBrowseTool = defineSequentialAscetTool({
	name: "ascet_browse",
	label: "ASCET browse",
	description: "Browse ASCET folders, components, children, methods, and diagrams through canonical actions.",
	...ascetBrowsePrompt,
	parameters: ascetBrowseParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetBrowseParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetBrowse(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatAscetBrowseResult(params, result) }],
			details: result,
		};
	},
});

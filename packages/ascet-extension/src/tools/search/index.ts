import { defineSequentialAscetTool } from "../../core/tool.ts";
import { type AscetSearchParams, ascetSearchParameters, formatAscetSearchResult, runAscetSearch } from "../search.ts";
import { ascetSearchPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetSearchTool = defineSequentialAscetTool({
	name: "ascet_search",
	label: "ASCET search",
	description: "Search ASCET components, elements, and occurrences through canonical actions.",
	...ascetSearchPrompt,
	parameters: ascetSearchParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetSearchParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetSearch(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatAscetSearchResult(params, result) }],
			details: result,
		};
	},
});

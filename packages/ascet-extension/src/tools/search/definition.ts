import { defineSequentialAscetTool } from "../../core/tool.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { formatAscetSearchResult, runAscetSearch } from "../search.ts";
import { ascetSearchPrompt } from "./prompt.ts";
import { type AscetSearchParams, ascetSearchParameters } from "./schema.ts";
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
		ctx: { cwd: string; executeCli?: Parameters<typeof runAscetSearch>[1]["executeCli"] },
	) {
		const result = await runAscetSearch(params, {
			cwd: ctx.cwd,
			signal,
			timeoutMs: 60_000,
			executeCli: ctx.executeCli,
		});
		return {
			content: [{ type: "text", text: formatAscetSearchResult(params, result) }],
			details: createAscetCliToolDetails("ascet_search", params.action, result),
		};
	},
});

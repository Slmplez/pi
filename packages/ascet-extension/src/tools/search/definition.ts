import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetSearchParams,
	ascetSearchParameters,
	normalizeAscetSearchResult,
	runAscetSearch,
} from "../../search.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetSearchTool = defineSequentialAscetTool({
	name: "ascet_search",
	label: "ASCET search",
	description: "Search the ten native ASCET Search modes. Returns compact matches only.",
	promptSnippet: "Run one live native ASCET Search query for candidate discovery.",
	promptGuidelines: [
		"Search results are hints, not complete metadata. Resolve an exact path before ascet_get, ascet_read, or any edit.",
	],
	parameters: ascetSearchParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetSearchParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runAscetSearch(params, {
			cwd: ctx.cwd,
			env: ctx.env,
			signal,
			agentId: ctx.agentId,
			scheduler: ctx.scheduler,
			executeCli: ctx.executeCli,
		});
		const normalized = normalizeAscetSearchResult(params, result);
		if (!normalized.ok) {
			return {
				content: [{ type: "text", text: JSON.stringify({ error: normalized.error }) }],
				details: {
					tool: "ascet_search",
					action: params.mode,
					error: normalized.error,
					diagnostics: {
						exitCode: result.exitCode,
						timedOut: result.timedOut,
					},
				},
			};
		}

		const output = {
			count: normalized.data.count,
			items: normalized.data.items,
			...(normalized.data.more ? { more: true } : {}),
		};
		return {
			content: [{ type: "text", text: JSON.stringify(output) }],
			details: {
				tool: "ascet_search",
				action: params.mode,

				diagnostics: {
					searchMs: normalized.data.searchMs,
					queueWaitMs: normalized.data.queueWaitMs,
					exitCode: result.exitCode,
				},
			},
		};
	},
});

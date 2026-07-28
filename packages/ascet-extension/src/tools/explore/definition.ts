import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatListComponentsResult, runAscetListComponents } from "../../list-components.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetExplorePrompt } from "./prompt.ts";
import { type AscetExploreParams, ascetExploreParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

interface RunOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

async function runAscetExplore(params: AscetExploreParams, options: RunOptions): Promise<AscetCliJsonResult> {
	return runAscetListComponents(params, options);
}

function formatAscetExploreResult(_params: AscetExploreParams, result: AscetCliJsonResult): string {
	return formatListComponentsResult(result);
}

export const ascetExploreTool = defineSequentialAscetTool({
	name: "ascet_explore",
	label: "ASCET explore",
	description: "Browse ASCET folder trees and database items from the quick-search index.",
	...ascetExplorePrompt,
	parameters: ascetExploreParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetExploreParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; executeCli?: RunOptions["executeCli"] },
	) {
		const result = await runAscetExplore(
			{
				...params,
			},
			{ cwd: ctx.cwd, signal, timeoutMs: 90_000, executeCli: ctx.executeCli },
		);
		return {
			content: [{ type: "text", text: formatAscetExploreResult(params, result) }],
			details: createAscetCliToolDetails("ascet_explore", params.action, result),
		};
	},
});

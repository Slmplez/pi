import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatListComponentsResult, runAscetListComponents } from "../../list-components.ts";
import { formatListDiagramsResult, runAscetListDiagrams } from "../../list-diagrams.ts";
import { formatReadComponentChildrenResult, runAscetReadComponentChildren } from "../../read-component-children.ts";
import { formatReadComponentSummaryResult, runAscetReadComponentSummary } from "../../read-component-summary.ts";
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
	switch (params.action) {
		case "list_components": {
			const { kind, ...listParams } = params;
			return runAscetListComponents(
				{ ...listParams, kind: kind === "all" || kind === "folder" ? undefined : kind },
				options,
			);
		}
		case "list_diagrams":
			return runAscetListDiagrams(params, options);
		case "inspect_target":
			return runAscetReadComponentSummary(
				{ componentPath: params.componentPath, detailLevel: params.detailLevel },
				options,
			);
		case "preview_children":
			return runAscetReadComponentChildren({ componentPath: params.componentPath, group: params.group }, options);
	}
}

function formatAscetExploreResult(params: AscetExploreParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "list_components":
			return formatListComponentsResult(result);
		case "list_diagrams":
			return formatListDiagramsResult(result);
		case "inspect_target":
			return formatReadComponentSummaryResult(result);
		case "preview_children":
			return formatReadComponentChildrenResult(result);
	}
}

export const ascetExploreTool = defineSequentialAscetTool({
	name: "ascet_explore",
	label: "ASCET explore",
	description: "Explore ASCET folders, component candidates, diagrams, target summaries, and children.",
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

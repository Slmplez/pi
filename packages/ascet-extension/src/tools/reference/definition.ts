import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatReadComponentRefsResult, runAscetReadComponentRefs } from "../../read-component-refs.ts";
import { formatReadComponentUsedByResult, runAscetReadComponentUsedBy } from "../../read-component-used-by.ts";
import { formatReadElementRefsResult, runAscetReadElementRefs } from "../../read-element-refs.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetReferencePrompt } from "./prompt.ts";
import { type AscetReferenceParams, ascetReferenceParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

interface RunOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

async function runAscetReference(params: AscetReferenceParams, options: RunOptions): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "component_refs":
			return runAscetReadComponentRefs(params, options);
		case "used_by":
			return runAscetReadComponentUsedBy(params, options);
		case "element_refs":
			return runAscetReadElementRefs(params, options);
	}
}

function formatAscetReferenceResult(params: AscetReferenceParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "component_refs":
			return formatReadComponentRefsResult(result);
		case "used_by":
			return formatReadComponentUsedByResult(result);
		case "element_refs":
			return formatReadElementRefsResult(result);
	}
}

export const ascetReferenceTool = defineSequentialAscetTool({
	name: "ascet_reference",
	label: "ASCET reference",
	description: "Read ASCET component references, bounded reverse references, and element references.",
	...ascetReferencePrompt,
	parameters: ascetReferenceParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetReferenceParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; executeCli?: RunOptions["executeCli"] },
	) {
		const result = await runAscetReference(params, {
			cwd: ctx.cwd,
			signal,
			timeoutMs: 90_000,
			executeCli: ctx.executeCli,
		});
		return {
			content: [{ type: "text", text: formatAscetReferenceResult(params, result) }],
			details: createAscetCliToolDetails("ascet_reference", params.action, result),
		};
	},
});

import { defineSequentialAscetTool } from "../../core/tool.ts";
import { ascetRequirementsPrompt } from "./prompt.ts";
import { formatAscetRequirementsResult, runAscetRequirements } from "./risk-context.ts";
import { type AscetRequirementsParams, ascetRequirementsParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetRequirementsTool = defineSequentialAscetTool({
	name: "ascet_requirements",
	label: "ASCET requirements",
	description: "Read-only retrieval of Excel requirement risk context before ASCET design.",
	...ascetRequirementsPrompt,
	parameters: ascetRequirementsParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetRequirementsParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetRequirements(params, { cwd: ctx.cwd });
		return {
			content: [{ type: "text", text: formatAscetRequirementsResult(result, params) }],
			details: result,
		};
	},
});

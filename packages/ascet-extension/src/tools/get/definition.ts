import { defineSequentialAscetTool } from "../../core/tool.ts";
import { type AscetGetParams, ascetGetParameters, formatAscetGetResult, runAscetGet } from "../../get.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetGetPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetGetTool = defineSequentialAscetTool({
	name: "ascet_get",
	label: "ASCET get",
	description:
		"Read ASCET tree, database catalogs, elements, formulas, references, bindings, and BDE edges on demand.",
	...ascetGetPrompt,
	parameters: ascetGetParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId,
		params: AscetGetParams,
		signal,
		_onUpdate,
		ctx: { cwd: string; executeCli?: Parameters<typeof runAscetGet>[1]["executeCli"] },
	) {
		const result = await runAscetGet(params, {
			cwd: ctx.cwd,
			signal,
			executeCli: ctx.executeCli,
		});
		return {
			content: [{ type: "text", text: formatAscetGetResult(params, result) }],
			details: createAscetCliToolDetails("ascet_get", params.action, result),
		};
	},
});

import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { formatAscetRecoverResult, runAscetRecover } from "../recover.ts";
import { ascetRecoverPrompt } from "./prompt.ts";
import { type AscetRecoverParams, ascetRecoverParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetRecoverTool = defineSequentialAscetTool({
	name: "ascet_recover",
	label: "ASCET recover",
	description: "Run safe ASCET extension recovery actions without touching user-owned ASCET processes.",
	...ascetRecoverPrompt,
	parameters: ascetRecoverParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetRecoverParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runAscetRecover(params, {
			cwd: ctx.cwd,
			env: ctx.env,
			signal,
			executeCli: ctx.executeCli,
			confirm:
				ctx.hasUI && ctx.ui?.confirm ? (title, message) => ctx.ui!.confirm(title, message, { signal }) : undefined,
		});
		const route = routeAscetAction({ toolName: "ascet_recover", action: params.action });
		return {
			content: [{ type: "text", text: formatAscetRecoverResult(result) }],
			details: {
				...result,
				tool: "ascet_recover",
				action: params.action,
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});

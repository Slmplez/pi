import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { formatAscetCapabilitiesResult, runAscetCapabilities } from "../capabilities.ts";
import { ascetCapabilitiesPrompt } from "./prompt.ts";
import { type AscetCapabilitiesParams, ascetCapabilitiesParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetCapabilitiesTool = defineSequentialAscetTool({
	name: "ascet_capabilities",
	label: "ASCET capabilities",
	description: "Search bundled ASCET operations by family, risk, object kind, or operation name.",
	...ascetCapabilitiesPrompt,
	parameters: ascetCapabilitiesParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetCapabilitiesParams,
		_signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = runAscetCapabilities(params, { cwd: ctx.cwd });
		const route = routeAscetAction({ toolName: "ascet_capabilities", action: "search" });
		return {
			content: [{ type: "text", text: formatAscetCapabilitiesResult(result) }],
			details: {
				...result,
				tool: "ascet_capabilities",
				action: "search",
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});

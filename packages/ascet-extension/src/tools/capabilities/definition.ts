import { defineSequentialAscetTool } from "../../core/tool.ts";
import { routeAscetAction } from "../../routing/router.ts";
import { formatAscetCapabilitiesResult, runAscetCapabilities, toAscetCapabilitiesPayload } from "../capabilities.ts";
import { ascetCapabilitiesPrompt } from "./prompt.ts";
import { type AscetCapabilitiesParams, ascetCapabilitiesParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetCapabilitiesTool = defineSequentialAscetTool({
	name: "ascet_capabilities",
	label: "ASCET capabilities",
	description: "Search ASCET tool actions or bundled backend operations.",
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
		const action = params.action ?? "search_actions";
		const route = routeAscetAction({ toolName: "ascet_capabilities", action: "search_actions" });
		return {
			content: [{ type: "text", text: formatAscetCapabilitiesResult(result) }],
			details: {
				result: toAscetCapabilitiesPayload(result),
				tool: "ascet_capabilities",
				action,
				command: {
					logicalCommandId: route.logicalCommandId,
					backendCommandId: route.backendCommandId,
					operation: route.operation,
				},
			},
		};
	},
});

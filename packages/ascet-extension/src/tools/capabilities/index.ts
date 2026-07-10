import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetCapabilitiesParams,
	ascetCapabilitiesParameters,
	formatAscetCapabilitiesResult,
	runAscetCapabilities,
} from "../capabilities.ts";
import { ascetCapabilitiesPrompt } from "./prompt.ts";
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
		return {
			content: [{ type: "text", text: formatAscetCapabilitiesResult(result) }],
			details: result,
		};
	},
});

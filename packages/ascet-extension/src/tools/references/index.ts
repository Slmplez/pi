import { defineSequentialAscetTool } from "../../core/tool.ts";
import {
	type AscetReferencesParams,
	ascetReferencesParameters,
	formatAscetReferencesResult,
	runAscetReferences,
} from "../references.ts";
import { ascetReferencesPrompt } from "./prompt.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetReferencesTool = defineSequentialAscetTool({
	name: "ascet_references",
	label: "ASCET references",
	description: "Read ASCET element references, component references, and bounded reverse references.",
	...ascetReferencesPrompt,
	parameters: ascetReferencesParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetReferencesParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetReferences(params, { cwd: ctx.cwd, signal, timeoutMs: 90_000 });
		return {
			content: [{ type: "text", text: formatAscetReferencesResult(params, result) }],
			details: result,
		};
	},
});

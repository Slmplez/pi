import { defineSequentialAscetTool } from "../../core/tool.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { formatAscetVerifyResult, runAscetVerify } from "../verify.ts";
import { ascetVerifyPrompt } from "./prompt.ts";
import { type AscetVerifyParams, ascetVerifyParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetVerifyTool = defineSequentialAscetTool({
	name: "ascet_verify",
	label: "ASCET verify",
	description: "Verify live ASCET state through canonical readback actions.",
	...ascetVerifyPrompt,
	parameters: ascetVerifyParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetVerifyParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string },
	) {
		const result = await runAscetVerify(params, { cwd: ctx.cwd, signal, timeoutMs: 60_000 });
		return {
			content: [{ type: "text", text: formatAscetVerifyResult(result) }],
			details: createAscetCliToolDetails("ascet_verify", params.action, result),
		};
	},
});

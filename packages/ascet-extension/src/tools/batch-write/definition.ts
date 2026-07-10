import { createBatchWriteOutcome, formatBatchWriteResult, runApprovedAscetBatchWrite } from "../../batch-write.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetBatchWritePrompt } from "./prompt.ts";
import { type AscetBatchWriteParams, ascetBatchWriteParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

export const ascetBatchWriteTool = defineSequentialAscetTool({
	name: "ascet_batch_write",
	label: "ASCET batch write",
	description: "Run one ASCET batch write operation after explicit interactive confirmation.",
	...ascetBatchWritePrompt,
	parameters: ascetBatchWriteParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetBatchWriteParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetBatchWrite(params, { cwd: ctx.cwd, signal, timeoutMs: 120_000 }, ctx);
		return {
			content: [{ type: "text", text: formatBatchWriteResult(result) }],
			details: {
				...createAscetCliToolDetails("ascet_batch_write", params.operation, result),
				outcome: createBatchWriteOutcome(result),
			},
		};
	},
});

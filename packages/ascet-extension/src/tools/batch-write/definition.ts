import {
	createBatchWriteOutcome,
	formatBatchWriteResult,
	runApprovedAscetBatchWrite,
	validateAscetBatchWriteParams,
} from "../../batch-write.ts";
import { type AscetToolContext, defineSequentialAscetTool } from "../../core/tool.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetBatchWritePrompt } from "./prompt.ts";
import { type AscetBatchWriteParams, ascetBatchWriteParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

function prepareAscetBatchWriteArguments(args: unknown): AscetBatchWriteParams {
	if (!args || typeof args !== "object" || Array.isArray(args)) {
		return args as AscetBatchWriteParams;
	}
	return validateAscetBatchWriteParams(args as AscetBatchWriteParams);
}

export const ascetBatchWriteTool = defineSequentialAscetTool({
	name: "ascet_batch_write",
	label: "ASCET batch write",
	description: "Run one permission-aware guarded ASCET batch write operation with mandatory readback.",
	...ascetBatchWritePrompt,
	parameters: ascetBatchWriteParameters,
	prepareArguments: prepareAscetBatchWriteArguments,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetBatchWriteParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: AscetToolContext,
	) {
		const result = await runApprovedAscetBatchWrite(
			params,
			{
				cwd: ctx.cwd,
				env: ctx.env,
				signal,
				timeoutMs: 120_000,
				executeCli: ctx.executeCli,
				scheduler: ctx.scheduler,
			},
			ctx,
		);
		const outcome = createBatchWriteOutcome(result);
		const content = result.mutationResult ?? outcome;
		return {
			content: [{ type: "text", text: JSON.stringify(content, null, 2) }],
			details: {
				...createAscetCliToolDetails("ascet_batch_write", params.operation, result),
				outcome,
				mutationResult: result.mutationResult,
				rawContent: formatBatchWriteResult(result),
			},
		};
	},
});

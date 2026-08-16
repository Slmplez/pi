import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { getAscetDatabaseIdentity, type AscetGetParams as LegacyAscetGetParams, runAscetGet } from "../../get.ts";
import type { AscetScheduler } from "../../scheduler/scheduler.ts";
import { unwrapToolSuccessPayload } from "../../tool-response-contract.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetGetPrompt } from "./prompt.ts";
import { type AscetGetParams, ascetGetParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

type JsonRecord = Record<string, unknown>;

function isRecord(value: unknown): value is JsonRecord {
	return value !== null && typeof value === "object" && !Array.isArray(value);
}

function toLegacyParams(params: AscetGetParams): LegacyAscetGetParams {
	if (params.action === "tree") {
		return {
			action: "tree",
			...(params.path ? { target: { path: params.path } } : {}),
			traversal: { depth: params.depth ?? 1 },
			delivery: "inline",
		};
	}
	return {
		action: "formulas",
		target: { path: params.path },
		...(params.name ? { formulaName: params.name } : {}),
		delivery: "inline",
	};
}

function createAgentOutput(result: AscetCliJsonResult): JsonRecord {
	if (!result.ok) {
		return {
			error: {
				code: result.error?.code ?? "ascet_get_failed",
				message: result.error?.message ?? "ASCET Get failed.",
			},
		};
	}
	const payload = unwrapToolSuccessPayload(result.data);
	if (!isRecord(payload)) {
		return {
			error: {
				code: "ascet_get_invalid_response",
				message: "ASCET Get returned an invalid response.",
			},
		};
	}
	const items = Array.isArray(payload.items) ? payload.items : [];
	const count =
		typeof payload.count === "number" && Number.isInteger(payload.count) && payload.count >= 0
			? payload.count
			: items.length;
	return {
		count,
		items,
		...(payload.truncated === true || payload.more === true ? { more: true } : {}),
	};
}

function createGetDetails(action: AscetGetParams["action"], result: AscetCliJsonResult): Record<string, unknown> {
	const details: Record<string, unknown> = { ...createAscetCliToolDetails("ascet_get", action, result) };
	delete details.data;
	if (!result.ok) return details;
	const payload = unwrapToolSuccessPayload(result.data);
	if (!isRecord(payload)) return details;
	if (payload.coverage !== undefined) details.coverage = payload.coverage;
	if (typeof payload.source === "string") details.source = payload.source;
	if (payload.truncated === true) details.truncated = true;
	const database = getAscetDatabaseIdentity(payload);
	if (database) details.sourceIdentity = { database };
	return details;
}

export const ascetGetTool = defineSequentialAscetTool({
	name: "ascet_get",
	label: "ASCET get",
	description: "Read a bounded ASCET tree or exact Project formulas.",
	...ascetGetPrompt,
	parameters: ascetGetParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetGetParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: {
			cwd: string;
			env?: Record<string, string | undefined>;
			agentId?: string;
			executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
			scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
		},
	) {
		const result = await runAscetGet(toLegacyParams(params), {
			cwd: ctx.cwd,
			env: ctx.env,
			signal,
			agentId: ctx.agentId,
			executeCli: ctx.executeCli,
			scheduler: ctx.scheduler,
		});
		return {
			content: [{ type: "text", text: JSON.stringify(createAgentOutput(result)) }],
			details: createGetDetails(params.action, result),
		};
	},
});

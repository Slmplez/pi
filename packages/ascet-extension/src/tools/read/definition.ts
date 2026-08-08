import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatReadBlockDiagramResult, runAscetReadBlockDiagram } from "../../read-block-diagram.ts";
import { formatReadDependentChainResult, runAscetReadDependentChain } from "../../read-dependent-chain.ts";
import { formatReadElementResult, runAscetReadElement } from "../../read-element.ts";
import { formatReadElementDependencyResult, runAscetReadElementDependency } from "../../read-element-dependency.ts";
import { formatReadImplementationResult, runAscetReadImplementation } from "../../read-implementation.ts";
import { formatReadMethodSignatureResult, runAscetReadMethodSignature } from "../../read-method-signature.ts";
import { formatReadStateMachineFlowResult, runAscetReadStateMachineFlow } from "../../read-state-machine-flow.ts";
import { formatReadTextCodeResult, runAscetReadTextCode } from "../../read-text-code.ts";
import { createHashSummary } from "../../tool-response-contract.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetReadPrompt } from "./prompt.ts";
import { type AscetReadParams, ascetReadParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

interface RunOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

const READ_BLOCK_DIAGRAM_DEFAULT_TIMEOUT_MS = 60_000;

async function runAscetRead(params: AscetReadParams, options: RunOptions): Promise<AscetCliJsonResult> {
	switch (params.action) {
		case "read_code":
			return applyReadCodeDetailLevel(params.detailLevel, await runAscetReadTextCode(params, options));
		case "read_method_signature":
			return runAscetReadMethodSignature(
				{ componentPath: params.componentPath, methodName: params.methodName },
				options,
			);
		case "read_implementation":
			return runAscetReadImplementation(
				{
					componentPath: params.componentPath,
					mode: params.implementationMode,
					implementationName: params.implementationName,
					timeoutMs: params.timeoutMs,
				},
				{ ...options, timeoutMs: params.timeoutMs ?? options.timeoutMs },
			);
		case "read_element":
			return runAscetReadElement(
				{
					componentPath: params.componentPath,
					elementName: params.elementName,
					timeoutMs: params.timeoutMs,
				},
				{ ...options, timeoutMs: params.timeoutMs ?? options.timeoutMs },
			);
		case "read_block_diagram":
			return runAscetReadBlockDiagram(
				{
					componentPath: params.componentPath,
					diagramName: params.diagramName ?? "Main",
				},
				{
					...options,
					timeoutMs: normalizeTimeoutMs(params.timeoutMs) ?? READ_BLOCK_DIAGRAM_DEFAULT_TIMEOUT_MS,
				},
			);
		case "read_state_machine_flow":
			return runAscetReadStateMachineFlow(
				{
					componentPath: params.componentPath,
					traceDepth: params.traceDepth,
					detailLevel: params.detailLevel === "topology" ? "summary" : params.detailLevel,
				},
				options,
			);
		case "read_dependent_chain":
			return runAscetReadDependentChain(params, options);
		case "read_element_dependency":
			return runAscetReadElementDependency(params, options);
	}
}

function normalizeTimeoutMs(timeoutMs: number | undefined): number | undefined {
	if (timeoutMs === undefined || !Number.isFinite(timeoutMs) || timeoutMs <= 0) {
		return undefined;
	}
	return Math.trunc(timeoutMs);
}

function formatAscetReadResult(params: AscetReadParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "read_code":
			return formatReadTextCodeResult(result);
		case "read_method_signature":
			return formatReadMethodSignatureResult(result);
		case "read_implementation":
			return formatReadImplementationResult(result);
		case "read_element":
			return formatReadElementResult(result);
		case "read_block_diagram":
			return formatReadBlockDiagramResult(result);
		case "read_state_machine_flow":
			return formatReadStateMachineFlowResult(result);
		case "read_dependent_chain":
			return formatReadDependentChainResult(result);
		case "read_element_dependency":
			return formatReadElementDependencyResult(result);
	}
}

function applyReadCodeDetailLevel(
	detailLevel: "summary" | "topology" | "full" | undefined,
	result: AscetCliJsonResult,
): AscetCliJsonResult {
	if (detailLevel === undefined || detailLevel === "full" || !result.ok) {
		return result;
	}
	const data = trimFullText(result.data, detailLevel);
	return {
		...result,
		data,
		stdout: JSON.stringify(data),
	};
}

function trimFullText(data: unknown, detailLevel: "summary" | "topology"): unknown {
	if (data === null || typeof data !== "object" || Array.isArray(data)) {
		return data;
	}
	const envelope = data as Record<string, unknown>;
	const result = envelope.result;
	if (result === null || typeof result !== "object" || Array.isArray(result)) {
		return data;
	}
	return {
		...envelope,
		result: trimObjectText(result as Record<string, unknown>, detailLevel),
	};
}

function trimObjectText(
	payload: Record<string, unknown>,
	detailLevel: "summary" | "topology",
): Record<string, unknown> {
	const { text: _text, fullText: _fullText, code: _code, ...rest } = payload;
	const text = typeof payload.text === "string" ? payload.text : typeof payload.code === "string" ? payload.code : "";
	const language = typeof payload.language === "string" ? payload.language : undefined;
	const summary = createHashSummary({ text, language });
	return {
		...rest,
		...(detailLevel === "topology" ? { detailLevel } : {}),
		...summary,
	};
}

export const ascetReadTool = defineSequentialAscetTool({
	name: "ascet_read",
	label: "ASCET read",
	description: "Read live ASCET code text, implementations, block diagrams, and state-machine flows.",
	...ascetReadPrompt,
	parameters: ascetReadParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetReadParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; executeCli?: RunOptions["executeCli"] },
	) {
		const result = await runAscetRead(params, {
			cwd: ctx.cwd,
			signal,
			timeoutMs: 90_000,
			executeCli: ctx.executeCli,
		});
		return {
			content: [{ type: "text", text: formatAscetReadResult(params, result) }],
			details: createAscetCliToolDetails("ascet_read", params.action, result),
		};
	},
});

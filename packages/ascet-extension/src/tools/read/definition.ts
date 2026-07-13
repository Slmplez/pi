import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatPlanElementDependencyResult, runAscetPlanElementDependency } from "../../plan-element-dependency.ts";
import { formatReadBlockDiagramResult, runAscetReadBlockDiagram } from "../../read-block-diagram.ts";
import { formatReadComponentSummaryResult, runAscetReadComponentSummary } from "../../read-component-summary.ts";
import { formatReadImplementationResult, runAscetReadImplementation } from "../../read-implementation.ts";
import {
	formatReadImportExportMatchesResult,
	formatReadImportExportMatchResult,
	runAscetReadImportExportMatch,
	runAscetReadImportExportMatches,
} from "../../read-import-export-match.ts";
import { formatReadMethodCodeResult, runAscetReadMethodCode } from "../../read-method-code.ts";
import { formatReadMethodSignatureResult, runAscetReadMethodSignature } from "../../read-method-signature.ts";
import { formatReadStateMachineFlowResult, runAscetReadStateMachineFlow } from "../../read-state-machine-flow.ts";
import { formatReadTextCodeResult, runAscetReadTextCode } from "../../read-text-code.ts";
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
		case "read":
			if (params.methodName) {
				return runAscetReadMethodCode(
					{ componentPath: params.componentPath, methodName: params.methodName },
					options,
				);
			}
			return runAscetReadComponentSummary({ componentPath: params.componentPath }, options);
		case "read_code":
			return runAscetReadTextCode(params, options);
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
				},
				options,
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
				},
				options,
			);
		case "read_import_export_match":
			return runAscetReadImportExportMatch(params, options);
		case "read_import_export_matches":
			return runAscetReadImportExportMatches(params, options);
		case "plan_element_dependency": {
			const targetPath = params.targetPath ?? params.componentPath ?? "";
			return runAscetPlanElementDependency(
				{
					targetPath,
					elementName: params.elementName,
					targetKind: params.targetKind,
				},
				options,
			);
		}
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
		case "read":
			return params.methodName ? formatReadMethodCodeResult(result) : formatReadComponentSummaryResult(result);
		case "read_code":
			return formatReadTextCodeResult(result);
		case "read_method_signature":
			return formatReadMethodSignatureResult(result);
		case "read_implementation":
			return formatReadImplementationResult(result);
		case "read_block_diagram":
			return formatReadBlockDiagramResult(result);
		case "read_state_machine_flow":
			return formatReadStateMachineFlowResult(result);
		case "read_import_export_match":
			return formatReadImportExportMatchResult(result);
		case "read_import_export_matches":
			return formatReadImportExportMatchesResult(result);
		case "plan_element_dependency":
			return formatPlanElementDependencyResult(result);
	}
}

export const ascetReadTool = defineSequentialAscetTool({
	name: "ascet_read",
	label: "ASCET read",
	description: "Read ASCET summaries, method/code text, implementations, block diagrams, and state-machine flows.",
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

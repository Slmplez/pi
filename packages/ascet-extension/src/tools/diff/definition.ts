import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest } from "../../cli.ts";
import { defineSequentialAscetTool } from "../../core/tool.ts";
import { formatDiffComponentSnapshotResult, runAscetDiffComponentSnapshot } from "../../diff-component-snapshot.ts";
import { formatDiffElementSpecResult, runAscetDiffElementSpec } from "../../diff-element-spec.ts";
import { formatDiffMethodCodeResult, runAscetDiffMethodCode } from "../../diff-method-code.ts";
import { type AscetDiffObjectOperation, formatDiffObjectResult, runAscetDiffObject } from "../../diff-object.ts";
import { formatDiffProjectFormulasResult, runAscetDiffProjectFormulas } from "../../diff-project-formulas.ts";
import { formatDiffStateMachineDomainResult, runAscetDiffStateMachineDomain } from "../../diff-state-machine-domain.ts";
import { createAscetCliToolDetails } from "../_shared/envelope.ts";
import { ascetDiffPrompt } from "./prompt.ts";
import { type AscetDiffParams, ascetDiffParameters } from "./schema.ts";
import { renderCall, renderResult } from "./ui.ts";

interface RunOptions {
	cwd: string;
	env?: Record<string, string | undefined>;
	signal?: AbortSignal;
	timeoutMs?: number;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
}

function operationForObjectKind(
	objectKind: Extract<AscetDiffParams, { action: "diff" }>["objectKind"],
): AscetDiffObjectOperation | undefined {
	switch (objectKind) {
		case "class":
			return "diff_class";
		case "module":
			return "diff_module";
		case "statemachine":
			return "diff_state_machine";
		default:
			return undefined;
	}
}

function requireString(value: unknown, fieldName: string, action: AscetDiffParams["action"]): string {
	if (typeof value !== "string" || value.length === 0) {
		throw new Error(`${fieldName} is required for ascet_diff.${action}.`);
	}
	return value;
}

function validateAscetDiffParams(params: AscetDiffParams): void {
	const rawParams = params as Record<string, unknown>;
	switch (params.action) {
		case "diff":
		case "diff_component_snapshot":
		case "diff_state_machine_domain":
		case "diff_project_formulas":
			requireString(rawParams.leftPath, "leftPath", params.action);
			requireString(rawParams.rightPath, "rightPath", params.action);
			return;
		case "diff_method":
			requireString(rawParams.leftPath, "leftPath", params.action);
			requireString(rawParams.rightPath, "rightPath", params.action);
			requireString(rawParams.methodName, "methodName", params.action);
			return;
		case "diff_element_spec":
			requireString(rawParams.componentPath, "componentPath", params.action);
			requireString(rawParams.specFile, "specFile", params.action);
			return;
	}
}

async function runAscetDiff(params: AscetDiffParams, options: RunOptions): Promise<AscetCliJsonResult> {
	validateAscetDiffParams(params);
	const effectiveOptions = params.timeoutMs === undefined ? options : { ...options, timeoutMs: params.timeoutMs };
	switch (params.action) {
		case "diff": {
			const operation = operationForObjectKind(params.objectKind);
			if (operation) {
				return runAscetDiffObject(
					{
						operation,
						leftPath: params.leftPath,
						rightPath: params.rightPath,
						changesOnly: params.changesOnly,
					},
					effectiveOptions,
				);
			}
			return runAscetDiffComponentSnapshot(
				{
					leftComponentPath: params.leftPath,
					rightComponentPath: params.rightPath,
					changesOnly: params.changesOnly,
				},
				effectiveOptions,
			);
		}
		case "diff_component_snapshot":
			return runAscetDiffComponentSnapshot(
				{
					leftComponentPath: params.leftPath,
					rightComponentPath: params.rightPath,
					changesOnly: params.changesOnly,
				},
				effectiveOptions,
			);
		case "diff_method":
			return runAscetDiffMethodCode(
				{
					leftComponentPath: params.leftPath,
					rightComponentPath: params.rightPath,
					methodName: params.methodName,
					changesOnly: params.changesOnly,
					timeoutMs: params.timeoutMs,
				},
				effectiveOptions,
			);
		case "diff_state_machine_domain":
			return runAscetDiffStateMachineDomain(
				{
					leftStateMachinePath: params.leftPath,
					rightStateMachinePath: params.rightPath,
					changesOnly: params.changesOnly,
				},
				effectiveOptions,
			);
		case "diff_element_spec":
			return runAscetDiffElementSpec(
				{
					componentPath: params.componentPath,
					specFile: params.specFile,
					changesOnly: params.changesOnly,
				},
				effectiveOptions,
			);
		case "diff_project_formulas":
			return runAscetDiffProjectFormulas(
				{
					leftProjectPath: params.leftPath,
					rightProjectPath: params.rightPath,
					changesOnly: params.changesOnly,
				},
				effectiveOptions,
			);
	}
}

function formatAscetDiffResult(params: AscetDiffParams, result: AscetCliJsonResult): string {
	switch (params.action) {
		case "diff": {
			const operation = operationForObjectKind(params.objectKind);
			return operation ? formatDiffObjectResult(operation, result) : formatDiffComponentSnapshotResult(result);
		}
		case "diff_component_snapshot":
			return formatDiffComponentSnapshotResult(result);
		case "diff_method":
			return formatDiffMethodCodeResult(result);
		case "diff_state_machine_domain":
			return formatDiffStateMachineDomainResult(result);
		case "diff_element_spec":
			return formatDiffElementSpecResult(result);
		case "diff_project_formulas":
			return formatDiffProjectFormulasResult(result);
	}
}

export const ascetDiffTool = defineSequentialAscetTool({
	name: "ascet_diff",
	label: "ASCET diff",
	description: "Compare ASCET components, methods, element specs, project formulas, and state-machine domains.",
	...ascetDiffPrompt,
	parameters: ascetDiffParameters,
	renderCall,
	renderResult,
	async execute(
		_toolCallId: string,
		params: AscetDiffParams,
		signal: AbortSignal,
		_onUpdate: unknown,
		ctx: { cwd: string; executeCli?: RunOptions["executeCli"] },
	) {
		const result = await runAscetDiff(params, {
			cwd: ctx.cwd,
			signal,
			timeoutMs: 90_000,
			executeCli: ctx.executeCli,
		});
		return {
			content: [{ type: "text", text: formatAscetDiffResult(params, result) }],
			details: createAscetCliToolDetails("ascet_diff", params.action, result, {
				objectKind: params.action === "diff" ? params.objectKind : undefined,
			}),
		};
	},
});

import type { AscetCliExecutionResult, AscetCliJsonResult, AscetCliRequest, RunAscetCliJsonOptions } from "../cli.ts";
import { runAscetCliJson } from "../cli.ts";
import type { AscetScheduler } from "../scheduler/scheduler.ts";
import { type AscetTestAction, classifyAscetTestAction, parseAscetTestAction } from "./action-contract.ts";

export interface RunInternalAscetTestOptions {
	cwd: string;
	cliPath: string;
	requestPath: string;
	outputPath: string;
	action: AscetTestAction;
	runId?: string;
	executeLive?: boolean;
	agentId?: string;
	signal?: AbortSignal;
	timeoutMs?: number;
	queueTimeoutMs?: number;
	scheduler?: Pick<AscetScheduler, "submit" | "getSnapshot">;
	executeCli?: (request: AscetCliRequest) => Promise<AscetCliExecutionResult>;
	acceptedExitCodes?: number[];
}

export function buildInternalAscetTestArgs(
	options: Pick<RunInternalAscetTestOptions, "action" | "requestPath" | "outputPath" | "executeLive">,
): string[] {
	const action = parseAscetTestAction(options.action);
	return [
		"--action",
		action,
		"--request",
		options.requestPath,
		"--out",
		options.outputPath,
		"--json",
		...(options.executeLive ? ["--execute-live"] : []),
	];
}

export async function runInternalAscetTest(options: RunInternalAscetTestOptions): Promise<AscetCliJsonResult> {
	const action = parseAscetTestAction(options.action);
	const classification = classifyAscetTestAction(action, {
		executeLive: options.executeLive,
		runId: options.runId,
	});
	const cliOptions: RunAscetCliJsonOptions = {
		cwd: options.cwd,
		cliPath: options.cliPath,
		signal: options.signal,
		timeoutMs: options.timeoutMs,
		queueTimeoutMs: options.queueTimeoutMs,
		agentId: options.agentId ?? "system",
		toolName: "ascet_test_internal",
		commandId: classification.commandId,
		jobKind: classification.jobKind,
		resourceKey: classification.resourceKey,
		scheduler: options.scheduler,
		executeCli: options.executeCli,
		acceptedExitCodes: options.acceptedExitCodes,
	};
	return runAscetCliJson(buildInternalAscetTestArgs(options), cliOptions);
}

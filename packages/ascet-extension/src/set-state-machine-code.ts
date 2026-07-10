import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import {
	type AscetWriteControlParams,
	appendVerifyAndJson,
	createWriteSummary,
	formatWriteOperationResult,
	type RunAscetWriteOperationOptions,
	runApprovedAscetWriteOperation,
} from "./write-common.ts";
import type { AscetWriteApprovalContext } from "./write-policy.ts";

export type AscetSetStateMachineCodeOperation =
	| "set-method"
	| "set-state-entry-esdl"
	| "set-state-exit-esdl"
	| "set-state-static-esdl"
	| "bind-state-entry-method"
	| "bind-state-exit-method"
	| "bind-state-static-method"
	| "set-transition-condition-esdl"
	| "set-transition-action-esdl"
	| "bind-transition-condition-method"
	| "bind-transition-action-method"
	| "set-start-state";

export interface AscetSetStateMachineCodeParams extends AscetWriteControlParams {
	stateMachinePath: string;
	operation: AscetSetStateMachineCodeOperation;
	stateName?: string;
	sourceState?: string;
	targetState?: string;
	priority?: number;
	methodName?: string;
	codeFile?: string;
}

export type RunAscetSetStateMachineCodeOptions = RunAscetWriteOperationOptions;
export type AscetSetStateMachineCodeResult = AscetCliJsonResult;

const stateMachineOperationSchema = Type.Union([
	Type.Literal("set-method"),
	Type.Literal("set-state-entry-esdl"),
	Type.Literal("set-state-exit-esdl"),
	Type.Literal("set-state-static-esdl"),
	Type.Literal("bind-state-entry-method"),
	Type.Literal("bind-state-exit-method"),
	Type.Literal("bind-state-static-method"),
	Type.Literal("set-transition-condition-esdl"),
	Type.Literal("set-transition-action-esdl"),
	Type.Literal("bind-transition-condition-method"),
	Type.Literal("bind-transition-action-method"),
	Type.Literal("set-start-state"),
]);

export const ascetSetStateMachineCodeParameters = Type.Object({
	stateMachinePath: Type.String({ description: "ASCET state-machine component path.", minLength: 1 }),
	operation: stateMachineOperationSchema,
	stateName: Type.Optional(Type.String()),
	sourceState: Type.Optional(Type.String()),
	targetState: Type.Optional(Type.String()),
	priority: Type.Optional(Type.Number()),
	methodName: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String({ description: "Path to replacement code file." })),
	verifyReadback: Type.Optional(Type.Boolean({ description: "Ask the ASCET CLI to verify readback after writing." })),
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildSetStateMachineCodeArgs(params: AscetSetStateMachineCodeParams): string[] {
	const args = ["exec", "set_state_machine_code", normalizeAscetPath(params.stateMachinePath), params.operation];
	for (const value of [
		params.stateName,
		params.sourceState,
		params.targetState,
		params.priority === undefined ? undefined : String(params.priority),
		params.methodName,
		params.codeFile,
	]) {
		if (value !== undefined) {
			args.push(value);
		}
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createSetStateMachineCodeSummary(params: AscetSetStateMachineCodeParams): string {
	return createWriteSummary("set_state_machine_code", {
		stateMachinePath: params.stateMachinePath,
		operation: params.operation,
		stateName: params.stateName ?? "",
		sourceState: params.sourceState ?? "",
		targetState: params.targetState ?? "",
		priority: params.priority ?? "",
		methodName: params.methodName ?? "",
		codeFile: params.codeFile ?? "",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetSetStateMachineCode(
	params: AscetSetStateMachineCodeParams,
	options: RunAscetSetStateMachineCodeOptions,
): Promise<AscetSetStateMachineCodeResult> {
	return runAscetCliJson(buildSetStateMachineCodeArgs(params), options);
}

export async function runApprovedAscetSetStateMachineCode(
	params: AscetSetStateMachineCodeParams,
	options: RunAscetSetStateMachineCodeOptions,
	ctx: AscetWriteApprovalContext,
): Promise<AscetSetStateMachineCodeResult> {
	return runApprovedAscetWriteOperation(
		"set_state_machine_code",
		params,
		options,
		ctx,
		buildSetStateMachineCodeArgs,
		createSetStateMachineCodeSummary(params),
	);
}

export function formatSetStateMachineCodeResult(result: AscetSetStateMachineCodeResult): string {
	return formatWriteOperationResult("set_state_machine_code", result);
}

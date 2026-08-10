import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

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

export const ASCET_SET_STATE_MACHINE_CODE_OPERATIONS = [
	"set-method",
	"set-state-entry-esdl",
	"set-state-exit-esdl",
	"set-state-static-esdl",
	"bind-state-entry-method",
	"bind-state-exit-method",
	"bind-state-static-method",
	"set-transition-condition-esdl",
	"set-transition-action-esdl",
	"bind-transition-condition-method",
	"bind-transition-action-method",
	"set-start-state",
] as const satisfies readonly AscetSetStateMachineCodeOperation[];

export interface AscetSetStateMachineCodeParams extends AscetEditControlParams {
	stateMachinePath: string;
	operation: AscetSetStateMachineCodeOperation;
	stateName?: string;
	sourceState?: string;
	targetState?: string;
	priority?: number;
	methodName?: string;
	codeFile?: string;
}

export type RunAscetSetStateMachineCodeOptions = RunAscetEditOperationOptions;
export type AscetSetStateMachineCodeResult = AscetCliJsonResult;

const stateMachineOperationSchema = Type.Union(
	ASCET_SET_STATE_MACHINE_CODE_OPERATIONS.map((operation) => Type.Literal(operation)),
);

export const ascetSetStateMachineCodeParameters = Type.Object({
	stateMachinePath: Type.String({ description: "ASCET state-machine component path.", minLength: 1 }),
	operation: stateMachineOperationSchema,
	stateName: Type.Optional(Type.String()),
	sourceState: Type.Optional(Type.String()),
	targetState: Type.Optional(Type.String()),
	priority: Type.Optional(Type.Number()),
	methodName: Type.Optional(Type.String()),
	codeFile: Type.Optional(Type.String({ description: "Path to replacement code file." })),
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
	return createAscetEditSummary("set_state_machine_code", {
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
	ctx: AscetEditApprovalContext,
): Promise<AscetSetStateMachineCodeResult> {
	return runApprovedAscetEditOperation(
		"set_state_machine_code",
		params,
		options,
		ctx,
		buildSetStateMachineCodeArgs,
		createSetStateMachineCodeSummary(params),
	);
}

export function formatSetStateMachineCodeResult(result: AscetSetStateMachineCodeResult): string {
	return formatAscetEditOperationResult("set_state_machine_code", result);
}

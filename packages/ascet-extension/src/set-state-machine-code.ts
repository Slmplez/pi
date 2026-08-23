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

const stateMachineWriteBase = {
	stateMachinePath: Type.String({ description: "ASCET state-machine component path.", minLength: 1 }),
	intent: Type.Literal("apply"),
};
const codeFileSchema = Type.String({ description: "Path to replacement code file.", minLength: 1 });
export const ascetSetStateMachineCodeParameters = Type.Union([
	Type.Object(
		{
			...stateMachineWriteBase,
			operation: Type.Literal("set-method"),
			methodName: Type.String({ minLength: 1 }),
			codeFile: codeFileSchema,
		},
		{ additionalProperties: false },
	),
	...(["set-state-entry-esdl", "set-state-exit-esdl", "set-state-static-esdl"] as const).map((operation) =>
		Type.Object(
			{
				...stateMachineWriteBase,
				operation: Type.Literal(operation),
				stateName: Type.String({ minLength: 1 }),
				codeFile: codeFileSchema,
			},
			{ additionalProperties: false },
		),
	),
	...(["bind-state-entry-method", "bind-state-exit-method", "bind-state-static-method"] as const).map((operation) =>
		Type.Object(
			{
				...stateMachineWriteBase,
				operation: Type.Literal(operation),
				stateName: Type.String({ minLength: 1 }),
				methodName: Type.String({ minLength: 1 }),
			},
			{ additionalProperties: false },
		),
	),
	...(["set-transition-condition-esdl", "set-transition-action-esdl"] as const).map((operation) =>
		Type.Object(
			{
				...stateMachineWriteBase,
				operation: Type.Literal(operation),
				sourceState: Type.String({ minLength: 1 }),
				targetState: Type.String({ minLength: 1 }),
				priority: Type.Integer(),
				codeFile: codeFileSchema,
			},
			{ additionalProperties: false },
		),
	),
	...(["bind-transition-condition-method", "bind-transition-action-method"] as const).map((operation) =>
		Type.Object(
			{
				...stateMachineWriteBase,
				operation: Type.Literal(operation),
				sourceState: Type.String({ minLength: 1 }),
				targetState: Type.String({ minLength: 1 }),
				priority: Type.Integer(),
				methodName: Type.String({ minLength: 1 }),
			},
			{ additionalProperties: false },
		),
	),
	Type.Object(
		{
			...stateMachineWriteBase,
			operation: Type.Literal("set-start-state"),
			stateName: Type.String({ minLength: 1 }),
		},
		{ additionalProperties: false },
	),
]);

export function buildSetStateMachineCodeArgs(params: AscetSetStateMachineCodeParams): string[] {
	const args = ["exec", "set_state_machine_code", normalizeAscetPath(params.stateMachinePath), params.operation];
	switch (params.operation) {
		case "set-method":
			args.push(params.methodName ?? "", params.codeFile ?? "");
			break;
		case "set-state-entry-esdl":
		case "set-state-exit-esdl":
		case "set-state-static-esdl":
			args.push(params.stateName ?? "", params.codeFile ?? "");
			break;
		case "bind-state-entry-method":
		case "bind-state-exit-method":
		case "bind-state-static-method":
			args.push(params.stateName ?? "", params.methodName ?? "");
			break;
		case "set-transition-condition-esdl":
		case "set-transition-action-esdl":
			args.push(
				params.sourceState ?? "",
				params.targetState ?? "",
				params.priority === undefined ? "" : String(params.priority),
				params.codeFile ?? "",
			);
			break;
		case "bind-transition-condition-method":
		case "bind-transition-action-method":
			args.push(
				params.sourceState ?? "",
				params.targetState ?? "",
				params.priority === undefined ? "" : String(params.priority),
				params.methodName ?? "",
			);
			break;
		case "set-start-state":
			args.push(params.stateName ?? "");
			break;
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

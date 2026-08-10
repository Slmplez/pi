import { Type } from "typebox";
import { type AscetCliJsonResult, runAscetCliJson } from "./cli.ts";
import { normalizeAscetPath } from "./core/path.ts";
import type { AscetEditApprovalContext } from "./edit/approval.ts";
import {
	type AscetEditControlParams,
	appendVerifyAndJson,
	createAscetEditSummary,
	formatAscetEditOperationResult,
	ifMissingSchema,
	type RunAscetEditOperationOptions,
	runApprovedAscetEditOperation,
} from "./edit/common.ts";

export interface AscetDeleteMethodParams extends AscetEditControlParams {
	componentPath: string;
	methodName: string;
	ifMissing?: "fail" | "ignore";
}

export type RunAscetDeleteMethodOptions = RunAscetEditOperationOptions;
export type AscetDeleteMethodResult = AscetCliJsonResult;

export const ascetDeleteMethodParameters = Type.Object({
	componentPath: Type.String({ description: "ASCET component path.", minLength: 1 }),
	methodName: Type.String({ description: "ASCET method name to delete.", minLength: 1 }),
	ifMissing: ifMissingSchema,
	executeWrite: Type.Optional(Type.Boolean({ description: "When true, PI still requires interactive confirmation." })),
});

export function buildDeleteMethodArgs(params: AscetDeleteMethodParams): string[] {
	const args = ["exec", "delete_method", normalizeAscetPath(params.componentPath), params.methodName];
	if (params.ifMissing) {
		args.push("--if-missing", params.ifMissing);
	}
	return appendVerifyAndJson(args, params.verifyReadback);
}

export function createDeleteMethodSummary(params: AscetDeleteMethodParams): string {
	return createAscetEditSummary("delete_method", {
		componentPath: params.componentPath,
		methodName: params.methodName,
		ifMissing: params.ifMissing ?? "fail",
		verifyReadback: params.verifyReadback === true,
	});
}

export async function runAscetDeleteMethod(
	params: AscetDeleteMethodParams,
	options: RunAscetDeleteMethodOptions,
): Promise<AscetDeleteMethodResult> {
	return runAscetCliJson(buildDeleteMethodArgs(params), options);
}

export async function runApprovedAscetDeleteMethod(
	params: AscetDeleteMethodParams,
	options: RunAscetDeleteMethodOptions,
	ctx: AscetEditApprovalContext,
): Promise<AscetDeleteMethodResult> {
	return runApprovedAscetEditOperation(
		"delete_method",
		params,
		options,
		ctx,
		buildDeleteMethodArgs,
		createDeleteMethodSummary(params),
		"Confirm ASCET method deletion",
	);
}

export function formatDeleteMethodResult(result: AscetDeleteMethodResult): string {
	return formatAscetEditOperationResult("delete_method", result);
}
